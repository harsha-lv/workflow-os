"use client";

import { create } from "zustand";
import type { GraphEdge, GraphNode, ValidationIssue, WorkflowGraph } from "@/domain/graph";
import { emptyGraph } from "@/domain/graph";
import { validateGraph } from "@/domain/workflow/validate";
import { getNodeDefinition } from "@/domain/nodes/definitions";
import { createId } from "@/domain/ids";

type History = {
  past: WorkflowGraph[];
  future: WorkflowGraph[];
};

type EditorState = {
  workflowId: string;
  name: string;
  description: string;
  graph: WorkflowGraph;
  selected: string[];
  issues: ValidationIssue[];
  dirty: boolean;
  saving: boolean;
  lastSavedAt: string | null;
  history: History;
  hydrate: (input: { workflowId: string; name: string; description: string; graph: WorkflowGraph }) => void;
  setName: (name: string) => void;
  setGraph: (graph: WorkflowGraph, record?: boolean) => void;
  select: (ids: string[]) => void;
  addNode: (type: string, position: { x: number; y: number }) => void;
  updateNode: (id: string, patch: Partial<GraphNode>) => void;
  updateConfig: (id: string, config: Record<string, unknown>) => void;
  removeSelected: () => void;
  duplicateSelected: () => void;
  undo: () => void;
  redo: () => void;
  markSaved: () => void;
  setSaving: (saving: boolean) => void;
};

function snapshot(graph: WorkflowGraph): WorkflowGraph {
  return JSON.parse(JSON.stringify(graph)) as WorkflowGraph;
}

function withHistory(state: EditorState, next: WorkflowGraph): Partial<EditorState> {
  return {
    graph: next,
    dirty: true,
    issues: validateGraph(next).issues,
    history: {
      past: [...state.history.past.slice(-49), snapshot(state.graph)],
      future: [],
    },
  };
}

export const useEditor = create<EditorState>((set, get) => ({
  workflowId: "",
  name: "Untitled workflow",
  description: "",
  graph: emptyGraph(),
  selected: [],
  issues: [],
  dirty: false,
  saving: false,
  lastSavedAt: null,
  history: { past: [], future: [] },
  hydrate: (input) =>
    set({
      workflowId: input.workflowId,
      name: input.name,
      description: input.description,
      graph: input.graph,
      selected: [],
      issues: validateGraph(input.graph).issues,
      dirty: false,
      history: { past: [], future: [] },
    }),
  setName: (name) => set({ name, dirty: true }),
  setGraph: (graph, record = true) => {
    if (record) set((state) => withHistory(state, graph));
    else set({ graph, issues: validateGraph(graph).issues, dirty: true });
  },
  select: (ids) => set({ selected: ids }),
  addNode: (type, position) => {
    const def = getNodeDefinition(type);
    if (!def) return;
    const node: GraphNode = {
      id: createId("nd"),
      type,
      name: def.name,
      position,
      config: Object.fromEntries(def.configFields.filter((f) => f.default !== undefined).map((f) => [f.key, f.default])),
    };
    const state = get();
    set(withHistory(state, { ...state.graph, nodes: [...state.graph.nodes, node] }));
    set({ selected: [node.id] });
  },
  updateNode: (id, patch) => {
    const state = get();
    const nodes = state.graph.nodes.map((n) => (n.id === id ? { ...n, ...patch } : n));
    set(withHistory(state, { ...state.graph, nodes }));
  },
  updateConfig: (id, config) => {
    const state = get();
    const nodes = state.graph.nodes.map((n) => (n.id === id ? { ...n, config } : n));
    set(withHistory(state, { ...state.graph, nodes }));
  },
  removeSelected: () => {
    const state = get();
    const selected = new Set(state.selected);
    const nodes = state.graph.nodes.filter((n) => !selected.has(n.id));
    const edges = state.graph.edges.filter((e) => !selected.has(e.source) && !selected.has(e.target));
    set(withHistory(state, { ...state.graph, nodes, edges }));
    set({ selected: [] });
  },
  duplicateSelected: () => {
    const state = get();
    const selected = new Set(state.selected);
    const clones: GraphNode[] = [];
    const idMap = new Map<string, string>();
    for (const node of state.graph.nodes.filter((n) => selected.has(n.id))) {
      const nextId = createId("nd");
      idMap.set(node.id, nextId);
      clones.push({
        ...node,
        id: nextId,
        name: `${node.name} copy`,
        position: { x: node.position.x + 40, y: node.position.y + 40 },
      });
    }
    const edges: GraphEdge[] = state.graph.edges
      .filter((e) => selected.has(e.source) && selected.has(e.target))
      .map((e) => ({
        ...e,
        id: createId("ed"),
        source: idMap.get(e.source) ?? e.source,
        target: idMap.get(e.target) ?? e.target,
      }));
    set(
      withHistory(state, {
        ...state.graph,
        nodes: [...state.graph.nodes, ...clones],
        edges: [...state.graph.edges, ...edges],
      }),
    );
    set({ selected: clones.map((c) => c.id) });
  },
  undo: () => {
    const { history, graph } = get();
    const previous = history.past.at(-1);
    if (!previous) return;
    set({
      graph: previous,
      dirty: true,
      issues: validateGraph(previous).issues,
      history: { past: history.past.slice(0, -1), future: [snapshot(graph), ...history.future] },
    });
  },
  redo: () => {
    const { history, graph } = get();
    const next = history.future[0];
    if (!next) return;
    set({
      graph: next,
      dirty: true,
      issues: validateGraph(next).issues,
      history: { past: [...history.past, snapshot(graph)], future: history.future.slice(1) },
    });
  },
  markSaved: () => set({ dirty: false, lastSavedAt: new Date().toISOString(), saving: false }),
  setSaving: (saving) => set({ saving }),
}));
