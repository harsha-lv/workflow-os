import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ensureMigrated } from "@/db/client";
import { memberships, organizations, projects, users } from "@/db/schema";
import { id } from "@/domain/ids";
import { AuthorizationError, ConflictError } from "@/domain/permissions";
import { hashPassword } from "@/server/crypto";
import { rateLimit, toErrorResponse } from "@/server/errors";
import { writeSession } from "@/server/session";
import { slugify } from "@/lib/utils";
import { maybeSeed, seedTemplates } from "@/server/seed";
import { publicSignupEnabled } from "@/server/config";

const schema = z.object({
  name: z.string().min(2).max(80),
  organization: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(10).max(200),
});

export async function POST(request: Request) {
  try {
    rateLimit(`signup:${request.headers.get("x-forwarded-for") ?? "local"}`, 8, 60_000);
    if (!publicSignupEnabled()) {
      throw new AuthorizationError("Public signup is disabled. Use the demo account provided by the operator.");
    }
    await ensureMigrated();
    await maybeSeed();
    await seedTemplates();
    const body = schema.parse(await request.json());
    const db = await ensureMigrated();
    const email = body.email.toLowerCase();
    const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
    if (existing) throw new ConflictError("An account with that email already exists.");
    const userId = id("user");
    const orgId = id("org");
    let slug = slugify(body.organization);
    const slugTaken = await db.query.organizations.findFirst({ where: eq(organizations.slug, slug) });
    if (slugTaken) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    await db.insert(users).values({
      id: userId,
      email,
      name: body.name,
      passwordHash: hashPassword(body.password),
    });
    await db.insert(organizations).values({ id: orgId, name: body.organization, slug, plan: "free" });
    await db.insert(memberships).values({
      id: id("membership"),
      organizationId: orgId,
      userId,
      role: "owner",
    });
    await db.insert(projects).values({
      id: id("project"),
      organizationId: orgId,
      name: "General",
      slug: "general",
      description: "Default project",
    });
    await writeSession(userId, orgId);
    return NextResponse.json({ redirect: "/onboarding" });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Check the form and try again." }, { status: 422 });
    }
    return toErrorResponse(error);
  }
}
