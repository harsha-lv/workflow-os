import { and, desc, eq, sql } from "drizzle-orm";
import { ensureMigrated } from "@/db/client";
import { approvals, executionSteps, executions, secrets, usageEvents, workflowVersions, workflows } from "@/db/schema";
import { id } from "@/domain/ids";
import { NotFoundError, ValidationError } from "@/domain/permissions";
import { runWorkflow } from "@/domain/engine/run";
import { resumeWorkflow } from "@/domain/engine/resume";
import { decryptSecret } from "@/server/crypto";
import { writeAudit } from "@/server/audit";
import { validateGraph } from "@/domain/workflow/validate";
import type { EngineStepResult } from "@/domain/engine/types";

export async function enqueueExecution(input: {
  orgId: string;
  userId?: string | null;
  workflowId: string;
  triggerType: string;
  payload: unknown;
  version?: "draft" | "published";
}) {
  const db = await ensureMigrated();
  const workflow = await db.query.workflows.findFirst({
    where: and(eq(workflows.id, input.workflowId), eq(workflows.organizationId, input.orgId)),
  });
  if (!workflow) throw new NotFoundError("Workflow not found");
  if (workflow.status === "paused" && input.triggerType !== "test" && input.triggerType !== "manual") {
    throw new ValidationError("This workflow is paused. New trigger events are not started.");
  }
  if (workflow.status === "archived") {
    throw new ValidationError("Archived workflows cannot run.");
  }
  const version =
    input.version === "draft" || !workflow.publishedVersionId
      ? await db.query.workflowVersions.findFirst({
          where: eq(workflowVersions.workflowId, workflow.id),
          orderBy: [desc(workflowVersions.version)],
        })
      : await db.query.workflowVersions.findFirst({
          where: eq(workflowVersions.id, workflow.publishedVersionId),
        });
  if (!version) throw new NotFoundError("Workflow version not found");
  const validation = validateGraph(version.definition.graph);
  if (!validation.ok) {
    throw new ValidationError("Cannot execute a workflow with validation errors.", validation.issues);
  }
  const executionId = id("execution");
  await db.insert(executions).values({
    id: executionId,
    organizationId: input.orgId,
    workflowId: workflow.id,
    workflowVersionId: version.id,
    status: "queued",
    triggerType: input.triggerType,
    triggeredBy: input.userId ?? null,
    input: input.payload,
  });
  await db.insert(usageEvents).values({
    id: id("usage"),
    organizationId: input.orgId,
    kind: "execution",
    quantity: 1,
    metadata: { workflowId: workflow.id },
  });
  await writeAudit({
    organizationId: input.orgId,
    userId: input.userId,
    action: "workflow.executed",
    resourceType: "execution",
    resourceId: executionId,
    metadata: { workflowId: workflow.id, triggerType: input.triggerType },
  });
  return executionId;
}

export async function processQueuedExecutions(limit = 5): Promise<number> {
  const db = await ensureMigrated();
  const workerId = `worker-${process.pid}`;
  const now = new Date();
  const queued = await db.query.executions.findMany({
    where: eq(executions.status, "queued"),
    orderBy: [executions.createdAt],
    limit,
  });
  const due = await db.query.executions.findMany({
    where: eq(executions.status, "waiting"),
    limit,
  });
  const delayed = due.filter((row) => row.waitUntil && row.waitUntil.getTime() <= now.getTime());
  let processed = 0;
  for (const row of [...queued, ...delayed]) {
    await db
      .update(executions)
      .set({ status: "running", lockedAt: now, lockedBy: workerId, startedAt: row.startedAt ?? now })
      .where(eq(executions.id, row.id));
    await runPersistedExecution(row.id);
    processed += 1;
  }
  return processed;
}

