import { NextResponse } from "next/server";
import { ensureMigrated, databaseUrl } from "@/db/client";
import { isPostgresUrl } from "@/server/config";

export async function GET() {
  try {
    await ensureMigrated();
    return NextResponse.json({
      ok: true,
      service: "workflow-os",
      db: isPostgresUrl(databaseUrl()) ? "postgres" : "sqlite",
    });
  } catch {
    return NextResponse.json({ ok: false, service: "workflow-os" }, { status: 503 });
  }
}
