import { and, desc, eq } from "drizzle-orm";
import { ensureMigrated } from "@/db/client";
import { executionReceipts, executionSteps, executions, workflowVersions, workflows } from "@/db/schema";
import { id } from "@/domain/ids";
import { buildCanonicalReceipt, hashCanonical, rootFromCanonical } from "@/domain/verify/canonical";
import type { CanonicalReceipt, ExecutionReceiptView, ReceiptStatus, VerificationResult } from "@/domain/verify/types";
import { explorerUrlFor, getChainAdapter } from "@/server/chain";
import { writeAudit } from "@/server/audit";
import { blockchainEnabled, verifyTestRuns } from "@/server/config";
import { NotFoundError, ValidationError } from "@/domain/permissions";

const TERMINAL = new Set(["success", "failed", "cancelled", "timed_out"]);

function asView(row: {
  id: string;
  organizationId: string;
  executionId: string;
  sequence: number;
  root: string;
  payloadJson: unknown;
  chainId: string | null;
  txHash: string | null;
  blockNumber: string | null;
  contractAddress: string | null;
  status: string;
  createdAt: Date;
  verifiedAt: Date | null;
}): ExecutionReceiptView {
  return {
    id: row.id,
    organizationId: row.organizationId,
    executionId: row.executionId,
    sequence: row.sequence,
    root: row.root,
    payload: row.payloadJson as CanonicalReceipt,
    chainId: row.chainId,
    txHash: row.txHash,
    blockNumber: row.blockNumber,
    contractAddress: row.contractAddress,
    status: row.status as ReceiptStatus,
    createdAt: row.createdAt,
    verifiedAt: row.verifiedAt,
  };
}

export function isTerminalStatus(status: string): boolean {
  return TERMINAL.has(status);
}

export async function latestReceipt(executionId: string, orgId?: string) {
  const db = await ensureMigrated();
  const row = await db.query.executionReceipts.findFirst({
    where: orgId
      ? and(eq(executionReceipts.executionId, executionId), eq(executionReceipts.organizationId, orgId))
      : eq(executionReceipts.executionId, executionId),
    orderBy: [desc(executionReceipts.sequence)],
  });
  return row ? asView(row) : null;
}

export async function listReceipts(executionId: string, orgId: string) {
  const db = await ensureMigrated();
  const rows = await db.query.executionReceipts.findMany({
    where: and(eq(executionReceipts.executionId, executionId), eq(executionReceipts.organizationId, orgId)),
    orderBy: [desc(executionReceipts.sequence)],
  });
  return rows.map(asView);
}

async function buildCanonicalForExecution(executionId: string, previousRootOverride?: string | null) {
  const db = await ensureMigrated();
  const execution = await db.query.executions.findFirst({ where: eq(executions.id, executionId) });
  if (!execution) throw new NotFoundError("Execution not found");
  const version = await db.query.workflowVersions.findFirst({
    where: eq(workflowVersions.id, execution.workflowVersionId),
  });
  if (!version) throw new NotFoundError("Workflow version not found");
  const steps = await db.query.executionSteps.findMany({
    where: eq(executionSteps.executionId, execution.id),
  });
  const previous = await db.query.executionReceipts.findFirst({
    where: eq(executionReceipts.executionId, execution.id),
    orderBy: [desc(executionReceipts.sequence)],
  });
  const previousRoot = previousRootOverride !== undefined ? previousRootOverride : (previous?.root ?? null);
  const canonical = buildCanonicalReceipt({
    executionId: execution.id,
    organizationId: execution.organizationId,
    workflowId: execution.workflowId,
    workflowVersionId: execution.workflowVersionId,
    workflowVersionHash: version.hash,
    triggerType: execution.triggerType,
    status: execution.status,
    startedAt: execution.startedAt,
    endedAt: execution.endedAt,
    output: execution.output,
    error: execution.error,
    previousRoot,
    steps: steps.map((step) => ({
      nodeId: step.nodeId,
      nodeType: step.nodeType,
      status: step.status,
      attempt: step.attempt,
      input: step.input,
      output: step.output,
      config: step.config,
    })),
  });
  return { execution, version, canonical, previous, root: rootFromCanonical(canonical) };
}

