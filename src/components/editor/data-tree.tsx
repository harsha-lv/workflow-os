"use client";

import { getNodeDefinition } from "@/domain/nodes/definitions";
import type { GraphNode } from "@/domain/graph";

function propsFor(node: GraphNode): string[] {
  const def = getNodeDefinition(node.type);
  return Object.keys(def?.outputSchema.properties ?? {});
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
    <div className="mt-3">
      <p className="section-label">Available data</p>
      <div className="mt-2 rounded-md border border-border bg-bg-sunken p-2">
        <p className="px-1.5 text-[11px] text-muted">Webhook / trigger</p>
        {["body", "body.email", "body.name", "body.company"].map((path) => (
          <button
            key={path}
            type="button"
            className="block w-full rounded px-1.5 py-1 text-left font-mono text-[11px] hover:bg-surface-hover"
            onClick={() => onInsert(`{{trigger.${path}}}`)}
          >
            └── {path}
          </button>
        ))}
        {upstream.length === 0 ? <p className="px-1.5 py-1 text-[11px] text-faint">No upstream nodes yet.</p> : null}
        {upstream.map((node) => {
          const props = propsFor(node);
          return (
            <div key={node.id} className="mt-2">
              <p className="px-1.5 text-[11px] text-muted">{node.name}</p>
              <button
                type="button"
                className="block w-full rounded px-1.5 py-1 text-left font-mono text-[11px] hover:bg-surface-hover"
                onClick={() => onInsert(`{{nodes.${node.id}}}`)}
              >
                └── result
              </button>
              {props.map((prop) => (
                <button
                  key={prop}
                  type="button"
                  className="block w-full rounded px-1.5 py-1 text-left font-mono text-[11px] hover:bg-surface-hover"
                  onClick={() => onInsert(`{{nodes.${node.id}.${prop}}}`)}
                >
                  └── {prop}
                </button>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
