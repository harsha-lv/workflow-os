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
  if (
    p.includes("email") ||
    p.includes("inbox") ||
    p.includes("urgency") ||
    (p.includes("customer") && (p.includes("message") || p.includes("ticket") || p.includes("support")))
  ) {
    const nodes = [
      n("webhook.trigger", "Receive email", 80, 180, { pathHint: "email" }),
      n("ai.summarizer", "Summarize", 340, 180, { input: "{{trigger.body}}", style: "bullets" }),
      n("ai.classifier", "Classify urgency", 600, 180, {
        input: "{{trigger.body.message}}",
        labels: ["urgent", "normal", "low"],
      }),
      n("logic.condition", "Urgent?", 860, 180, { expression: "true" }),
      n("comm.notification", "Notify team", 1120, 80, {
        title: "Urgent customer message",
        message: "{{nodes.summarize}}",
      }),
      n("output.log", "Archive", 1120, 280, { message: "Non-urgent message logged" }),
    ];
    const graph = connect(nodes, [
      { from: 0, to: 1 },
      { from: 1, to: 2 },
      { from: 2, to: 3 },
      { from: 3, to: 4, handle: "true" },
      { from: 3, to: 5, handle: "false" },
    ]);
    const classifierId = graph.nodes[2]?.id;
    const summarizerId = graph.nodes[1]?.id;
    if (graph.nodes[3] && classifierId) {
      graph.nodes[3].config.expression = `nodes.${classifierId}.label == "urgent"`;
    }
    if (graph.nodes[4] && summarizerId) {
      graph.nodes[4].config.message = `{{nodes.${summarizerId}.summary}}`;
    }
    return {
      graph,
      explanation:
        "This workflow receives customer emails, summarizes them, classifies urgency, and notifies your team when an urgent message is detected.",
      mocked: true,
    };
  }
  if (p.includes("document") || p.includes("invoice") || p.includes("extract")) {
    const nodes = [
      n("form.trigger", "Upload document", 80, 180, {
        fields: [
          { key: "filename", label: "Filename" },
          { key: "text", label: "Document text" },
        ],
      }),
      n("ai.extractor", "Extract fields", 340, 180, {
        input: "{{trigger.text}}",
        schema: { vendor: "string", amount: "number", dueDate: "string" },
      }),
      n("human.review", "Review extraction", 600, 180, { title: "Review extracted fields" }),
      n("output.log", "Store result", 860, 180, { message: "Document processed" }),
    ];
    return {
      graph: connect(nodes),
      explanation: "This workflow takes document text, extracts structured fields, and pauses for a human review before storing the result.",
      mocked: true,
    };
  }
  if (p.includes("research") || p.includes("brief") || p.includes("summarize document")) {
    const nodes = [
      n("manual.trigger", "Research question", 80, 180, {
        sampleInput: { question: "How should a team structure human approval in an inbound workflow?" },
      }),
      n("ai.agent", "Research", 340, 180, { goal: "{{trigger.question}}" }),
      n("ai.summarizer", "Brief", 600, 180, { input: "{{nodes.research.result}}", style: "executive" }),
      n("output.response", "Return brief", 860, 180, { value: "{{nodes.brief}}" }),
    ];
    return {
      graph: connect(nodes),
      explanation: "This workflow takes a question, researches it, and returns a short brief you can review before sharing.",
      mocked: true,
    };
  }
  if (p.includes("notif") || p.includes("slack") || p.includes("when something changes")) {
    const nodes = [
      n("webhook.trigger", "Change event", 80, 180, { pathHint: "change" }),
      n("ai.summarizer", "Summarize change", 340, 180, { input: "{{trigger.body}}" }),
      n("comm.notification", "Notify workspace", 600, 180, {
        title: "Something changed",
        message: "{{trigger.body}}",
      }),
    ];
    return {
      graph: connect(nodes),
      explanation: "This workflow receives a change event, summarizes it, and notifies the workspace. Nothing is sent until you test and publish.",
      mocked: true,
    };
  }
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
  const names = graph.nodes.map((n) => n.name);
  if (!names.length) return "This workflow is empty. Add a trigger to start.";
  if (names.length === 1) return `This workflow starts at ${names[0]}. Add the next step when you are ready.`;
  const rest = names.slice(1, -1);
  const last = names[names.length - 1];
  const middle = rest.length ? `, then ${rest.join(", ")}` : "";
  return `This workflow starts at ${names[0]}${middle}, and finishes at ${last}. Nothing is published or sent until you confirm.`;
}

export function explainNode(type: string, name: string): string {
  const def = nodeDefinitions.find((d) => d.type === type);
  return def ? `${name}: ${def.description}` : `${name} is a ${type} step.`;
}
