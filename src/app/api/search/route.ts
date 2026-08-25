import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { ensureMigrated } from "@/db/client";
import { auditLogs, executions, projects, workflows } from "@/db/schema";
import { requirePermission } from "@/server/context";
import { toErrorResponse } from "@/server/errors";

export async function GET(request: Request) {
  try {
    const ctx = await requirePermission("workflows.read");
    const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    if (q.length < 1) {
      return NextResponse.json({
        hits: [
          { id: "new", type: "command", title: "Create workflow", subtitle: "N in the builder", href: "/workflows/new" },
          { id: "workflows", type: "command", title: "Workflows", href: "/workflows" },
          { id: "runs", type: "command", title: "Runs", href: "/runs" },
          { id: "failed", type: "command", title: "View failed runs", href: "/runs" },
          { id: "approvals", type: "command", title: "Approvals", href: "/approvals" },
          { id: "templates", type: "command", title: "Open templates", href: "/templates" },
          { id: "integrations", type: "command", title: "Open integrations", href: "/integrations" },
          { id: "settings", type: "command", title: "Open settings", href: "/settings" },
        ],
      });
    }
    const db = await ensureMigrated();
    const wf = await db.query.workflows.findMany({
      where: eq(workflows.organizationId, ctx.org.id),
      limit: 20,
    });
    const tpls = await db.query.templates.findMany({ limit: 20 });
    const runs = await db.query.executions.findMany({
      where: eq(executions.organizationId, ctx.org.id),
      limit: 20,
    });
    const prj = await db.query.projects.findMany({
      where: eq(projects.organizationId, ctx.org.id),
      limit: 20,
    });
    const audits = await db.query.auditLogs.findMany({
      where: eq(auditLogs.organizationId, ctx.org.id),
      limit: 20,
    });
    const hits = [
      ...wf
        .filter((w) => w.name.toLowerCase().includes(q.toLowerCase()))
        .map((w) => ({ id: w.id, type: "workflow", title: w.name, subtitle: w.status, href: `/workflows/${w.id}` })),
      ...tpls
        .filter((t) => `${t.name} ${t.description}`.toLowerCase().includes(q.toLowerCase()))
        .map((t) => ({
          id: t.id,
          type: "template",
          title: t.name,
          subtitle: t.category,
          href: `/templates/${t.slug}`,
        })),
      ...runs
        .filter((r) => r.id.includes(q) || r.status.includes(q))
        .map((r) => ({
          id: r.id,
          type: "execution",
          title: r.id,
          subtitle: r.status,
          href: `/runs/${r.id}`,
        })),
      ...prj
        .filter((p) => p.name.toLowerCase().includes(q.toLowerCase()))
        .map((p) => ({
          id: p.id,
          type: "project",
          title: p.name,
          subtitle: p.slug,
          href: "/projects",
        })),
      ...audits
        .filter((a) => a.action.includes(q.toLowerCase()))
        .map((a) => ({
          id: a.id,
          type: "audit",
          title: a.action,
          subtitle: a.resourceType,
          href: "/settings",
        })),
    ];
    return NextResponse.json({ hits: hits.slice(0, 20) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
