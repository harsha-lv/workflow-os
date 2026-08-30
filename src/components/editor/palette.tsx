"use client";

import { nodeCategories, nodeDefinitions } from "@/domain/nodes/definitions";
import { NodeIcon } from "@/components/nodes/icon";
import { useEditor } from "./store";

export function NodePalette() {
  const addNode = useEditor((s) => s.addNode);
  return (
    <aside className="hidden w-60 shrink-0 overflow-y-auto border-r border-border bg-bg-elevated/80 p-3 backdrop-blur-xl lg:block">
      <p className="section-label px-1.5">Nodes</p>
      {nodeCategories.map((category) => (
        <div key={category.id} className="mt-3">
          <p className="px-1.5 text-[11px] text-faint">{category.label}</p>
          <div className="mt-1 grid gap-px">
            {nodeDefinitions
              .filter((d) => d.category === category.id)
              .map((def) => (
                <button
                  key={def.type}
                  type="button"
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData("application/workflow-os-node", def.type);
                    event.dataTransfer.effectAllowed = "move";
                  }}
                  onClick={() => addNode(def.type, { x: 160, y: 140 })}
                  className="flex items-start gap-2 rounded-md px-1.5 py-1.5 text-left transition-[background-color] duration-[var(--duration-fast)] ease-[var(--ease)] hover:bg-surface-hover"
                >
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border border-border bg-bg-sunken text-muted">
                    <NodeIcon name={def.icon} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] leading-tight">{def.name}</span>
                    <span className="mt-0.5 line-clamp-1 text-[11px] text-faint">{def.description}</span>
                  </span>
                </button>
              ))}
          </div>
        </div>
      ))}
    </aside>
  );
}
