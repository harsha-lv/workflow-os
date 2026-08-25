import type { WorkflowGraph } from "../graph";
import { nodeDefinitions } from "../nodes/definitions";
import { createId } from "../ids";

export type CopilotResult = {
  graph: WorkflowGraph;
  explanation: string;
  mocked: boolean;
};

const TYPES = new Set(nodeDefinitions.map((d) => d.type));

function n(type: string, name: string, x: number, y: number, config: Record<string, unknown> = {}) {
  return { id: createId("nd"), type, name, position: { x, y }, config };
}

function connect(nodes: WorkflowGraph["nodes"], extra?: Array<{ from: number; to: number; handle?: string }>): WorkflowGraph {
  const links = extra ?? nodes.slice(0, -1).map((_, i) => ({ from: i, to: i + 1, handle: undefined as string | undefined }));
  const edges = links.map((link) => ({
    id: createId("ed"),
    source: nodes[link.from]!.id,
    target: nodes[link.to]!.id,
    sourceHandle: link.handle,
  }));
  return { nodes, edges, viewport: { x: 0, y: 0, zoom: 1 } };
}

export function heuristicCopilot(prompt: string): CopilotResult {
  const p = prompt.toLowerCase();
  if (p.includes("lead") || p.includes("sales") || p.includes("qualif")) {
    const nodes = [
      n("webhook.trigger", "New lead", 80, 180, { pathHint: "lead" }),
      n("ai.extractor", "Extract contact", 340, 180, {
        input: "{{trigger.body}}",
        schema: { name: "string", email: "string", company: "string" },
      }),
      n("ai.classifier", "Score lead", 600, 180, {
        input: "{{nodes.extract}}",
        labels: ["qualified", "nurture", "disqualified"],
      }),
      n("logic.condition", "High value?", 860, 180, { expression: "true" }),
      n("human.approval", "Review outreach", 1120, 80, { title: "Approve high-value lead?" }),
      n("comm.notification", "Notify workspace", 1120, 280, {
        title: "Lead routed",
        message: "A lead was classified below threshold.",
      }),
    ];
    const graph = connect(nodes, [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
      { from: 2, to: 3 },
      { from: 3, to: 4, handle: "true" },
      { from: 3, to: 5, handle: "false" },
    ]);
    const classifierId = graph.nodes[2]?.id;
    if (graph.nodes[3] && classifierId) {
      graph.nodes[3].config.expression = `nodes.${classifierId}.label == "qualified"`;
    }
    return {
      graph,
      explanation:
        "Receives a lead on a webhook, extracts contact fields, scores with AI, and holds high-value leads for human review.",
      mocked: true,
    };
  }
  if (p.includes("support") || p.includes("ticket") || p.includes("triage")) {
    const nodes = [
      n("webhook.trigger", "Incoming ticket", 80, 180),
      n("ai.classifier", "Classify", 340, 180, { labels: ["billing", "bug", "how-to"], input: "{{trigger.body}}" }),
      n("ai.prompt", "Draft reply", 600, 180, { prompt: "Reply to: {{trigger.body}}" }),
      n("human.review", "Agent review", 860, 180, { title: "Review reply" }),
    ];
    return {
      graph: connect(nodes),
      explanation: "Classifies an inbound request, drafts a reply, and pauses for an agent to review before anything is sent.",
      mocked: true,
    };
  }
  const nodes = [
    n("manual.trigger", "Start", 80, 180),
    n("ai.prompt", "Draft", 340, 180, { prompt: prompt.slice(0, 280) }),
    n("human.approval", "Approve", 600, 180, { title: "Approve result?" }),
    n("output.log", "Log", 860, 180, { message: "Completed" }),
  ];
  return {
    graph: connect(nodes),
    explanation: "Starts manually, drafts with an AI prompt, waits for approval, then logs the result. Refine nodes before publishing.",
    mocked: true,
  };
}

export function sanitizeCopilotGraph(raw: unknown): WorkflowGraph | null {
  if (!raw || typeof raw !== "object") return null;
  const graph = raw as { nodes?: unknown; edges?: unknown };
  if (!Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) return null;
  const nodes = graph.nodes
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .filter((item) => typeof item.type === "string" && TYPES.has(item.type))
    .map((item, index) => ({
      id: typeof item.id === "string" ? item.id : createId("nd"),
      type: String(item.type),
      name: typeof item.name === "string" ? item.name : String(item.type),
      position: {
        x: Number((item.position as { x?: number } | undefined)?.x ?? index * 240),
        y: Number((item.position as { y?: number } | undefined)?.y ?? 180),
      },
      config: item.config && typeof item.config === "object" ? (item.config as Record<string, unknown>) : {},
    }));
  const ids = new Set(nodes.map((n) => n.id));
  const edges = graph.edges
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .filter((item) => ids.has(String(item.source)) && ids.has(String(item.target)))
    .map((item) => ({
      id: typeof item.id === "string" ? item.id : createId("ed"),
      source: String(item.source),
      target: String(item.target),
      sourceHandle: typeof item.sourceHandle === "string" ? item.sourceHandle : undefined,
    }));
  if (nodes.length < 2) return null;
  return { nodes, edges, viewport: { x: 0, y: 0, zoom: 1 } };
}

export function explainGraph(graph: WorkflowGraph): string {
  const names = graph.nodes.map((n) => n.name.toLowerCase());
  if (!names.length) return "This workflow is empty. Add a trigger to start.";
  return `This workflow ${names[0] ? `starts at ${names[0]}` : "starts"}, then ${names.slice(1, 4).join(", ")}${names.length > 4 ? ", and continues" : ""}.`;
}

export function explainNode(type: string, name: string): string {
  const def = nodeDefinitions.find((d) => d.type === type);
  return def ? `${name}: ${def.description}` : `${name} is a ${type} step.`;
}
