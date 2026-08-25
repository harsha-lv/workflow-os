"use client";

import { useMemo, useState } from "react";
import { nodeCategories, nodeDefinitions } from "@/domain/nodes/definitions";
import { NodeIcon } from "@/components/nodes/icon";
import { useEditor } from "./store";

export function NodePicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addNode = useEditor((s) => s.addNode);
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const groups = useMemo(() => {
    return nodeCategories
      .map((category) => ({
        ...category,
        items: nodeDefinitions.filter((d) => {
          if (d.category !== category.id) return false;
          if (!query) return true;
          return `${d.name} ${d.type} ${d.description} ${d.category}`.toLowerCase().includes(query);
        }),
      }))
      .filter((g) => g.items.length > 0);
  }, [query]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button type="button" className="command-overlay absolute inset-0" aria-label="Close node picker" onClick={onClose} />
      <div className="command-panel fixed left-1/2 top-[14%] z-50 w-[min(480px,calc(100vw-2rem))] overflow-hidden rounded-[var(--radius)] border border-border bg-bg-elevated shadow-[var(--shadow)]">
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Add a node…"
          className="h-11 w-full border-b border-border bg-transparent px-3.5 text-[13px] outline-none"
        />
        <div className="max-h-80 overflow-y-auto p-2">
          {groups.length === 0 ? <p className="px-2 py-6 text-[13px] text-muted">No nodes match.</p> : null}
          {groups.map((group) => (
            <div key={group.id} className="mb-2">
              <p className="section-label px-2 py-1">{group.label}</p>
              {group.items.map((def) => (
                <button
                  key={def.type}
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-surface-hover"
                  onClick={() => {
                    addNode(def.type, { x: 180, y: 160 });
                    onClose();
                  }}
                >
                  <span className="flex size-6 items-center justify-center rounded-md border border-border bg-bg-sunken">
                    <NodeIcon name={def.icon} />
                  </span>
                  <span>
                    <span className="block text-[13px]">{def.name}</span>
                    <span className="text-[11px] text-faint">{def.description}</span>
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
