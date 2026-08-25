import { and, eq, inArray } from "drizzle-orm";
import { ensureMigrated } from "@/db/client";
import { executions } from "@/db/schema";
import { requirePermission } from "@/server/context";
import { PageHeader } from "@/components/ui/card";
import { formatDuration } from "@/lib/format";
import { StatusBadge } from "@/components/ui/badge";

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string }>;
}) {
  const ctx = await requirePermission("executions.read");
  const { a, b } = await searchParams;
  if (!a || !b) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader
          title="Compare executions"
          description="Add ?a=run_…&b=run_… to compare two runs from this workspace."
        />
      </div>
    );
  }
  const db = await ensureMigrated();
  const runs = await db.query.executions.findMany({
    where: and(eq(executions.organizationId, ctx.org.id), inArray(executions.id, [a, b])),
  });
  const left = runs.find((r) => r.id === a);
  const right = runs.find((r) => r.id === b);
  if (!left || !right) {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader title="Compare executions" description="Both runs must belong to this workspace." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Compare executions" description={`${left.id} vs ${right.id}`} />
      <div className="panel mt-5 overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Metric</th>
              <th>A</th>
              <th>B</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Status</td>
              <td>
                <StatusBadge status={left.status} />
              </td>
              <td>
                <StatusBadge status={right.status} />
              </td>
            </tr>
            <tr>
              <td>Duration</td>
              <td className="tabular-nums">{formatDuration(left.durationMs)}</td>
              <td className="tabular-nums">{formatDuration(right.durationMs)}</td>
            </tr>
            <tr>
              <td>Trigger</td>
              <td>{left.triggerType}</td>
              <td>{right.triggerType}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
