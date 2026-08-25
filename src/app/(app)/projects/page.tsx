import { eq } from "drizzle-orm";
import { ensureMigrated } from "@/db/client";
import { projects, workflows } from "@/db/schema";
import { requirePermission } from "@/server/context";
import { EmptyState, PageHeader } from "@/components/ui/card";

export default async function ProjectsPage() {
  const ctx = await requirePermission("projects.read");
  const db = await ensureMigrated();
  const rows = await db.query.projects.findMany({
    where: eq(projects.organizationId, ctx.org.id),
  });
  const wfs = await db.query.workflows.findMany({
    where: eq(workflows.organizationId, ctx.org.id),
  });
  const counts = new Map<string, number>();
  for (const wf of wfs) counts.set(wf.projectId, (counts.get(wf.projectId) ?? 0) + 1);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Projects"
        description="Projects group workflows. They are the unit you will eventually attach environments and billing to."
      />
      {rows.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            title="No projects"
            description="A workspace needs at least one project before you can save a workflow."
          />
        </div>
      ) : (
        <ul className="panel mt-5 divide-y divide-border">
          {rows.map((project) => (
            <li key={project.id} className="px-3.5 py-3">
              <p className="text-[13px] font-medium">{project.name}</p>
              <p className="text-[13px] text-muted">{project.description || "No description"}</p>
              <p className="mt-1 text-[11px] text-faint">
                {counts.get(project.id) ?? 0} workflow{(counts.get(project.id) ?? 0) === 1 ? "" : "s"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
