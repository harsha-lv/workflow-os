import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { ensureMigrated } from "@/db/client";
import { executionSteps, executions } from "@/db/schema";
import { requirePermission } from "@/server/context";
import { toErrorResponse } from "@/server/errors";
import { NotFoundError } from "@/domain/permissions";

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
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
