import Link from "next/link";
import { ensureMigrated } from "@/db/client";
import { requirePermission } from "@/server/context";
import { PageHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WorkflowPath } from "@/components/workflow/path";

export default async function TemplatesPage() {
  await requirePermission("workflows.read");
  const db = await ensureMigrated();
  const tpls = await db.query.templates.findMany();
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Templates"
        description="Reusable workflow definitions. Using one creates a draft — it does not mutate the library."
      />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {tpls.map((tpl) => (
          <Link
            key={tpl.id}
            href={`/templates/${tpl.slug}`}
            className="card-interactive flex flex-col rounded-[var(--radius)] border border-border bg-surface p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-[13px] font-medium tracking-tight">{tpl.name}</h2>
              {tpl.featured ? <Badge tone="accent">Featured</Badge> : <Badge>{tpl.category}</Badge>}
            </div>
            <p className="mt-1.5 line-clamp-2 text-[13px] text-muted">{tpl.description}</p>
            <div className="mt-3">
              <WorkflowPath nodes={tpl.definition.graph.nodes} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
