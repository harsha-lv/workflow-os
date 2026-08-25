import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { ensureMigrated } from "@/db/client";
import { executionSteps, executions } from "@/db/schema";
import { requirePermission } from "@/server/context";
import { toErrorResponse } from "@/server/errors";
import { NotFoundError } from "@/domain/permissions";
import { runPersistedExecution } from "@/server/services/executions";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requirePermission("workflows.execute");
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as { fromNodeId?: string };
    const db = await ensureMigrated();
    const run = await db.query.executions.findFirst({
      where: and(eq(executions.id, id), eq(executions.organizationId, ctx.org.id)),
    });
    if (!run) throw new NotFoundError("Execution not found");
    const fromNodeId = body.fromNodeId ?? run.error?.nodeId ?? run.resumeFrom ?? undefined;
    if (fromNodeId) {
      await db
        .update(executionSteps)
        .set({ status: "pending", error: null, output: null, endedAt: null })
        .where(and(eq(executionSteps.executionId, run.id), eq(executionSteps.nodeId, fromNodeId)));
    }
    await db
      .update(executions)
      .set({
        status: "queued",
        error: null,
        resumeFrom: fromNodeId ?? null,
        waitUntil: null,
        lockedAt: null,
        lockedBy: null,
      })
      .where(eq(executions.id, run.id));
    void runPersistedExecution(run.id);
    return NextResponse.json({ id: run.id, fromNodeId: fromNodeId ?? null });
  } catch (error) {
    return toErrorResponse(error);
  }
}
