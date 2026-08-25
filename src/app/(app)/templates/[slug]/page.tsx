import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { ensureMigrated } from "@/db/client";
import { templates } from "@/db/schema";
import { requirePermission } from "@/server/context";
import { createWorkflow } from "@/server/services/workflows";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/card";
import { WorkflowPath } from "@/components/workflow/path";

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
    redirect(`/workflows/${id}`);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={tpl.name}
        description={tpl.description}
        actions={
          <form action={useTemplate}>
            <Button type="submit">Use template</Button>
          </form>
        }
      />
      <div className="panel mt-5 p-4">
        <WorkflowPath nodes={tpl.definition.graph.nodes} />
      </div>
      <ol className="mt-4 grid gap-1.5">
        {tpl.definition.graph.nodes.map((node) => (
          <li key={node.id} className="rounded-md border border-border px-3 py-2 text-sm">
            <span className="text-faint">{node.type}</span>
            <span className="mx-2">·</span>
            {node.name}
          </li>
        ))}
      </ol>
    </div>
  );
}
