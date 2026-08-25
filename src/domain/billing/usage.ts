export const PLAN_LIMITS = {
  free: {
    label: "Free",
    executions: 1_000,
    members: 3,
    workflows: 10,
    aiTokens: 50_000,
    integrations: 2,
  },
  pro: {
    label: "Pro",
    executions: 25_000,
    members: 15,
    workflows: 100,
    aiTokens: 2_000_000,
    integrations: 25,
  },
  team: {
    label: "Team",
    executions: 150_000,
    members: 50,
    workflows: 500,
    aiTokens: 10_000_000,
    integrations: 100,
  },
  enterprise: {
    label: "Enterprise",
    executions: Number.POSITIVE_INFINITY,
    members: Number.POSITIVE_INFINITY,
    workflows: Number.POSITIVE_INFINITY,
    aiTokens: Number.POSITIVE_INFINITY,
    integrations: Number.POSITIVE_INFINITY,
  },
} as const;

export type PlanId = keyof typeof PLAN_LIMITS;

export type UsageSnapshot = {
  executions: number;
  aiTokens: number;
  emails: number;
  members: number;
  workflows: number;
  integrations: number;
};

export function usagePercent(used: number, limit: number): number {
  if (!Number.isFinite(limit) || limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

export function planOf(id: string): PlanId {
  if (id in PLAN_LIMITS) return id as PlanId;
  return "free";
}
