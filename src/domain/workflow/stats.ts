import type { WorkflowGraph } from "../graph";

export type WorkflowStats = {
  steps: number;
  ai: number;
  conditions: number;
  approvals: number;
};

export function graphStats(graph: WorkflowGraph): WorkflowStats {
  let ai = 0;
  let conditions = 0;
  let approvals = 0;
  for (const node of graph.nodes) {
    if (node.type.startsWith("ai.")) ai += 1;
    if (node.type === "logic.condition" || node.type === "logic.switch") conditions += 1;
    if (node.type === "human.approval" || node.type === "human.review") approvals += 1;
  }
  return { steps: graph.nodes.length, ai, conditions, approvals };
}

export function formatGraphStats(stats: WorkflowStats): string {
  const parts = [`${stats.steps} step${stats.steps === 1 ? "" : "s"}`];
  if (stats.ai) parts.push(`${stats.ai} AI operation${stats.ai === 1 ? "" : "s"}`);
  if (stats.conditions) parts.push(`${stats.conditions} condition${stats.conditions === 1 ? "" : "s"}`);
  if (stats.approvals) parts.push(`${stats.approvals} approval${stats.approvals === 1 ? "" : "s"}`);
  return parts.join(" · ");
}
