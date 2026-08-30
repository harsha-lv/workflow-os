import { NextResponse } from "next/server";
import { requirePermission } from "@/server/context";
import { toErrorResponse } from "@/server/errors";
import { verifyExecution } from "@/server/services/receipts";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requirePermission("executions.read");
    const { id } = await params;
    const result = await verifyExecution(id, ctx.org.id);
    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return POST(request, ctx);
}
