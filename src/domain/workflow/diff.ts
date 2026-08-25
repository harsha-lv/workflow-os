import type { WorkflowGraph } from "../graph";

export type GraphChange = { kind: "added" | "removed" | "changed"; label: string };

export function diffGraphs(from: WorkflowGraph | undefined, to: WorkflowGraph): GraphChange[] {
  if (!from) {
    return to.nodes.map((n) => ({ kind: "added" as const, label: n.name }));
  }
  const prev = new Map(from.nodes.map((n) => [n.id, n]));
  const next = new Map(to.nodes.map((n) => [n.id, n]));
  const changes: GraphChange[] = [];
  for (const node of to.nodes) {
    const older = prev.get(node.id);
    if (!older) changes.push({ kind: "added", label: node.name });
    else if (JSON.stringify(older.config) !== JSON.stringify(node.config) || older.type !== node.type) {
      changes.push({ kind: "changed", label: node.name });
    }
  }
  for (const node of from.nodes) {
    if (!next.has(node.id)) changes.push({ kind: "removed", label: node.name });
  }
  return changes;
}
