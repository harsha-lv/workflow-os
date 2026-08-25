import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { ensureMigrated } from "@/db/client";
import { executionSteps, executions } from "@/db/schema";
import { requirePermission } from "@/server/context";
import { toErrorResponse } from "@/server/errors";
import { ValidationError } from "@/domain/permissions";
import { estimateUsd } from "@/domain/ops/health";

export async function GET(request: Request) {
  try {
    const ctx = await requirePermission("executions.read");
    const url = new URL(request.url);
    const a = url.searchParams.get("a");
    const b = url.searchParams.get("b");
    if (!a || !b) throw new ValidationError("Provide two execution ids.");
    const db = await ensureMigrated();
    const runs = await db.query.executions.findMany({
      where: and(eq(executions.organizationId, ctx.org.id), inArray(executions.id, [a, b])),
    });
    if (runs.length !== 2) throw new ValidationError("Both executions must belong to this workspace.");
    const left = runs.find((r) => r.id === a)!;
    const right = runs.find((r) => r.id === b)!;
    const leftSteps = await db.query.executionSteps.findMany({ where: eq(executionSteps.executionId, left.id) });
    const rightSteps = await db.query.executionSteps.findMany({ where: eq(executionSteps.executionId, right.id) });
    const tokens = (steps: typeof leftSteps) =>
      steps.reduce((sum, s) => {
        const usage = s.output && typeof s.output === "object" && s.output !== null && "usage" in s.output
          ? (s.output as { usage?: { inputTokens?: number; outputTokens?: number } }).usage
          : undefined;
        return sum + (usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0);
      }, 0);
    return NextResponse.json({
      a: { id: left.id, status: left.status, durationMs: left.durationMs, tokens: tokens(leftSteps) },
      b: { id: right.id, status: right.status, durationMs: right.durationMs, tokens: tokens(rightSteps) },
      cost: {
        a: estimateUsd(tokens(leftSteps) * 0.6, tokens(leftSteps) * 0.4),
        b: estimateUsd(tokens(rightSteps) * 0.6, tokens(rightSteps) * 0.4),
      },
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
