import type { MembershipRole } from "./graph";

export type Permission =
  | "org.read"
  | "org.update"
  | "org.delete"
  | "members.read"
  | "members.invite"
  | "members.update"
  | "members.remove"
  | "projects.read"
  | "projects.write"
  | "workflows.read"
  | "workflows.write"
  | "workflows.publish"
  | "workflows.delete"
  | "workflows.execute"
  | "executions.read"
  | "executions.cancel"
  | "approvals.decide"
  | "secrets.read"
  | "secrets.write"
  | "integrations.read"
  | "integrations.write"
  | "billing.read"
  | "billing.manage"
  | "audit.read"
  | "settings.write";

const ALL: Permission[] = [
  "org.read",
  "org.update",
  "org.delete",
  "members.read",
  "members.invite",
  "members.update",
  "members.remove",
  "projects.read",
  "projects.write",
  "workflows.read",
  "workflows.write",
  "workflows.publish",
  "workflows.delete",
  "workflows.execute",
  "executions.read",
  "executions.cancel",
  "approvals.decide",
  "secrets.read",
  "secrets.write",
  "integrations.read",
  "integrations.write",
  "billing.read",
  "billing.manage",
  "audit.read",
  "settings.write",
];

const ROLE_PERMISSIONS: Record<MembershipRole, readonly Permission[]> = {
  owner: ALL,
  admin: ALL.filter((p) => p !== "org.delete"),
  editor: [
    "org.read",
    "members.read",
    "projects.read",
    "projects.write",
    "workflows.read",
    "workflows.write",
    "workflows.publish",
    "workflows.execute",
    "executions.read",
    "executions.cancel",
    "approvals.decide",
    "secrets.read",
    "integrations.read",
    "billing.read",
    "audit.read",
  ],
  viewer: [
    "org.read",
    "members.read",
    "projects.read",
    "workflows.read",
    "executions.read",
    "billing.read",
    "audit.read",
  ],
};

export function permissionsFor(role: MembershipRole): readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}

export function can(role: MembershipRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function assertCan(role: MembershipRole, permission: Permission): void {
  if (!can(role, permission)) {
    throw new AuthorizationError(`Role '${role}' cannot perform '${permission}'`);
  }
}

export class AuthorizationError extends Error {
  readonly status = 403;
  constructor(message = "You do not have permission to do that") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export class AuthenticationError extends Error {
  readonly status = 401;
  constructor(message = "Sign in required") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class NotFoundError extends Error {
  readonly status = 404;
  constructor(message = "Not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends Error {
  readonly status = 422;
  readonly issues: unknown;
  constructor(message: string, issues?: unknown) {
    super(message);
    this.name = "ValidationError";
    this.issues = issues;
  }
}

export class ConflictError extends Error {
  readonly status = 409;
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

export class RateLimitError extends Error {
  readonly status = 429;
  constructor(message = "Too many requests") {
    super(message);
    this.name = "RateLimitError";
  }
}
