import { NextResponse } from "next/server";
import { publicVerificationView, verifyExecution } from "@/server/services/receipts";
import { rateLimit } from "@/server/errors";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    rateLimit(`verify:${request.headers.get("x-forwarded-for") ?? "local"}`, 30, 60_000);
    const { id } = await params;
    if (!id || id.length < 8 || id.length > 80) {
      return NextResponse.json({ error: "Unknown proof." }, { status: 404 });
    }
    const result = await verifyExecution(id, undefined, { audit: false });
    return NextResponse.json(publicVerificationView(result));
  } catch {
    return NextResponse.json({ error: "Unknown proof." }, { status: 404 });
  }
}
