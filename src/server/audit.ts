import { id } from "@/domain/ids";
import { ensureMigrated } from "@/db/client";
import { auditLogs } from "@/db/schema";

export async function writeAudit(input: {
  organizationId: string;
  userId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const db = await ensureMigrated();
  await db.insert(auditLogs).values({
    id: id("audit"),
    organizationId: input.organizationId,
    userId: input.userId ?? null,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId ?? null,
    metadata: input.metadata,
  });
}
