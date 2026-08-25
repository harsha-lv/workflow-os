import type { WorkflowGraph } from "../graph";
import { getNodeDefinition } from "../nodes/definitions";
import type { WorkflowHealth } from "../ops/health";
import type { ValidationIssue } from "../graph";

export type Suggestion = {
  id: string;
  title: string;
  detail: string;
  nodeId?: string;
};

export function suggestWorkflow(graph: WorkflowGraph, health?: WorkflowHealth | null): Suggestion[] {
  const out: Suggestion[] = [];
  const types = graph.nodes.map((n) => n.type);
  const hasHttp = types.some((t) => t === "data.http");
  const hasAi = types.some((t) => t.startsWith("ai."));
  const hasErrorPolicy = graph.nodes.some((n) => n.errorPolicy);
  if (hasHttp && hasAi && !hasErrorPolicy) {
    const http = graph.nodes.find((n) => n.type === "data.http");
    out.push({
      id: "error-handling",
      title: "Add error handling?",
      detail: "This path calls AI and HTTP without an error policy. Failures will stop the run.",
      nodeId: http?.id,
    });
  }
  const aiNodes = graph.nodes.filter((n) => n.type.startsWith("ai."));
  if (aiNodes.length >= 2) {
    out.push({
      id: "combine-ai",
      title: "Consecutive AI steps",
      detail: "This workflow has multiple AI nodes. Combining extraction and classification can reduce latency and cost if the tasks overlap.",
      nodeId: aiNodes[1]?.id,
    });
  }
  if (health && health.sample > 0 && health.averageMs && health.averageMs > 5000 && health.insight) {
    out.push({
      id: "latency",
      title: "High average latency",
      detail: health.insight,
    });
  }
  if (health && health.failureRate != null && health.failureRate > 0 && health.sample >= 3) {
    out.push({
      id: "reliability",
      title: "Reliability",
      detail: `This workflow failed ${Math.round(health.failureRate * 100)}% of completed runs (${health.sample} sampled).`,
    });
  }
  for (const node of graph.nodes) {
    const def = getNodeDefinition(node.type);
    if (def && !def.isTrigger && graph.edges.every((e) => e.target !== node.id && e.source !== node.id)) {
      out.push({
        id: `orphan-${node.id}`,
        title: `${node.name} is disconnected`,
        detail: "Connect it or remove it before publishing.",
        nodeId: node.id,
      });
    }
  }
  return out.slice(0, 5);
}

export function formatValidationHeadline(issues: ValidationIssue[]): string {
  const errors = issues.filter((i) => i.severity === "error");
  if (errors.length === 0) return "Ready to publish";
  return `${errors.length} issue${errors.length === 1 ? "" : "s"} need attention`;
}
