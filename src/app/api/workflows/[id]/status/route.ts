import { NextResponse } from "next/server";
import { requirePermission } from "@/server/context";
import { toErrorResponse } from "@/server/errors";
import { setWorkflowStatus } from "@/server/services/workflows";
import type { WorkflowStatus } from "@/domain/graph";
import { ValidationError } from "@/domain/permissions";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requirePermission("workflows.publish");
    const { id } = await params;
    const body = (await request.json()) as { status?: WorkflowStatus };
    if (body.status !== "paused" && body.status !== "published" && body.status !== "archived") {
      throw new ValidationError("Unsupported status.");
    }
    await setWorkflowStatus(ctx.org.id, ctx.user.id, id, body.status);
    return NextResponse.json({ ok: true, status: body.status });
  } catch (error) {
    return toErrorResponse(error);
  }
}
