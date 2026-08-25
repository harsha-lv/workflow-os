import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { ensureMigrated } from "@/db/client";
import { workflows } from "@/db/schema";
import { enqueueExecution, runPersistedExecution } from "@/server/services/executions";
import { rateLimit, toErrorResponse } from "@/server/errors";
import { NotFoundError } from "@/domain/permissions";

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    rateLimit(`webhook:${token}`, 60, 60_000);
    const db = await ensureMigrated();
    const workflow = await db.query.workflows.findFirst({ where: eq(workflows.webhookToken, token) });
    if (!workflow || workflow.status === "archived") throw new NotFoundError("Unknown webhook");
    if (workflow.status === "paused") {
      return NextResponse.json(
        { error: "Workflow is paused. The event was not discarded; send it again after resume.", code: "Paused" },
        { status: 423 },
      );
    }
    const body = await request.json().catch(() => ({}));
    const url = new URL(request.url);
    const query = Object.fromEntries(url.searchParams.entries());
    const headers: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      if (key.toLowerCase() === "authorization") return;
      headers[key] = value;
    });
    const executionId = await enqueueExecution({
      orgId: workflow.organizationId,
      workflowId: workflow.id,
      triggerType: "webhook",
      payload: { method: "POST", headers, query, body },
      version: "published",
    });
    void runPersistedExecution(executionId);
    return NextResponse.json({ id: executionId, status: "queued" });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = await ensureMigrated();
  const workflow = await db.query.workflows.findFirst({ where: eq(workflows.webhookToken, token) });
  if (!workflow) return NextResponse.json({ error: "Unknown webhook" }, { status: 404 });
  return NextResponse.json({ ok: true, workflow: workflow.name });
}
