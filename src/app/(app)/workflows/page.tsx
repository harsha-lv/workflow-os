import Link from "next/link";
import { eq } from "drizzle-orm";
import { ensureMigrated } from "@/db/client";
import { projects } from "@/db/schema";
import { requirePermission } from "@/server/context";
import { listWorkflows } from "@/server/services/workflows";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { formatRelative } from "@/lib/format";
import { workflowHealth } from "@/server/services/ops";
import { ImportWorkflowButton, WorkflowActions } from "@/components/workflow/actions";

export default async function WorkflowsPage() {
  const ctx = await requirePermission("workflows.read");
  const items = await listWorkflows(ctx.org.id);
  const db = await ensureMigrated();
  const projectRows = await db.query.projects.findMany({ where: eq(projects.organizationId, ctx.org.id) });
  const projectName = new Map(projectRows.map((p) => [p.id, p.name]));
  const signals = new Map(
    await Promise.all(items.map(async (wf) => [wf.id, await workflowHealth(ctx.org.id, wf.id)] as const)),
  );

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        title="Workflows"
        description="Drafts stay editable. Published versions are what executions run."
        actions={
          <div className="flex gap-2">
            <ImportWorkflowButton />
            <Button asChild>
              <Link href="/workflows/new">New workflow</Link>
            </Button>
          </div>
        }
      />
      {items.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            title="No workflows yet"
            description="Build your first workflow from scratch, or start from a template that already has a path."
            action={
              <div className="flex gap-2">
                <Button asChild>
                  <Link href="/workflows/new">Create workflow</Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href="/templates">Browse templates</Link>
                </Button>
              </div>
            }
          />
        </div>
      ) : (
        <div className="panel mt-5 overflow-hidden">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Project</th>
                <th>Status</th>
                <th>Health</th>
                <th>Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((wf) => (
                <tr key={wf.id}>
                  <td>
                    <Link href={`/workflows/${wf.id}`} className="font-medium hover:underline">
                      {wf.name}
                    </Link>
                    <p className="text-[12px] text-muted">{wf.description}</p>
                  </td>
                  <td className="text-muted">{projectName.get(wf.projectId) ?? "—"}</td>
                  <td>
                    <StatusBadge status={wf.status} />
                  </td>
                  <td className="capitalize text-muted" title={signals.get(wf.id)?.insight}>
                    {signals.get(wf.id)?.signal ?? "unknown"}
                  </td>
                  <td className="whitespace-nowrap text-muted">{formatRelative(wf.updatedAt)}</td>
                  <td>
                    <WorkflowActions id={wf.id} status={wf.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
