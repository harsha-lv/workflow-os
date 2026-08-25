"use client";

import {
  Background,
  BackgroundVariant,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useMemo } from "react";
import type { WorkflowGraph } from "@/domain/graph";
import { WorkflowNode } from "@/components/editor/workflow-node";

const nodeTypes = { workflow: WorkflowNode };

function edgeClass(sourceStatus?: string, targetStatus?: string): string {
  if (sourceStatus === "failed" || targetStatus === "failed") return "wos-edge-error";
  if (sourceStatus === "success" && (targetStatus === "running" || targetStatus === "waiting")) {
    return "wos-edge-flow";
  }
  if (sourceStatus === "success" && targetStatus === "success") return "wos-edge-done";
  return "wos-edge-idle";
}

export function ExecutionGraph({
  graph,
  statusByNode,
  onSelect,
}: {
  graph: WorkflowGraph;
  statusByNode: Map<string, string>;
  onSelect?: (nodeId: string) => void;
}) {
  const nodes = useMemo<Node[]>(
    () =>
      graph.nodes.map((node) => ({
        id: node.id,
        type: "workflow",
        position: node.position,
        data: { ...node, runStatus: statusByNode.get(node.id) ?? "pending" },
        draggable: false,
      })),
    [graph.nodes, statusByNode],
  );

  const edges = useMemo<Edge[]>(
    () =>
      graph.edges.map((edge) => {
        const cls = edgeClass(statusByNode.get(edge.source), statusByNode.get(edge.target));
        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          sourceHandle: edge.sourceHandle,
          targetHandle: edge.targetHandle,
          className: cls,
          animated: cls === "wos-edge-flow",
        };
      }),
    [graph.edges, statusByNode],
  );

  if (graph.nodes.length === 0) return null;

  return (
    <div className="mb-6 h-[280px] overflow-hidden rounded-[var(--radius)] border border-border bg-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        panOnScroll
        nodesConnectable={false}
        elementsSelectable
        onNodeClick={(_, node) => onSelect?.(node.id)}
        proOptions={{ hideAttribution: true }}
        minZoom={0.3}
        maxZoom={1.4}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--border)" />
        <MiniMap pannable zoomable />
      </ReactFlow>
    </div>
  );
}