export async function runPersistedExecution(executionId: string): Promise<void> {
  const db = await ensureMigrated();
  const execution = await db.query.executions.findFirst({ where: eq(executions.id, executionId) });
  if (!execution) return;
  const version = await db.query.workflowVersions.findFirst({
    where: eq(workflowVersions.id, execution.workflowVersionId),
  });
  if (!version) return;

  const orgSecrets = await db.query.secrets.findMany({
    where: eq(secrets.organizationId, execution.organizationId),
  });
  const secretMap = new Map(orgSecrets.map((s) => [s.name, decryptSecret(s.encryptedValue)]));

  const existingSteps = await db.query.executionSteps.findMany({
    where: eq(executionSteps.executionId, execution.id),
  });
  const previousOutputs: Record<string, unknown> = {};
  for (const step of existingSteps) {
    if (step.status === "success" && step.nodeId !== execution.resumeFrom) {
      previousOutputs[step.nodeId] = step.output;
    }
  }

  const persistStep = async (step: EngineStepResult) => {
    const existing = existingSteps.find((s) => s.nodeId === step.nodeId && s.status !== "success");
    const row = {
      status: step.status,
      attempt: step.attempt,
      input: step.input,
      output: step.output,
      config: step.config,
      error: step.error,
      logs: step.logs,
      startedAt: new Date(step.startedAt),
      endedAt: step.endedAt ? new Date(step.endedAt) : null,
      durationMs: step.durationMs ?? null,
    };
    if (existing) {
      await db.update(executionSteps).set(row).where(eq(executionSteps.id, existing.id));
    } else {
      const stepId = id("step");
      await db.insert(executionSteps).values({
        id: stepId,
        executionId: execution.id,
        nodeId: step.nodeId,
        nodeType: step.nodeType,
        name: step.name,
        ...row,
      });
      existingSteps.push({
        id: stepId,
        executionId: execution.id,
        nodeId: step.nodeId,
        nodeType: step.nodeType,
        name: step.name,
        ...row,
        createdAt: new Date(),
      } as (typeof existingSteps)[number]);
      if (step.pause?.kind === "approval" || step.pause?.kind === "review") {
        await db.insert(approvals).values({
          id: id("approval"),
          organizationId: execution.organizationId,
          executionId: execution.id,
          stepId,
          nodeId: step.nodeId,
          status: "pending",
          title: step.pause.title ?? "Approval required",
          summary: step.pause.summary ?? "",
          payload: step.pause.payload ?? step.input,
          timeoutAt: step.pause.until ? new Date(step.pause.until) : null,
        });
      }
    }
  };

  const result = execution.resumeFrom
    ? await resumeWorkflow({
        graph: version.definition.graph,
        trigger: execution.input,
        previousOutputs,
        decision: {
          nodeId: execution.resumeFrom,
          output: previousOutputs[execution.resumeFrom] ?? execution.output,
        },
        hooks: {
          secrets: async (name) => secretMap.get(name) ?? null,
          recordUsage: async (kind, quantity, metadata) => {
            await db.insert(usageEvents).values({
              id: id("usage"),
              organizationId: execution.organizationId,
              kind,
              quantity,
              metadata,
            });
          },
          onStep: persistStep,
        },
      })
    : await runWorkflow({
        graph: version.definition.graph,
        trigger: execution.input,
        hooks: {
          secrets: async (name) => secretMap.get(name) ?? null,
          recordUsage: async (kind, quantity, metadata) => {
            await db.insert(usageEvents).values({
              id: id("usage"),
              organizationId: execution.organizationId,
              kind,
              quantity,
              metadata,
            });
          },
          onStep: persistStep,
        },
      });

  const ended = new Date();
  await db
    .update(executions)
    .set({
      status: result.status,
      output: result.output,
      error: result.error,
      resumeFrom: result.resumeFrom ?? null,
      waitUntil: result.waitUntil ? new Date(result.waitUntil) : null,
      endedAt: result.status === "waiting" ? null : ended,
      durationMs: execution.startedAt ? ended.getTime() - execution.startedAt.getTime() : null,
      lockedAt: null,
      lockedBy: null,
    })
    .where(eq(executions.id, execution.id));
}

