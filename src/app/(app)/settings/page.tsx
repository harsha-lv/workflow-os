import { desc, eq } from "drizzle-orm";
import { ensureMigrated } from "@/db/client";
import { auditLogs, memberships, secrets, users } from "@/db/schema";
import { requirePermission } from "@/server/context";
import { PLAN_LIMITS, planOf } from "@/domain/billing/usage";
import { PageHeader } from "@/components/ui/card";
import { AppearanceCard } from "@/components/theme/appearance-card";
import { formatRelative } from "@/lib/format";

export default async function SettingsPage() {
  const ctx = await requirePermission("org.read");
  const db = await ensureMigrated();
  const members = await db.query.memberships.findMany({
    where: eq(memberships.organizationId, ctx.org.id),
  });
  const memberUsers = await Promise.all(
    members.map(async (m) => ({
      ...m,
      user: await db.query.users.findFirst({ where: eq(users.id, m.userId) }),
    })),
  );
  const secretRows = await db.query.secrets.findMany({
    where: eq(secrets.organizationId, ctx.org.id),
  });
  const logs = await db.query.auditLogs.findMany({
    where: eq(auditLogs.organizationId, ctx.org.id),
    orderBy: [desc(auditLogs.createdAt)],
    limit: 20,
  });
  const plan = PLAN_LIMITS[planOf(ctx.org.plan)];

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Settings" description={`${ctx.org.name} · ${plan.label} plan`} />
      <AppearanceCard />
      <section className="mt-6">
        <h2 className="section-label">Notifications</h2>
        <p className="mt-2 text-[13px] text-muted">
          Workflow OS only surfaces failures, repeated incidents, pending approvals, and paused production workflows.
          It does not notify on every successful run.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="section-label">Workspace</h2>
        <div className="panel mt-2 p-4 text-[13px]">
          <p>
            Slug: <span className="font-mono">{ctx.org.slug}</span>
          </p>
          <p className="mt-2 text-muted">
            Roles are enforced on the server. Viewers can inspect; editors can build and run; admins manage members;
            owners can delete the workspace.
          </p>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="section-label">Members</h2>
        <ul className="panel mt-2 divide-y divide-border">
          {memberUsers.map((m) => (
            <li key={m.id} className="flex items-center justify-between px-4 py-3 text-sm">
              <span>
                {m.user?.name} <span className="text-muted">{m.user?.email}</span>
              </span>
              <span className="capitalize text-muted">{m.role}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="section-label">Secrets</h2>
        <p className="mt-1 text-[13px] text-muted">
          Stored with AES-256-GCM. Values are never returned to the browser. Reference them from HTTP nodes by name.
        </p>
        <ul className="panel mt-2 divide-y divide-border">
          {secretRows.length === 0 ? (
            <li className="px-4 py-6 text-sm text-muted">No secrets yet. Add them from the API or seed data.</li>
          ) : (
            secretRows.map((s) => (
              <li key={s.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="font-mono">{s.name}</span>
                <span className="text-muted">••••{s.lastFour}</span>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="section-label">Billing architecture</h2>
        <p className="mt-2 text-[13px] text-muted">
          Payments are not collected in v1. Usage is already tracked as executions, AI tokens, emails, members, and
          integrations so a future billing adapter can attach without rewriting nodes.
        </p>
        <ul className="mt-3 grid gap-1 text-sm text-muted">
          <li>Executions / period: {Number.isFinite(plan.executions) ? plan.executions.toLocaleString() : "unlimited"}</li>
          <li>AI tokens / period: {Number.isFinite(plan.aiTokens) ? plan.aiTokens.toLocaleString() : "unlimited"}</li>
          <li>Members: {Number.isFinite(plan.members) ? plan.members : "unlimited"}</li>
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="section-label">Audit log</h2>
        <ul className="panel mt-2 divide-y divide-border">
          {logs.map((row) => (
            <li key={row.id} className="px-4 py-3 text-sm">
              <p>{row.action}</p>
              <p className="text-xs text-faint">
                {row.resourceType}
                {row.resourceId ? ` · ${row.resourceId.slice(0, 16)}` : ""} · {formatRelative(row.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
