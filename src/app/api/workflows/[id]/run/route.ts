import { NextResponse } from "next/server";
import { requirePermission } from "@/server/context";
import { toErrorResponse } from "@/server/errors";
import { enqueueExecution, kickExecution } from "@/server/services/executions";

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
    kickExecution(executionId);
    return NextResponse.json({ id: executionId, status: "queued" });
  } catch (error) {
    return toErrorResponse(error);
  }
}
