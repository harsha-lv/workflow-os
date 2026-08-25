import { NextResponse } from "next/server";
import { requirePermission } from "@/server/context";
import { toErrorResponse } from "@/server/errors";
import { attention, tokenCost } from "@/server/services/ops";

export async function GET() {
  try {
    const ctx = await requirePermission("executions.read");
    const data = await attention(ctx.org.id);
    const cost = await tokenCost(ctx.org.id);
    return NextResponse.json({ ...data, cost });
  } catch (error) {
    return toErrorResponse(error);
  }
}
