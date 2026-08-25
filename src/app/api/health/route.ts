import { NextResponse } from "next/server";
import { ensureMigrated } from "@/db/client";

export async function GET() {
  await ensureMigrated();
  return NextResponse.json({ ok: true, service: "workflow-os" });
}
