import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ensureMigrated } from "@/db/client";
import { auditLogs, workflows } from "@/db/schema";
import { requireContext } from "@/server/context";
import { dashboardStats } from "@/server/services/executions";
import { PageHeader } from "@/components/ui/card";
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

  const metrics = [
    { label: "Workflows", value: stats.workflowCount, hint: `${stats.publishedCount} published` },
    { label: "Runs", value: stats.runCount, hint: "All recorded executions" },
    { label: "Failed", value: stats.failedCount, hint: stats.failedCount ? "Needs attention" : "Clear" },
    {
      label: "AI tokens",
      value: stats.tokenCount,
      hint: `${usagePercent(stats.tokenCount, plan.aiTokens)}% of ${plan.label}`,
    },
  ];

  return (
    <div className="page-stack mx-auto max-w-6xl">
      <PageHeader
        title="Operations"
        description={`${ctx.org.name} · live view of automations, failures, and approvals.${ctx.org.isDemo || ctx.user.email === getDemoEmail() ? " FlowForge demo — seeded fixture data, not real customer records." : ""}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link href="/runs">Failed runs</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/approvals">Approvals</Link>
            </Button>
            <Button asChild>
              <Link href="/workflows/new/ai">Build with AI</Link>
            </Button>
          </div>
        }
      />

      <QuickStart empty={stats.workflowCount === 0} />

      <section className="panel mt-5 p-4">
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

      <div className="panel mt-5 grid divide-y divide-border sm:grid-cols-2 sm:divide-x sm:divide-y-0 xl:grid-cols-4">
        {metrics.map((card) => (
          <div key={card.label} className="px-4 py-3.5">
            <p className="section-label">{card.label}</p>
            <p className="metric-value mt-2">{formatNumber(card.value)}</p>
            <p className="mt-1 text-[12px] text-muted">{card.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section>
          <div className="mb-2 flex items-baseline justify-between">
            <SectionLabel>Recent runs</SectionLabel>
            <Link href="/runs" className="text-[12px] text-muted hover:text-text">
              View all
            </Link>
          </div>
          <Panel>
            {stats.recent.length === 0 ? (
              <p className="px-4 py-6 text-[13px] text-muted">
                No executions yet. Publish a workflow and run it from the editor.
              </p>
            ) : (
              stats.recent.map((run) => (
                <Link
                  key={run.id}
                  href={`/runs/${run.id}`}
                  className="flex items-center justify-between gap-3 border-t border-border px-3.5 py-2.5 first:border-t-0 transition-colors duration-[var(--duration-fast)] hover:bg-surface-hover"
                >
                  <div className="min-w-0">
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
