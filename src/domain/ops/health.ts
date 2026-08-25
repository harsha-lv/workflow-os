export type HealthSignal = "healthy" | "degraded" | "failing" | "inactive" | "unknown";

export type WorkflowHealth = {
  signal: HealthSignal;
  score: number | null;
  sample: number;
  successRate: number | null;
  failureRate: number | null;
  averageMs: number | null;
  insight: string;
};

export type ExecutionSummary = {
  status: string;
  durationMs: number | null;
  createdAt: Date;
  errorNodeId?: string | null;
};

export function computeHealth(runs: ExecutionSummary[], nodeDurations?: Array<{ name: string; ms: number }>): WorkflowHealth {
  const completed = runs.filter((r) =>
    r.status === "success" || r.status === "failed" || r.status === "cancelled" || r.status === "timed_out",
  );
  const sample = completed.length;
  if (sample === 0) {
    return {
      signal: "inactive",
      score: null,
      sample: 0,
      successRate: null,
      failureRate: null,
      averageMs: null,
      insight: "Not enough executions yet to score this workflow.",
    };
  }
  const success = completed.filter((r) => r.status === "success").length;
  const failed = completed.filter((r) => r.status === "failed").length;
  const successRate = success / sample;
  const failureRate = failed / sample;
  const timed = completed.filter((r) => r.durationMs != null);
  const averageMs =
    timed.length > 0 ? Math.round(timed.reduce((sum, r) => sum + (r.durationMs ?? 0), 0) / timed.length) : null;
  const recentFail = completed.slice(0, Math.min(5, sample)).filter((r) => r.status === "failed").length;
  let score = Math.round(successRate * 100);
  if (recentFail >= 2) score = Math.max(0, score - 12);
  let signal: HealthSignal = "healthy";
  if (failureRate >= 0.25 || recentFail >= 3) signal = "failing";
  else if (failureRate >= 0.08 || recentFail >= 1) signal = "degraded";
  const slowest = [...(nodeDurations ?? [])].sort((a, b) => b.ms - a.ms)[0];
  const insight = slowest
    ? `${slowest.name} accounts for the largest share of observed step time.`
    : failureRate > 0
      ? `${Math.round(failureRate * 1000) / 10}% of sampled runs failed.`
      : `${Math.round(successRate * 1000) / 10}% of sampled runs succeeded.`;
  return { signal, score, sample, successRate, failureRate, averageMs, insight };
}

export const TOKEN_COST = {
  inputPerMillion: 2,
  outputPerMillion: 6,
} as const;

export function estimateUsd(inputTokens: number, outputTokens: number): number {
  return (inputTokens / 1_000_000) * TOKEN_COST.inputPerMillion + (outputTokens / 1_000_000) * TOKEN_COST.outputPerMillion;
}
