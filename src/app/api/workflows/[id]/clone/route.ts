import { NextResponse } from "next/server";
import { requirePermission } from "@/server/context";
import { toErrorResponse } from "@/server/errors";
import { cloneWorkflow } from "@/server/services/workflows";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requirePermission("workflows.write");
    const { id } = await params;
    const workflowId = await cloneWorkflow(ctx.org.id, ctx.user.id, id);
    return NextResponse.json({ id: workflowId });
  } catch (error) {
    return toErrorResponse(error);
  }
}
