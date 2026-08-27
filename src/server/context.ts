import { cache } from "react";
import { eq, and } from "drizzle-orm";
import { connection } from "next/server";
import { ensureMigrated } from "@/db/client";
import { memberships, organizations, users } from "@/db/schema";
import type { MembershipRole } from "@/domain/graph";
import {
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  type Permission,
  can,
} from "@/domain/permissions";
import { readSession } from "./session";
import { maybeSeed } from "@/server/seed";

export type RequestContext = {
  user: { id: string; email: string; name: string; onboardedAt: Date | null };
  org: { id: string; name: string; slug: string; plan: string; isDemo: boolean };
  role: MembershipRole;
};

export const getContext = cache(async (): Promise<RequestContext | null> => {
  // Opt out of prerender before any filesystem/DB work. Vercel `next build`
  // has no session and must not open SQLite or Postgres.
  await connection();
  const session = await readSession();
  if (!session) return null;
  await maybeSeed();
  const db = await ensureMigrated();
  const user = await db.query.users.findFirst({ where: eq(users.id, session.userId) });
  if (!user) return null;
  if (!session.orgId) {
    const membership = await db.query.memberships.findFirst({
      where: eq(memberships.userId, user.id),
    });
    if (!membership) return null;
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, membership.organizationId),
    });
    if (!org) return null;
    return {
      user: { id: user.id, email: user.email, name: user.name, onboardedAt: user.onboardedAt },
      org: { id: org.id, name: org.name, slug: org.slug, plan: org.plan, isDemo: Boolean(org.isDemo) },
      role: membership.role as MembershipRole,
    };
  }
  const membership = await db.query.memberships.findFirst({
    where: and(eq(memberships.userId, user.id), eq(memberships.organizationId, session.orgId)),
  });
  if (!membership) throw new AuthorizationError("You are not a member of this workspace");
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, membership.organizationId),
  });
  if (!org) throw new NotFoundError("Workspace not found");
  return {
    user: { id: user.id, email: user.email, name: user.name, onboardedAt: user.onboardedAt },
    org: { id: org.id, name: org.name, slug: org.slug, plan: org.plan, isDemo: Boolean(org.isDemo) },
    role: membership.role as MembershipRole,
  };
});

export async function requireContext(): Promise<RequestContext> {
  const ctx = await getContext();
  if (!ctx) throw new AuthenticationError();
  return ctx;
}

export async function requirePermission(permission: Permission): Promise<RequestContext> {
  const ctx = await requireContext();
  if (!can(ctx.role, permission)) {
    throw new AuthorizationError();
  }
  return ctx;
}
