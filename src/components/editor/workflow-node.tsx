"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { getNodeDefinition } from "@/domain/nodes/definitions";
import { nodeConfigured } from "@/domain/workflow/validate";
import { NodeIcon } from "@/components/nodes/icon";
import { cn } from "@/lib/utils";
import type { GraphNode } from "@/domain/graph";

export type FlowNodeData = GraphNode & { selected?: boolean; runStatus?: string };

export function WorkflowNode({ data, selected }: NodeProps) {
  const node = data as unknown as FlowNodeData;
  const def = getNodeDefinition(node.type);
  const configured = nodeConfigured(node);
  const status = node.runStatus ?? (node.disabled ? "disabled" : configured ? "configured" : "idle");
  return (
    <div
      className={cn(
        "wos-node min-w-[236px] rounded-[6px] border px-3 py-2.5",
        def?.category === "trigger" && "is-trigger",
        def?.category === "ai" && "is-ai",
        def?.category === "logic" && "is-logic",
        def?.category === "human" && "is-human",
        def?.category === "communication" && "is-communication",
        def?.category === "output" && "is-output",
        selected && "is-selected",
        status === "error" || status === "failed" ? "is-error" : null,
        status === "success" && "is-success",
        status === "running" && "is-running",
        status === "waiting" && "is-waiting",
        node.disabled && "opacity-50",
      )}
    >
      {!def?.isTrigger ? (
        <Handle type="target" position={Position.Left} className="!size-2.5 !border-border !bg-text" />
      ) : null}
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md border border-border bg-bg-sunken text-muted">
          <NodeIcon name={def?.icon ?? "Sparkles"} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.08em] text-faint">{def?.category ?? "node"}</p>
          <p className="mt-0.5 truncate text-[13px] font-medium leading-tight">{node.name}</p>
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <span
          className={cn(
            "status-dot size-1.5 rounded-full",
            status === "success" && "bg-success",
            (status === "error" || status === "failed") && "bg-danger",
            status === "running" && "is-running bg-info",
            status === "waiting" && "bg-warning",
            (status === "idle" || status === "configured" || status === "pending") && "bg-faint",
            status === "disabled" && "bg-border-strong",
          )}
        />
        <span className="text-[10px] capitalize text-faint">{status}</span>
      </div>
      {(def?.outputs ?? [{ id: "out" }]).map((port, index) => (
        <Handle
          key={port.id}
          id={port.id}
          type="source"
          position={Position.Right}
          style={{ top: 22 + index * 14 }}
          className="!size-2.5 !border-border !bg-text"
        />
      ))}
    </div>
  );
}
