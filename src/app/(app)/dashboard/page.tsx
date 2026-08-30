import Link from "next/link";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { ensureMigrated } from "@/db/client";
import { auditLogs, executionReceipts, workflows } from "@/db/schema";
import { requireContext } from "@/server/context";
import { dashboardStats } from "@/server/services/executions";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { Panel, SectionLabel } from "@/components/ui/section";
import { formatNumber, formatRelative } from "@/lib/format";
import { PLAN_LIMITS, planOf, usagePercent } from "@/domain/billing/usage";
import { attention } from "@/server/services/ops";
import { getDemoEmail } from "@/server/config";
import { QuickStart } from "@/components/start/quick-start";

export default async function DashboardPage() {
  const ctx = await requireContext();
  const stats = await dashboardStats(ctx.org.id);
  const db = await ensureMigrated();
  const activity = await db.query.auditLogs.findMany({
    where: eq(auditLogs.organizationId, ctx.org.id),
    orderBy: [desc(auditLogs.createdAt)],
    limit: 8,
  });
  const recentWorkflows = await db.query.workflows.findMany({
    where: eq(workflows.organizationId, ctx.org.id),
    orderBy: [desc(workflows.updatedAt)],
    limit: 6,
  });
  const plan = PLAN_LIMITS[planOf(ctx.org.plan)];
  const ops = await attention(ctx.org.id);
  const allWorkflows = await db.query.workflows.findMany({
    where: eq(workflows.organizationId, ctx.org.id),
  });
  const workflowNames = new Map(allWorkflows.map((w) => [w.id, w.name]));
  const [{ c: proofCount } = { c: 0 }] = await db
    .select({ c: sql<number>`count(*)` })
    .from(executionReceipts)
    .where(eq(executionReceipts.organizationId, ctx.org.id));
  const [{ c: anchoredCount } = { c: 0 }] = await db
    .select({ c: sql<number>`count(*)` })
    .from(executionReceipts)
    .where(
      and(
        eq(executionReceipts.organizationId, ctx.org.id),
        inArray(executionReceipts.status, ["confirmed", "mocked"]),
      ),
    );
  const successRate = stats.runCount ? Math.round(((stats.runCount - stats.failedCount) / stats.runCount) * 100) : 0;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const firstName = ctx.user.name.split(" ")[0] ?? ctx.user.name;

  return (
    <div className="page-stack mx-auto max-w-6xl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="section-label">{ctx.org.name}</p>
          <h1 className="page-title mt-2">
            {greeting}, {firstName}
          </h1>
          <p className="page-desc">
            Command center for live automations, failures, and cryptographic proofs.
            {ctx.org.isDemo || ctx.user.email === getDemoEmail()
              ? " Demo workspace — seeded fixture data, not real customer records."
              : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="secondary">
            <Link href="/approvals">Approvals</Link>
          </Button>
          <Button asChild>
            <Link href="/workflows/new/ai">Build with AI</Link>
          </Button>
        </div>
      </div>

      <QuickStart empty={stats.workflowCount === 0} />

      <section className="panel mt-6 overflow-hidden p-5 md:p-7">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="section-label">Execution health</p>
            <p className="metric-value mt-3">{successRate}%</p>
            <p className="mt-2 text-[13px] text-muted">Success rate across {formatNumber(stats.runCount)} recorded runs</p>
          </div>
          <dl className="grid grid-cols-2 gap-x-10 gap-y-4 sm:grid-cols-4">
            <div>
              <dt className="section-label">Workflows</dt>
              <dd className="mt-1 text-2xl font-medium tracking-[-0.04em] tabular-nums">{formatNumber(stats.workflowCount)}</dd>
              <p className="mt-1 text-[12px] text-faint">{stats.publishedCount} published</p>
            </div>
            <div>
              <dt className="section-label">Failed</dt>
              <dd className="mt-1 text-2xl font-medium tracking-[-0.04em] tabular-nums">{formatNumber(stats.failedCount)}</dd>
              <p className="mt-1 text-[12px] text-faint">{stats.failedCount ? "Needs attention" : "Clear"}</p>
            </div>
            <div>
              <dt className="section-label">Proofs</dt>
              <dd className="mt-1 text-2xl font-medium tracking-[-0.04em] tabular-nums text-[color:var(--verify)]">
                {formatNumber(Number(proofCount))}
              </dd>
              <p className="mt-1 text-[12px] text-faint">{Number(anchoredCount)} anchored or demo-verified</p>
            </div>
            <div>
              <dt className="section-label">AI tokens</dt>
              <dd className="mt-1 text-2xl font-medium tracking-[-0.04em] tabular-nums">{formatNumber(stats.tokenCount)}</dd>
              <p className="mt-1 text-[12px] text-faint">
                {usagePercent(stats.tokenCount, plan.aiTokens)}% of {plan.label}
              </p>
            </div>
          </dl>
        </div>
      </section>

      <section className="panel mt-5 p-5">
        <SectionLabel>Attention required</SectionLabel>
        {ops.items.length === 0 && ops.running.length === 0 ? (
          <p className="mt-2 text-[13px] text-muted">Nothing needs your attention.</p>
        ) : (
          <ul className="mt-2 grid gap-1.5">
            {ops.running.map((row) => (
              <li key={row.id}>
                <Link href={row.href} className="text-[13px] hover:underline">
                  {row.workflow} is running
                </Link>
              </li>
            ))}
            {ops.items.map((item) => (
              <li key={item.title}>
                <Link href={item.href} className="text-[13px] hover:underline">
                  {item.title}
                </Link>
                <p className="text-[12px] text-muted">{item.detail}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section>
          <div className="mb-2 flex items-baseline justify-between">
            <SectionLabel>Execution timeline</SectionLabel>
            <Link href="/runs" className="text-[12px] text-muted hover:text-text">
              View all
            </Link>
          </div>
          <Panel className="timeline-rail py-2">
            {stats.recent.length === 0 ? (
              <p className="px-4 py-6 text-[13px] text-muted">
                No executions yet. Publish a workflow and run it from the editor.
              </p>
            ) : (
              stats.recent.map((run) => (
                <Link
                  key={run.id}
                  href={`/runs/${run.id}`}
                  className="relative flex items-center justify-between gap-3 px-3.5 py-2.5 pl-7 transition-colors duration-[var(--duration-fast)] hover:bg-surface-hover"
                >
                  <span
                    className="absolute left-[9px] top-1/2 size-1.5 -translate-y-1/2 rounded-full"
                    style={{
                      background:
                        run.status === "success"
                          ? "var(--success)"
                          : run.status === "failed"
                            ? "var(--danger)"
                            : run.status === "running"
                              ? "var(--info)"
                              : "var(--warning)",
                    }}
                    aria-hidden
                  />
                  <div className="relative min-w-0">
                    <p className="truncate text-[13px]">{workflowNames.get(run.workflowId) ?? "Workflow"}</p>
                    <p className="truncate text-[11px] text-faint">
                      {run.triggerType} · {formatRelative(run.createdAt)}
                    </p>
                  </div>
                  <StatusBadge status={run.status} />
                </Link>
              ))
            )}
          </Panel>
        </section>
        <section>
          <SectionLabel className="mb-2">Activity</SectionLabel>
          <Panel>
            {activity.length === 0 ? (
              <p className="px-4 py-6 text-[13px] text-muted">
                Workspace activity will appear here as people publish, invite, and execute.
              </p>
            ) : (
              activity.map((row) => (
                <div key={row.id} className="border-t border-border px-3.5 py-2.5 first:border-t-0">
                  <p className="text-[13px]">{row.action.replaceAll(".", " ")}</p>
                  <p className="text-[11px] text-faint">{formatRelative(row.createdAt)}</p>
                </div>
              ))
            )}
          </Panel>
        </section>
      </div>

      <section className="mt-6">
        <div className="mb-2 flex items-baseline justify-between">
          <SectionLabel>Workflows</SectionLabel>
          <Link href="/workflows" className="text-[12px] text-muted hover:text-text">
            Manage
          </Link>
        </div>
        <Panel>
          {recentWorkflows.length === 0 ? (
            <p className="px-4 py-6 text-[13px] text-muted">
              No workflows yet. Describe what you want to automate and FlowForge can build your first workflow.
            </p>
          ) : null}
          {recentWorkflows.map((wf) => (
            <Link
              key={wf.id}
              href={`/workflows/${wf.id}`}
              className="flex items-center justify-between gap-3 border-t border-border px-3.5 py-2.5 first:border-t-0 transition-colors duration-[var(--duration-fast)] hover:bg-surface-hover"
            >
              <div className="min-w-0">
                <p className="truncate text-[13px]">{wf.name}</p>
                <p className="truncate text-[12px] text-muted">{wf.description}</p>
              </div>
              <StatusBadge status={wf.status} />
            </Link>
          ))}
        </Panel>
      </section>
    </div>
  );
}
