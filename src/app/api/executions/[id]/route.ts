import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { ensureMigrated } from "@/db/client";
import { executionSteps, executions } from "@/db/schema";
import { requirePermission } from "@/server/context";
import { toErrorResponse } from "@/server/errors";
import { NotFoundError } from "@/domain/permissions";
import { latestReceipt } from "@/server/services/receipts";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requirePermission("executions.read");
    const { id } = await params;
    const db = await ensureMigrated();
    const run = await db.query.executions.findFirst({
      where: and(eq(executions.id, id), eq(executions.organizationId, ctx.org.id)),
    });
    if (!run) throw new NotFoundError("Execution not found");
    const steps = await db.query.executionSteps.findMany({
      where: eq(executionSteps.executionId, run.id),
    });
    const receipt = await latestReceipt(run.id, ctx.org.id);
    return NextResponse.json({
      id: run.id,
      status: run.status,
      input: run.input,
      output: run.output,
      error: run.error,
      startedAt: run.startedAt,
      durationMs: run.durationMs,
      steps: steps.map((s) => ({
        id: s.id,
        nodeId: s.nodeId,
        name: s.name,
        type: s.nodeType,
        status: s.status,
        durationMs: s.durationMs,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        input: s.input,
        output: s.output,
        config: s.config,
        logs: s.logs,
        error: s.error,
      })),
      receipt: receipt
        ? {
            id: receipt.id,
            sequence: receipt.sequence,
            root: receipt.root,
            status: receipt.status,
            chainId: receipt.chainId,
            txHash: receipt.txHash,
            blockNumber: receipt.blockNumber,
            createdAt: receipt.createdAt.toISOString(),
          }
        : null,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
