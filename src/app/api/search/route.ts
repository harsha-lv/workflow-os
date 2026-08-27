import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { ensureMigrated } from "@/db/client";
import { approvals, auditLogs, executions, integrations, projects, workflows } from "@/db/schema";
import { requirePermission } from "@/server/context";
import { toErrorResponse } from "@/server/errors";

export async function GET(request: Request) {
  try {
    const ctx = await requirePermission("workflows.read");
    const q = new URL(request.url).searchParams.get("q")?.trim() ?? "";
    if (q.length < 1) {
      return NextResponse.json({
        hits: [
          { id: "new", type: "command", title: "Create workflow", subtitle: "Start blank or from a template", href: "/workflows/new" },
          { id: "ai", type: "command", title: "Build with AI", subtitle: "Describe what you want to automate", href: "/workflows/new/ai" },
          { id: "workflows", type: "command", title: "Search workflows", href: "/workflows" },
          { id: "runs", type: "command", title: "Search executions", href: "/runs" },
          { id: "templates", type: "command", title: "Open templates", href: "/templates" },
          { id: "approvals", type: "command", title: "Open approvals", href: "/approvals" },
          { id: "settings", type: "command", title: "Open settings", href: "/settings" },
          { id: "integrations", type: "command", title: "Open integrations", href: "/integrations" },
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
    const ints = await db.query.integrations.findMany({
      where: eq(integrations.organizationId, ctx.org.id),
      limit: 20,
    });
    const appr = await db.query.approvals.findMany({
      where: eq(approvals.organizationId, ctx.org.id),
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
      ...ints
        .filter((row) => `${row.name} ${row.provider}`.toLowerCase().includes(q.toLowerCase()))
        .map((row) => ({
          id: row.id,
          type: "integration",
          title: row.name,
          subtitle: row.status,
          href: "/integrations",
        })),
      ...appr
        .filter((row) => `${row.title} ${row.status}`.toLowerCase().includes(q.toLowerCase()))
        .map((row) => ({
          id: row.id,
          type: "approval",
          title: row.title,
          subtitle: row.status,
          href: "/approvals",
        })),
    ];
    return NextResponse.json({ hits: hits.slice(0, 20) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
