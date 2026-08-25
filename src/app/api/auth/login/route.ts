import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureMigrated } from "@/db/client";
import { memberships, users } from "@/db/schema";
import { verifyPassword } from "@/server/crypto";
import { rateLimit, toErrorResponse } from "@/server/errors";
import { writeSession } from "@/server/session";
import { ValidationError } from "@/domain/permissions";
import { maybeSeed } from "@/server/seed";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    rateLimit(`login:${request.headers.get("x-forwarded-for") ?? "local"}`, 10, 60_000);
    await ensureMigrated();
    await maybeSeed();
    const body = schema.parse(await request.json());
    const db = await ensureMigrated();
    const user = await db.query.users.findFirst({
      where: eq(users.email, body.email.toLowerCase()),
    });
    if (!user || !verifyPassword(body.password, user.passwordHash)) {
      throw new ValidationError("Email or password is incorrect.");
    }
    const membership = await db.query.memberships.findFirst({
      where: eq(memberships.userId, user.id),
    });
    await writeSession(user.id, membership?.organizationId ?? null);
    return NextResponse.json({ redirect: user.onboardedAt ? "/dashboard" : "/onboarding" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Check the form and try again." }, { status: 422 });
    }
    return toErrorResponse(error);
  }
}
