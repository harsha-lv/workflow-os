import Link from "next/link";
import { eq } from "drizzle-orm";
import { ensureMigrated } from "@/db/client";
import { projects } from "@/db/schema";
import { requirePermission } from "@/server/context";
import { createWorkflow } from "@/server/services/workflows";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/card";
import { WorkflowPath } from "@/components/workflow/path";
import { Badge } from "@/components/ui/badge";
import { SectionLabel } from "@/components/ui/section";

export default async function NewWorkflowPage() {
  const ctx = await requirePermission("workflows.write");
  const db = await ensureMigrated();
  const tpls = await db.query.templates.findMany();
  const projectRows = await db.query.projects.findMany({ where: eq(projects.organizationId, ctx.org.id) });

  async function createBlank() {
    "use server";
    const session = await requirePermission("workflows.write");
    const id = await createWorkflow({
      orgId: session.org.id,
      userId: session.user.id,
      projectId: projectRows[0]?.id,
      name: "Untitled workflow",
    });
    redirect(`/workflows/${id}`);
  }

  async function createFromTemplate(formData: FormData) {
    "use server";
    const session = await requirePermission("workflows.write");
    const slug = String(formData.get("slug") ?? "");
    const id = await createWorkflow({
      orgId: session.org.id,
      userId: session.user.id,
      projectId: projectRows[0]?.id,
      name: "",
      templateSlug: slug,
    });
    redirect(`/workflows/${id}`);
  }

  return (
    <div className="page-stack mx-auto max-w-5xl">
      <PageHeader title="New workflow" description="Start from a blank canvas, or clone a path that already works." />

      <form action={createBlank} className="panel mt-5 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[13px] font-medium">Create from scratch</p>
          <p className="mt-1 text-[13px] text-muted">Empty canvas with a trigger of your choice. Best when the path is yours.</p>
        </div>
        <Button type="submit">Start blank</Button>
      </form>

      <section className="mt-6">
        <SectionLabel>Start from a template</SectionLabel>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {tpls.map((tpl) => (
            <form key={tpl.id} action={createFromTemplate} className="card-interactive rounded-[var(--radius)] border border-border bg-surface p-4">
              <input type="hidden" name="slug" value={tpl.slug} />
              <div className="flex items-start justify-between gap-2">
                <p className="text-[13px] font-medium">{tpl.name}</p>
                <Badge>{tpl.category}</Badge>
              </div>
              <p className="mt-1.5 line-clamp-2 text-[13px] text-muted">{tpl.description}</p>
              <div className="mt-3">
                <WorkflowPath nodes={tpl.definition.graph.nodes} />
              </div>
              <div className="mt-4 flex items-center justify-between">
                <Link href={`/templates/${tpl.slug}`} className="text-[12px] text-muted hover:text-text">
                  Preview
                </Link>
                <Button size="sm" type="submit" variant="secondary">
                  Use template
                </Button>
              </div>
            </form>
          ))}
        </div>
      </section>
    </div>
  );
}