function snapshotHash(canonical: CanonicalReceipt): string {
  return hashCanonical({ ...canonical, previousRoot: null });
}

function shouldAnchor(workflow: { verifyOnChain: boolean }, triggerType: string): boolean {
  if (!blockchainEnabled()) return false;
  if (!workflow.verifyOnChain) return false;
  if (triggerType === "test" && !verifyTestRuns()) return false;
  return true;
}

async function applyAnchor(receiptId: string, executionId: string, orgId: string, root: string, versionHash: string) {
  const db = await ensureMigrated();
  try {
    const adapter = getChainAdapter();
    if (!adapter) return;
    const result = await adapter.anchor({ executionId, root, versionHash });
    const status: ReceiptStatus = result.mocked ? "mocked" : "confirmed";
    await db
      .update(executionReceipts)
      .set({
        status,
        chainId: result.chainId,
        txHash: result.txHash,
        blockNumber: result.blockNumber,
        contractAddress: result.contractAddress,
        verifiedAt: new Date(),
      })
      .where(eq(executionReceipts.id, receiptId));
    await writeAudit({
      organizationId: orgId,
      action: "execution.anchored",
      resourceType: "execution",
      resourceId: executionId,
      metadata: { receiptId, txHash: result.txHash, mocked: result.mocked, root },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Anchor failed";
    await db
      .update(executionReceipts)
      .set({ status: "failed" })
      .where(eq(executionReceipts.id, receiptId));
    await writeAudit({
      organizationId: orgId,
      action: "execution.anchor_failed",
      resourceType: "execution",
      resourceId: executionId,
      metadata: { receiptId, error: message, root },
    });
  }
}

export async function createReceiptForExecution(executionId: string): Promise<ExecutionReceiptView | null> {
  const db = await ensureMigrated();
  const { execution, version, canonical, previous, root } = await buildCanonicalForExecution(executionId);
  if (!isTerminalStatus(execution.status)) return previous ? asView(previous) : null;

  if (previous && snapshotHash(previous.payloadJson as CanonicalReceipt) === snapshotHash(canonical)) {
    if (previous.status === "failed") {
      const workflow = await db.query.workflows.findFirst({ where: eq(workflows.id, execution.workflowId) });
      if (workflow && shouldAnchor(workflow, execution.triggerType)) {
        await applyAnchor(previous.id, execution.id, execution.organizationId, previous.root, version.hash);
      }
    }
    return latestReceipt(execution.id);
  }

  const nextSequence = (previous?.sequence ?? 0) + 1;
  const receiptId = id("receipt");
  await db.insert(executionReceipts).values({
    id: receiptId,
    organizationId: execution.organizationId,
    executionId: execution.id,
    sequence: nextSequence,
    root,
    payloadJson: canonical,
    status: "pending",
  });
  await writeAudit({
    organizationId: execution.organizationId,
    action: "execution.receipt_created",
    resourceType: "execution",
    resourceId: execution.id,
    metadata: { receiptId, sequence: nextSequence, root },
  });

  const workflow = await db.query.workflows.findFirst({ where: eq(workflows.id, execution.workflowId) });
  if (workflow && shouldAnchor(workflow, execution.triggerType)) {
    await applyAnchor(receiptId, execution.id, execution.organizationId, root, version.hash);
  }
  return latestReceipt(execution.id);
}

export async function retryAnchor(executionId: string, orgId: string): Promise<ExecutionReceiptView> {
  const latest = await latestReceipt(executionId, orgId);
  if (!latest) throw new NotFoundError("No receipt to retry");
  if (latest.status === "confirmed" || latest.status === "mocked") {
    throw new ValidationError("This execution already has a blockchain proof.");
  }
  const db = await ensureMigrated();
  const execution = await db.query.executions.findFirst({
    where: and(eq(executions.id, executionId), eq(executions.organizationId, orgId)),
  });
  if (!execution) throw new NotFoundError("Execution not found");
  const version = await db.query.workflowVersions.findFirst({
    where: eq(workflowVersions.id, execution.workflowVersionId),
  });
  if (!version) throw new NotFoundError("Workflow version not found");
  if (!blockchainEnabled()) throw new ValidationError("Blockchain anchoring is disabled.");
  await applyAnchor(latest.id, execution.id, orgId, latest.root, version.hash);
  const next = await latestReceipt(executionId, orgId);
  if (!next) throw new NotFoundError("Receipt not found");
  return next;
}

export async function verifyExecution(
  executionId: string,
  orgId?: string,
  options?: { audit?: boolean },
): Promise<VerificationResult> {
  const receipt = await latestReceipt(executionId, orgId);
  if (!receipt) {
    throw new NotFoundError("No receipt for this execution");
  }
  const built = await buildCanonicalForExecution(executionId, receipt.payload.previousRoot ?? null);
  if (orgId && built.execution.organizationId !== orgId) throw new NotFoundError("Execution not found");
  const computedRoot = built.root;
  const integrityOk = computedRoot === receipt.root;
  let chainOk: boolean | null = null;
  let chainMessage = "";
  if (receipt.txHash && blockchainEnabled()) {
    try {
      const adapter = getChainAdapter();
      if (adapter) {
        const chain = await adapter.verify(receipt.txHash, receipt.root);
        chainOk = chain.ok;
        chainMessage = chain.message;
      }
    } catch (error) {
      chainOk = false;
      chainMessage = error instanceof Error ? error.message : "Chain verification failed";
    }
  } else if (receipt.status === "mocked") {
    chainOk = true;
    chainMessage = "Demo proof matches the local receipt. This is not a real blockchain transaction.";
  }

  let outcome: VerificationResult["outcome"] = "pending";
  if (!integrityOk) outcome = "integrity_failed";
  else if (receipt.status === "failed" || chainOk === false) outcome = "anchor_failed";
  else if (receipt.status === "mocked") outcome = "demo_verified";
  else if (receipt.status === "confirmed") outcome = "blockchain_anchored";
  else if (integrityOk) outcome = "integrity_verified";

  if (options?.audit !== false && orgId) {
    await writeAudit({
      organizationId: built.execution.organizationId,
      action: "execution.verified",
      resourceType: "execution",
      resourceId: executionId,
      metadata: { receiptId: receipt.id, outcome, valid: integrityOk && chainOk !== false },
    });
  }

  return {
    valid: integrityOk && chainOk !== false,
    outcome,
    root: receipt.root,
    computedRoot,
    sequence: receipt.sequence,
    receiptId: receipt.id,
    executionId,
    status: receipt.status,
    mocked: receipt.status === "mocked",
    chainId: receipt.chainId,
    txHash: receipt.txHash,
    blockNumber: receipt.blockNumber,
    contractAddress: receipt.contractAddress,
    explorerUrl: explorerUrlFor(receipt.txHash),
    verifiedAt: receipt.verifiedAt?.toISOString() ?? null,
    createdAt: receipt.createdAt.toISOString(),
    chainOk,
    message:
      !integrityOk
        ? "The execution record no longer matches its cryptographic receipt."
        : chainMessage || "Local cryptographic receipt matches the stored root.",
  };
}

export function publicVerificationView(result: VerificationResult) {
  return {
    valid: result.valid,
    outcome: result.outcome,
    root: result.root,
    sequence: result.sequence,
    status: result.status,
    mocked: result.mocked,
    chainId: result.chainId,
    txHash: result.txHash,
    blockNumber: result.blockNumber,
    explorerUrl: result.explorerUrl,
    verifiedAt: result.verifiedAt,
    createdAt: result.createdAt,
    message: result.message,
  };
}
