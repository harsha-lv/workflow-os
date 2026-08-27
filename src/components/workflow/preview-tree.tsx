import { getNodeDefinition } from "@/domain/nodes/definitions";
import type { WorkflowGraph } from "@/domain/graph";
import { NodeIcon } from "@/components/nodes/icon";
import { cn } from "@/lib/utils";

export function WorkflowPreviewTree({
  graph,
  className,
}: {
  graph: WorkflowGraph;
  className?: string;
}) {
  const bySource = new Map<string, typeof graph.edges>();
  for (const edge of graph.edges) {
    const list = bySource.get(edge.source) ?? [];
    list.push(edge);
    bySource.set(edge.source, list);
  }
  const targeted = new Set(graph.edges.map((e) => e.target));
  const starts = graph.nodes.filter((n) => !targeted.has(n.id));
  const start = starts[0] ?? graph.nodes[0];
  if (!start) return <p className="text-[13px] text-muted">Nothing generated yet.</p>;

  const seen = new Set<string>();
  const rows: Array<{ id: string; name: string; type: string; branch?: string; depth: number }> = [];

  function walk(id: string, depth: number, branch?: string) {
    if (seen.has(id)) return;
    seen.add(id);
    const node = graph.nodes.find((n) => n.id === id);
    if (!node) return;
    rows.push({ id, name: node.name, type: node.type, branch, depth });
    const outgoing = bySource.get(id) ?? [];
    for (const edge of outgoing) {
      walk(edge.target, depth + 1, edge.sourceHandle && edge.sourceHandle !== "out" ? edge.sourceHandle : undefined);
    }
  }
  walk(start.id, 0);

  return (
    <ol className={cn("grid gap-0", className)} aria-label="Workflow preview">
      {rows.map((row, index) => {
        const def = getNodeDefinition(row.type);
        return (
          <li key={row.id} className="flex flex-col">
            {index > 0 ? (
              <div className="flex items-center gap-2 py-1 pl-3 text-[11px] text-faint" aria-hidden>
                <span className="w-px self-stretch bg-border" />
                <span>{row.branch ? row.branch : "↓"}</span>
              </div>
            ) : null}
            <div
              className="inline-flex items-center gap-2 rounded-md border border-border bg-bg-sunken px-2.5 py-1.5"
              style={{ marginLeft: Math.min(row.depth, 4) * 12 }}
            >
              <NodeIcon name={def?.icon ?? "Sparkles"} className="size-3.5 text-faint" />
              <span className="text-[13px]">{row.name}</span>
              {row.branch ? <span className="text-[11px] capitalize text-faint">{row.branch}</span> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