export async function decideApproval(input: {
  orgId: string;
  userId: string;
  approvalId: string;
  decision: "approve" | "reject" | "request_changes";
  comment?: string;
}) {
  const db = await ensureMigrated();
  const approval = await db.query.approvals.findFirst({
    where: and(eq(approvals.id, input.approvalId), eq(approvals.organizationId, input.orgId)),
  });
  if (!approval) throw new NotFoundError("Approval not found");
  if (approval.status !== "pending") throw new ValidationError("This approval is already resolved");
  const status =
    input.decision === "approve"
      ? "approved"
      : input.decision === "reject"
        ? "rejected"
        : "changes_requested";
  await db
    .update(approvals)
    .set({
      status,
      comment: input.comment ?? null,
      resolvedBy: input.userId,
      resolvedAt: new Date(),
    })
    .where(eq(approvals.id, approval.id));
  await db
    .update(executionSteps)
    .set({
      status: "success",
      output: { decision: input.decision, comment: input.comment ?? null, resolvedBy: input.userId },
      endedAt: new Date(),
    })
    .where(eq(executionSteps.id, approval.stepId));
  const branch =
    input.decision === "approve" ? "approved" : input.decision === "reject" ? "rejected" : "changes";
  await db
    .update(executions)
    .set({
      status: "queued",
      resumeFrom: approval.nodeId,
      output: { decision: input.decision, comment: input.comment ?? null, resolvedBy: input.userId },
      waitUntil: null,
    })
    .where(eq(executions.id, approval.executionId));
  await writeAudit({
    organizationId: input.orgId,
    userId: input.userId,
    action: "approval.decided",
    resourceType: "approval",
    resourceId: approval.id,
    metadata: { decision: input.decision },
  });
  // Keep branch on the execution by storing it in output; the resume path uses
  // resumeDecision.branch when provided. Patch the next process to read it.
  await db
    .update(executions)
    .set({
      output: {
        decision: input.decision,
        comment: input.comment ?? null,
        resolvedBy: input.userId,
        branch,
      },
    })
    .where(eq(executions.id, approval.executionId));
  return approval.executionId;
}

export async function dashboardStats(orgId: string) {
  const db = await ensureMigrated();
  const [{ c: workflowCount } = { c: 0 }] = await db
    .select({ c: sql<number>`count(*)` })
    .from(workflows)
    .where(eq(workflows.organizationId, orgId));
  const [{ c: publishedCount } = { c: 0 }] = await db
    .select({ c: sql<number>`count(*)` })
    .from(workflows)
    .where(and(eq(workflows.organizationId, orgId), eq(workflows.status, "published")));
  const recent = await db.query.executions.findMany({
    where: eq(executions.organizationId, orgId),
    orderBy: [desc(executions.createdAt)],
    limit: 8,
  });
  const [{ c: failedCount } = { c: 0 }] = await db
    .select({ c: sql<number>`count(*)` })
    .from(executions)
    .where(and(eq(executions.organizationId, orgId), eq(executions.status, "failed")));
  const [{ c: runCount } = { c: 0 }] = await db
    .select({ c: sql<number>`count(*)` })
    .from(executions)
    .where(eq(executions.organizationId, orgId));
  const [{ c: tokenCount } = { c: 0 }] = await db
    .select({ c: sql<number>`coalesce(sum(quantity), 0)` })
    .from(usageEvents)
    .where(and(eq(usageEvents.organizationId, orgId), eq(usageEvents.kind, "ai.tokens")));
  return {
    workflowCount: Number(workflowCount),
    publishedCount: Number(publishedCount),
    failedCount: Number(failedCount),
    runCount: Number(runCount),
    tokenCount: Number(tokenCount),
    recent,
  };
}
