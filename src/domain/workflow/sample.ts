import { getNodeDefinition } from "../nodes/definitions";
import type { WorkflowGraph } from "../graph";

const SAMPLES = [
  {
    name: "Demo Lead Alpha",
    email: "lead-alpha@demo.example",
    company: "Demo Manufacturing Co",
    title: "Director of Operations (fixture)",
    message: "[Demo fixture] Evaluating automation for inbound qualification this quarter.",
  },
  {
    name: "Demo Lead Beta",
    email: "lead-beta@demo.example",
    company: "Harbor Systems (demo fixture)",
    title: "Head of Support (fixture)",
    message: "[Demo fixture] SSO started failing after the IdP rotation.",
  },
  {
    name: "Demo Lead Gamma",
    email: "lead-gamma@demo.example",
    company: "Fieldwork Labs (demo fixture)",
    title: "Head of Growth (fixture)",
    message: "[Demo fixture] Need human approval on AI-drafted outreach before it sends.",
  },
];

export function sampleTriggerPayload(graph: WorkflowGraph, index = 0): Record<string, unknown> {
  const person = SAMPLES[index % SAMPLES.length]!;
  const trigger = graph.nodes.find((n) => getNodeDefinition(n.type)?.isTrigger);
  if (!trigger) return { source: "test", ...person };
  if (trigger.type === "form.trigger") {
    return { ...person, source: "form" };
  }
  if (trigger.type === "webhook.trigger") {
    return {
      method: "POST",
      headers: { "content-type": "application/json" },
      query: {},
      body: person,
    };
  }
  if (trigger.type === "schedule.trigger") {
    return { scheduledFor: new Date().toISOString(), cron: String(trigger.config.cron ?? "0 9 * * 1-5") };
  }
  return { source: "test", ...person };
}

export type PortableWorkflow = {
  format: "workflow-os.v1";
  name: string;
  description: string;
  graph: WorkflowGraph;
};

export function exportWorkflow(name: string, description: string, graph: WorkflowGraph): PortableWorkflow {
  return { format: "workflow-os.v1", name, description, graph };
}

export function parseImport(raw: unknown): PortableWorkflow {
  if (!raw || typeof raw !== "object") throw new Error("File is not a workflow.");
  const value = raw as Record<string, unknown>;
  if (value.format !== "workflow-os.v1") throw new Error("Unsupported workflow format.");
  if (typeof value.name !== "string" || !value.graph || typeof value.graph !== "object") {
    throw new Error("Workflow file is missing name or graph.");
  }
  return value as PortableWorkflow;
}
