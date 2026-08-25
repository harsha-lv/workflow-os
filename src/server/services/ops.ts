import { and, desc, eq } from "drizzle-orm";
import { ensureMigrated } from "@/db/client";
import { approvals, executionSteps, executions, usageEvents, workflows } from "@/db/schema";
import { computeHealth, estimateUsd, type WorkflowHealth } from "@/domain/ops/health";
import { explainFailure } from "@/domain/ops/failure";

export async function workflowHealth(orgId: string, workflowId: string): Promise<WorkflowHealth> {
  const db = await ensureMigrated();
  const runs = await db.query.executions.findMany({
    where: and(eq(executions.organizationId, orgId), eq(executions.workflowId, workflowId)),
    orderBy: [desc(executions.createdAt)],
    limit: 50,
  });
  const nodeDurations: Array<{ name: string; ms: number }> = [];
  for (const run of runs.slice(0, 8)) {
    const steps = await db.query.executionSteps.findMany({ where: eq(executionSteps.executionId, run.id) });
    for (const step of steps) {
      if (step.durationMs) nodeDurations.push({ name: step.name, ms: step.durationMs });
    }
  }
  const aggregated = new Map<string, { name: string; ms: number; n: number }>();
  for (const row of nodeDurations) {
    const cur = aggregated.get(row.name) ?? { name: row.name, ms: 0, n: 0 };
    cur.ms += row.ms;
    cur.n += 1;
    aggregated.set(row.name, cur);
  }
  return computeHealth(
    runs.map((r) => ({
      status: r.status,
      durationMs: r.durationMs,
      createdAt: r.createdAt,
      errorNodeId: r.error?.nodeId,
    })),
    [...aggregated.values()].map((row) => ({ name: row.name, ms: row.ms / row.n })),
  );
}

export async function attention(orgId: string) {
  const db = await ensureMigrated();
  const failed = await db.query.executions.findMany({
    where: and(eq(executions.organizationId, orgId), eq(executions.status, "failed")),
    orderBy: [desc(executions.createdAt)],
    limit: 20,
  });
  const waiting = await db.query.approvals.findMany({
    where: and(eq(approvals.organizationId, orgId), eq(approvals.status, "pending")),
  });
  const running = await db.query.executions.findMany({
    where: and(eq(executions.organizationId, orgId), eq(executions.status, "running")),
    limit: 8,
  });
  const wfs = await db.query.workflows.findMany({ where: eq(workflows.organizationId, orgId) });
  const names = new Map(wfs.map((w) => [w.id, w.name]));
  const failCounts = new Map<string, number>();
  for (const run of failed) failCounts.set(run.workflowId, (failCounts.get(run.workflowId) ?? 0) + 1);
  const items: Array<{ title: string; detail: string; href: string }> = [];
  for (const [workflowId, count] of failCounts) {
    items.push({
      title: `${names.get(workflowId) ?? "Workflow"} needs attention`,
      detail: `${count} failed run${count === 1 ? "" : "s"} in recent history.`,
      href: `/runs?status=failed`,
    });
  }
  if (waiting.length) {
    items.push({
      title: `${waiting.length} waiting approval${waiting.length === 1 ? "" : "s"}`,
      detail: "Human-in-the-loop steps are paused.",
      href: "/approvals",
    });
  }
  return {
    items,
    running: running.map((r) => ({
      id: r.id,
      workflow: names.get(r.workflowId) ?? "Workflow",
      href: `/runs/${r.id}`,
    })),
    failedCount: failed.length,
    pendingApprovals: waiting.length,
  };
}

export async function tokenCost(orgId: string, workflowId?: string) {
  const db = await ensureMigrated();
  const rows = await db.query.usageEvents.findMany({
    where: and(eq(usageEvents.organizationId, orgId), eq(usageEvents.kind, "ai.tokens")),
    limit: 200,
  });
  const filtered = workflowId
    ? rows.filter((r) => r.metadata && r.metadata.workflowId === workflowId)
    : rows;
  const tokens = filtered.reduce((sum, r) => sum + r.quantity, 0);
  const estimatedUsd = estimateUsd(Math.round(tokens * 0.6), Math.round(tokens * 0.4));
  const runCount = filtered.length || 1;
  return {
    tokens,
    estimatedUsd,
    events: filtered.length,
    monthlyAtCurrent: estimatedUsd,
    at10kExecutions: (estimatedUsd / runCount) * 10_000,
  };
}

export { explainFailure };
