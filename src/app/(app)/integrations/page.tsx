import { eq } from "drizzle-orm";
import { ensureMigrated } from "@/db/client";
import { integrations } from "@/db/schema";
import { requirePermission } from "@/server/context";
import { envProviderConfig, listProviderInfo } from "@/domain/ai/registry";
import { PageHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";

export default async function IntegrationsPage() {
  const ctx = await requirePermission("integrations.read");
  const db = await ensureMigrated();
  const rows = await db.query.integrations.findMany({
    where: eq(integrations.organizationId, ctx.org.id),
  });
  const providers = listProviderInfo(envProviderConfig());

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Integrations"
        description="Providers are adapters. Workflow nodes talk to this layer, not to vendor SDKs directly."
      />
      <h2 className="section-label mt-5">AI providers</h2>
      <div className="panel mt-2 divide-y divide-border">
        {providers.map((p) => (
          <div key={p.id} className="flex items-center justify-between px-3.5 py-3">
            <div>
              <p className="text-[13px] font-medium">{p.name}</p>
              <p className="text-[12px] text-muted">{p.models.map((m) => m.label).join(" · ")}</p>
            </div>
            <StatusBadge status={p.configured ? "connected" : "disconnected"} />
          </div>
        ))}
      </div>
      <h2 className="section-label mt-6">Workspace adapters</h2>
      <div className="panel mt-2 divide-y divide-border">
        {rows.map((row) => (
          <div key={row.id} className="flex items-center justify-between px-3.5 py-3">
            <div>
              <p className="text-[13px] font-medium">{row.name}</p>
              <p className="text-[12px] text-muted">{row.provider}</p>
            </div>
            <StatusBadge status={row.status} />
          </div>
        ))}
      </div>
      <p className="mt-6 text-sm text-muted">
        SpaceXAI is configured with <span className="font-mono">XAI_API_KEY</span> on the server. Keys never ship to the
        browser. Slack, Discord, GitHub, and Drive adapters can be added without rewriting workflows.
      </p>
    </div>
  );
}
