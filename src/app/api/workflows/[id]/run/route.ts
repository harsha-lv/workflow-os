import { NextResponse } from "next/server";
import { requirePermission } from "@/server/context";
import { toErrorResponse } from "@/server/errors";
import { enqueueExecution, runPersistedExecution } from "@/server/services/executions";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requirePermission("workflows.execute");
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as {
      version?: "draft" | "published";
      input?: unknown;
      triggerType?: string;
    };
    const triggerType = body.triggerType === "test" ? "test" : "manual";
    const executionId = await enqueueExecution({
      orgId: ctx.org.id,
      userId: ctx.user.id,
      workflowId: id,
      triggerType,
      payload: body.input ?? { source: triggerType },
      version: body.version ?? "published",
    });
    // Kick the run immediately so local usage does not wait for the poller,
    // while still leaving the worker as the production path.
    void runPersistedExecution(executionId);
    return NextResponse.json({ id: executionId });
  } catch (error) {
    return toErrorResponse(error);
  }
}
