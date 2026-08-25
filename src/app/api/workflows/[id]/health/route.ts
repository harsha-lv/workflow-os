import { NextResponse } from "next/server";
import { requirePermission } from "@/server/context";
import { toErrorResponse } from "@/server/errors";
import { tokenCost, workflowHealth } from "@/server/services/ops";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requirePermission("executions.read");
    const { id } = await params;
    const health = await workflowHealth(ctx.org.id, id);
    const cost = await tokenCost(ctx.org.id, id);
    return NextResponse.json({ health, cost });
  } catch (error) {
    return toErrorResponse(error);
  }
}
