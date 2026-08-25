"use client";

import { getNodeDefinition } from "@/domain/nodes/definitions";
import type { GraphNode } from "@/domain/graph";

function pathsFor(node: GraphNode): string[] {
  const def = getNodeDefinition(node.type);
  const props = Object.keys(def?.outputSchema.properties ?? {});
  const base = [`nodes.${node.id}`];
  return props.length ? props.map((p) => `nodes.${node.id}.${p}`) : base;
}

export function DataTree({
  nodes,
  currentId,
  onInsert,
}: {
  nodes: GraphNode[];
  currentId: string;
  onInsert: (expr: string) => void;
}) {
  const upstream = nodes.filter((n) => n.id !== currentId);
  return (
    <div className="mt-4">
      <p className="section-label">Available data</p>
      <div className="mt-2 rounded-md border border-border bg-bg-sunken p-2">
        <button type="button" className="block w-full rounded px-1.5 py-1 text-left font-mono text-[11px] hover:bg-surface-hover" onClick={() => onInsert("{{trigger}}")}>
          trigger
        </button>
        {upstream.length === 0 ? <p className="px-1.5 py-1 text-[11px] text-faint">No upstream nodes yet.</p> : null}
        {upstream.map((node) => (
          <div key={node.id} className="mt-1">
            <p className="px-1.5 text-[11px] text-muted">{node.name}</p>
            {pathsFor(node).map((path) => (
              <button
                key={path}
                type="button"
                className="block w-full rounded px-1.5 py-0.5 text-left font-mono text-[11px] hover:bg-surface-hover"
                onClick={() => onInsert(`{{${path}}}`)}
              >
                {path}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
