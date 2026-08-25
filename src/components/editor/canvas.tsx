"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  addEdge,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge,
  type Node,
  type OnSelectionChangeParams,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect } from "react";
import { createId } from "@/domain/ids";
import type { GraphEdge, GraphNode, WorkflowGraph } from "@/domain/graph";
import { WorkflowNode } from "./workflow-node";
import { useEditor } from "./store";
import { useLiveRunStatuses } from "./live-run-context";

const nodeTypes = { workflow: WorkflowNode };

function edgeClass(source?: string, target?: string): string {
  if (source === "failed" || target === "failed") return "wos-edge-error";
  if (source === "success" && (target === "running" || target === "waiting")) return "wos-edge-flow";
  if (source === "success" && target === "success") return "wos-edge-done";
  return "wos-edge-idle";
}

function toFlow(graph: WorkflowGraph, statuses: Record<string, string>): { nodes: Node[]; edges: Edge[] } {
  return {
    nodes: graph.nodes.map((node) => ({
      id: node.id,
      type: "workflow",
      position: node.position,
      data: { ...node, runStatus: statuses[node.id] },
      selected: false,
    })),
    edges: graph.edges.map((edge) => {
      const cls = edgeClass(statuses[edge.source], statuses[edge.target]);
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        label: edge.label,
        className: cls,
        animated: cls === "wos-edge-flow",
      };
    }),
  };
}

export function EditorCanvas() {
  const graph = useEditor((s) => s.graph);
  const setGraph = useEditor((s) => s.setGraph);
  const select = useEditor((s) => s.select);
  const addNode = useEditor((s) => s.addNode);
  const statuses = useLiveRunStatuses();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(toFlow(graph, statuses).nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(toFlow(graph, statuses).edges);

  useEffect(() => {
    const next = toFlow(graph, statuses);
    setNodes(next.nodes);
    setEdges(next.edges);
  }, [graph, statuses, setEdges, setNodes]);

  const persist = useCallback(
    (nextNodes: Node[], nextEdges: Edge[]) => {
      const nodesOut: GraphNode[] = nextNodes.map((n) => {
        const data = n.data as GraphNode;
        return {
          ...data,
          id: n.id,
          position: n.position,
        };
      });
      const edgesOut: GraphEdge[] = nextEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle ?? undefined,
        targetHandle: e.targetHandle ?? undefined,
        label: typeof e.label === "string" ? e.label : undefined,
      }));
      setGraph({ nodes: nodesOut, edges: edgesOut, viewport: graph.viewport }, true);
    },
    [graph.viewport, setGraph],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      const next = addEdge({ ...connection, id: createId("ed") }, edges);
      persist(nodes, next);
    },
    [edges, nodes, persist],
  );

  const onSelectionChange = useCallback(
    (params: OnSelectionChangeParams) => {
      select(params.nodes.map((n) => n.id));
    },
    [select],
  );

  return (
    <div className="h-full min-h-[420px] w-full bg-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={{
          className: "wos-edge-idle",
          type: "default",
          style: { stroke: "var(--edge)", strokeWidth: 1.5 },
        }}
        connectionLineStyle={{ stroke: "var(--edge-active)", strokeWidth: 1.6 }}
        onNodesChange={(changes) => {
          onNodesChange(changes);
          const moved = changes.some((c) => c.type === "position" && c.dragging === false);
          const removed = changes.some((c) => c.type === "remove");
          if (moved || removed) {
            // apply after React Flow state updates on next tick
            queueMicrotask(() => {
              persist(
                // read from latest via functional access is not available; reconstruct from graph + changes
                nodes.map((n) => {
                  const change = changes.find((c) => "id" in c && c.id === n.id);
                  if (change && change.type === "position" && change.position) {
                    return { ...n, position: change.position };
                  }
                  return n;
                }).filter((n) => !changes.some((c) => c.type === "remove" && "id" in c && c.id === n.id)),
                edges.filter((e) => !changes.some((c) => c.type === "remove" && "id" in c && c.id === e.id)),
              );
            });
          }
        }}
        onEdgesChange={(changes) => {
          onEdgesChange(changes);
          if (changes.some((c) => c.type === "remove")) {
            queueMicrotask(() => {
              persist(
                nodes,
                edges.filter((e) => !changes.some((c) => c.type === "remove" && "id" in c && c.id === e.id)),
              );
            });
          }
        }}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        onPaneClick={() => select([])}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
        }}
        onDrop={(event) => {
          event.preventDefault();
          const type = event.dataTransfer.getData("application/workflow-os-node");
          if (!type) return;
          addNode(type, { x: event.clientX - 360, y: event.clientY - 140 });
        }}
        fitView
        minZoom={0.25}
        maxZoom={1.6}
        multiSelectionKeyCode="Shift"
        deleteKeyCode={["Backspace", "Delete"]}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="var(--border)" />
        <MiniMap pannable zoomable />
        <Controls />
      </ReactFlow>
    </div>
  );
}
