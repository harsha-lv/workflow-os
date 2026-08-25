import { eq, and } from "drizzle-orm";
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
  org: { id: string; name: string; slug: string; plan: string };
  role: MembershipRole;
};

export async function getContext(): Promise<RequestContext | null> {
  await ensureMigrated();
  await maybeSeed();
  const session = await readSession();
  if (!session) return null;
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
      org: { id: org.id, name: org.name, slug: org.slug, plan: org.plan },
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
    org: { id: org.id, name: org.name, slug: org.slug, plan: org.plan },
    role: membership.role as MembershipRole,
  };
}

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
