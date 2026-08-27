import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { ensureMigrated } from "@/db/client";
import { templates } from "@/db/schema";
import { requirePermission } from "@/server/context";
import { createWorkflow } from "@/server/services/workflows";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/card";
import { WorkflowPath } from "@/components/workflow/path";
import { WorkflowPreviewTree } from "@/components/workflow/preview-tree";
import { templateMeta } from "@/domain/templates/meta";

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await requirePermission("workflows.read");
  const { slug } = await params;
  const db = await ensureMigrated();
  const tpl = await db.query.templates.findFirst({ where: eq(templates.slug, slug) });
  if (!tpl) notFound();

  async function useTemplate() {
    "use server";
    const session = await requirePermission("workflows.write");
    const id = await createWorkflow({
      orgId: session.org.id,
      userId: session.user.id,
      name: tpl!.name,
      description: tpl!.description,
      templateSlug: tpl!.slug,
    });
    redirect(`/workflows/${id}?setup=template`);
  }

  const meta = templateMeta(tpl.slug, tpl.definition.graph, tpl.description);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={tpl.name}
        description={meta.whatItDoes}
        actions={
          <form action={useTemplate}>
            <Button type="submit">Use template</Button>
          </form>
        }
      />
      <div className="panel mt-5 p-4">
        <p className="section-label mb-3">Visual workflow</p>
        <WorkflowPath nodes={tpl.definition.graph.nodes} />
        <div className="mt-4">
          <WorkflowPreviewTree graph={tpl.definition.graph} />
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="panel p-4 text-[13px]">
          <p className="section-label">Required integrations</p>
          <p className="mt-2 text-muted">{meta.integrations.join(" · ") || "None beyond FlowForge"}</p>
        </div>
        <div className="panel p-4 text-[13px]">
          <p className="section-label">Estimated setup</p>
          <p className="mt-2 text-muted">About {meta.setupMinutes} minutes</p>
        </div>
      </div>
      <ol className="mt-4 grid gap-1.5">
        {meta.setupSteps.map((step, i) => (
          <li key={step} className="rounded-md border border-border px-3 py-2 text-sm">
            <span className="text-faint">Step {i + 1}</span>
            <span className="mx-2">·</span>
            {step}
          </li>
        ))}
      </ol>
    </div>
  );
}
