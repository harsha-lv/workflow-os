import type { GraphEdge, GraphNode, ValidationIssue, ValidationResult, WorkflowGraph } from "../graph";
import { getNodeDefinition } from "../nodes/definitions";
import { collectExpressionRefs, ExprRuntimeError } from "../expressions/evaluate";
import { ExprSyntaxError, parseExpression, isTemplate } from "../expressions/parser";

function incoming(graph: WorkflowGraph, nodeId: string): GraphEdge[] {
  return graph.edges.filter((e) => e.target === nodeId);
}

function outgoing(graph: WorkflowGraph, nodeId: string): GraphEdge[] {
  return graph.edges.filter((e) => e.source === nodeId);
}

export function topologicalOrder(graph: WorkflowGraph): string[] {
  const nodes = new Map(graph.nodes.map((n) => [n.id, n]));
  const indegree = new Map<string, number>();
  for (const node of graph.nodes) indegree.set(node.id, 0);
  for (const edge of graph.edges) {
    if (!nodes.has(edge.source) || !nodes.has(edge.target)) continue;
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
  }
  const queue = [...indegree.entries()].filter(([, d]) => d === 0).map(([id]) => id);
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const edge of outgoing(graph, id)) {
      const next = (indegree.get(edge.target) ?? 1) - 1;
      indegree.set(edge.target, next);
      if (next === 0) queue.push(edge.target);
    }
  }
  return order;
}

export function hasCycle(graph: WorkflowGraph): boolean {
  return topologicalOrder(graph).length !== graph.nodes.length;
}

function requiredMissing(node: GraphNode): string[] {
  const def = getNodeDefinition(node.type);
  if (!def) return [`Unknown node type '${node.type}'`];
  const missing: string[] = [];
  for (const field of def.configFields) {
    if (!field.required) continue;
    const value = node.config[field.key];
    if (value == null || value === "") missing.push(`${field.label} is required`);
  }
  return missing;
}

export function validateGraph(graph: WorkflowGraph): ValidationResult {
  const issues: ValidationIssue[] = [];
  const ids = new Set<string>();

  if (graph.nodes.length === 0) {
    issues.push({ severity: "warning", message: "Add a trigger to start this workflow." });
  }

  const triggers = graph.nodes.filter((n) => getNodeDefinition(n.type)?.isTrigger);
  if (triggers.length === 0) {
    issues.push({ severity: "error", message: "A workflow needs at least one trigger." });
  }
  if (triggers.length > 1) {
    issues.push({
      severity: "warning",
      message: "Multiple triggers are allowed, but each run still starts from a single trigger event.",
    });
  }

  for (const node of graph.nodes) {
    if (ids.has(node.id)) {
      issues.push({ severity: "error", nodeId: node.id, message: "Duplicate node id." });
    }
    ids.add(node.id);
    const def = getNodeDefinition(node.type);
    if (!def) {
      issues.push({ severity: "error", nodeId: node.id, message: `Unknown node type '${node.type}'.` });
      continue;
    }
    for (const msg of requiredMissing(node)) {
      issues.push({ severity: "error", nodeId: node.id, path: "config", message: msg });
    }
    if (!def.isTrigger && incoming(graph, node.id).length === 0) {
      issues.push({
        severity: "warning",
        nodeId: node.id,
        message: `${node.name} is not connected to an upstream node.`,
      });
    }
  }

  const nodeIds = new Set(graph.nodes.map((n) => n.id));
  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      issues.push({
        severity: "error",
        edgeId: edge.id,
        message: "Edge points at a missing node.",
      });
    }
    if (edge.source === edge.target) {
      issues.push({ severity: "error", edgeId: edge.id, message: "Self-loops are not allowed." });
    }
  }

  if (hasCycle(graph)) {
    issues.push({ severity: "error", message: "This workflow contains a cycle." });
  }

  const reachable = new Set(topologicalOrder(graph));
  const knownRefs = new Set(["trigger", "vars", "env", "input", "now", "nodes"]);
  for (const node of graph.nodes) {
    knownRefs.add(node.id);
    knownRefs.add(node.name);
  }

  for (const node of graph.nodes) {
    if (!reachable.has(node.id) && graph.nodes.length > 0) {
      issues.push({
        severity: "warning",
        nodeId: node.id,
        message: `${node.name} is unreachable from the trigger.`,
      });
    }
    const def = getNodeDefinition(node.type);
    if (def && !def.isTrigger && outgoing(graph, node.id).length === 0 && incoming(graph, node.id).length > 0) {
      if (!node.type.startsWith("output.") && node.type !== "comm.email" && node.type !== "comm.notification") {
        issues.push({
          severity: "warning",
          nodeId: node.id,
          message: `${node.name} has no downstream connection.`,
        });
      }
    }
    if ((node.type === "data.http" || node.type.startsWith("ai.") || node.type === "comm.email") && !node.errorPolicy) {
      issues.push({
        severity: "warning",
        nodeId: node.id,
        message: `${node.name} has no error policy. Failures will stop the workflow.`,
      });
    }
    for (const [key, raw] of Object.entries(node.config)) {
      if (typeof raw !== "string") continue;
      if (!raw.includes("{{") && !raw.includes("==") && !raw.includes(".")) continue;
      const candidate = isTemplate(raw) || key === "expression" || key === "value" || key === "prompt" || key === "url";
      if (!candidate) continue;
      try {
        if (isTemplate(raw) || key === "expression") {
          if (key === "expression") parseExpression(raw);
          const refs = collectExpressionRefs(raw);
          for (const ref of refs) {
            const root = ref.split(".")[0] ?? "";
            if (root && !knownRefs.has(root) && root !== "nodes") {
              issues.push({
                severity: "error",
                nodeId: node.id,
                path: key,
                message: `${node.name} references unavailable data '${ref}'.`,
              });
            }
          }
        }
      } catch (error) {
        if (error instanceof ExprSyntaxError || error instanceof ExprRuntimeError) {
          issues.push({
            severity: "error",
            nodeId: node.id,
            path: key,
            message: `${node.name} has an invalid expression: ${error.message}`,
          });
        }
      }
    }
  }

  return { ok: issues.every((i) => i.severity !== "error"), issues };
}

export function nodeConfigured(node: GraphNode): boolean {
  return requiredMissing(node).length === 0;
}
