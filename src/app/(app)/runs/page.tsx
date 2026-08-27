import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ensureMigrated } from "@/db/client";
import { executions, workflows } from "@/db/schema";
import { requirePermission } from "@/server/context";
import { EmptyState, PageHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { formatDuration, formatRelative } from "@/lib/format";

export default async function RunsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const ctx = await requirePermission("executions.read");
  const { page: pageRaw } = await searchParams;
  const page = Math.max(1, Number(pageRaw ?? 1) || 1);
  const pageSize = 50;
  const db = await ensureMigrated();
  const rows = await db.query.executions.findMany({
    where: eq(executions.organizationId, ctx.org.id),
    orderBy: [desc(executions.createdAt)],
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });
  const wfs = await db.query.workflows.findMany({ where: eq(workflows.organizationId, ctx.org.id) });
  const names = new Map(wfs.map((w) => [w.id, w.name]));

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader title="Runs" description="Every execution is stored against the exact workflow version it used." />
      {rows.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            title="No executions yet."
            description="Test a workflow from the editor. Test runs stay labeled so they never mix with production."
            action={
              <Button asChild>
                <Link href="/workflows">Open workflows</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div className="panel mt-5 overflow-x-auto">
          <table className="data-table min-w-[640px]">
            <thead>
              <tr>
                <th>Run</th>
                <th>Workflow</th>
                <th>Trigger</th>
                <th>Status</th>
                <th>Duration</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((run) => (
                <tr key={run.id}>
                  <td className="font-mono text-[12px]">
                    <Link href={`/runs/${run.id}`} className="hover:underline">
                      {run.id.slice(0, 18)}
                    </Link>
                  </td>
                  <td>{names.get(run.workflowId) ?? run.workflowId}</td>
                  <td className="text-muted">
                    {run.triggerType}
                    {run.triggerType === "test" ? " · test" : ""}
                  </td>
                  <td>
                    <StatusBadge status={run.status} />
                  </td>
                  <td className="tabular-nums text-muted">{formatDuration(run.durationMs)}</td>
                  <td className="whitespace-nowrap text-muted">{formatRelative(run.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex justify-end gap-2 border-t border-border px-3 py-2 text-[12px]">
            {page > 1 ? (
              <Link href={`/runs?page=${page - 1}`} className="text-muted hover:text-text">
                Previous
              </Link>
            ) : null}
            {rows.length === 50 ? (
              <Link href={`/runs?page=${page + 1}`} className="text-muted hover:text-text">
                Next
              </Link>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
