import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { ensureMigrated } from "@/db/client";
import { executionSteps, executions, workflowVersions, workflows } from "@/db/schema";
import { requirePermission } from "@/server/context";
import { StatusBadge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/card";
import { formatDateTime, formatDuration } from "@/lib/format";
import { ExecutionInspector } from "@/components/execution/inspector";

export default async function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePermission("executions.read");
  const { id } = await params;
  const db = await ensureMigrated();
  const run = await db.query.executions.findFirst({
    where: and(eq(executions.id, id), eq(executions.organizationId, ctx.org.id)),
  });
  if (!run) notFound();
  const steps = await db.query.executionSteps.findMany({ where: eq(executionSteps.executionId, run.id) });
  const workflow = await db.query.workflows.findFirst({ where: eq(workflows.id, run.workflowId) });
  const version = await db.query.workflowVersions.findFirst({
    where: eq(workflowVersions.id, run.workflowVersionId),
  });

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title={workflow?.name ?? "Execution"}
        description={`${run.triggerType} · ${formatDateTime(run.createdAt)} · ${formatDuration(run.durationMs)}`}
        actions={<StatusBadge status={run.status} />}
      />
      {run.error ? (
        <div className="mt-4 rounded-[var(--radius)] border border-danger/40 bg-[var(--danger-bg)] px-4 py-3 text-sm">
          <p className="font-medium text-danger">{run.error.message}</p>
          <p className="mt-1 text-xs text-muted">
            {run.error.type}
            {run.error.nodeId ? ` · node ${run.error.nodeId}` : ""}
          </p>
        </div>
      ) : null}
      <ExecutionInspector
        graph={version?.definition.graph ?? { nodes: [], edges: [] }}
        steps={steps.map((s) => ({
          nodeId: s.nodeId,
          name: s.name,
          type: s.nodeType,
          status: s.status,
          durationMs: s.durationMs,
          startedAt: s.startedAt,
          input: s.input,
          output: s.output,
          config: s.config,
          logs: s.logs,
          error: s.error,
        }))}
        runInput={run.input}
        runOutput={run.output}
        runStatus={run.status}
        executionId={run.id}
        startedAt={run.startedAt}
      />
    </div>
  );
}
