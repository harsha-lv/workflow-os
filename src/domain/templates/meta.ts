import { getNodeDefinition } from "../nodes/definitions";
import type { WorkflowGraph } from "../graph";

export type TemplateMeta = {
  whatItDoes: string;
  setupMinutes: number;
  integrations: string[];
  setupSteps: string[];
};

const BY_SLUG: Record<string, Omit<TemplateMeta, "integrations">> = {
  "lead-qualification": {
    whatItDoes: "Automatically evaluate incoming leads and route high-value leads for review.",
    setupMinutes: 3,
    setupSteps: ["Publish so the webhook URL is live", "Choose an AI model (Auto is fine)", "Test with sample lead data", "Publish"],
  },
  "support-triage": {
    whatItDoes: "Classify support tickets, draft a reply, and hold it for an agent to review.",
    setupMinutes: 3,
    setupSteps: ["Publish the webhook", "Review the draft-reply prompt", "Test with a sample ticket", "Publish"],
  },
  "email-summarization": {
    whatItDoes: "Turn a long thread into bullets and a suggested reply.",
    setupMinutes: 2,
    setupSteps: ["Paste a sample thread", "Test the draft", "Publish if you want others to run it"],
  },
  "document-extraction": {
    whatItDoes: "Extract fields from a document, validate them, and send incomplete items to review.",
    setupMinutes: 3,
    setupSteps: ["Confirm the fields you need", "Test with sample document text", "Publish"],
  },
  "meeting-follow-up": {
    whatItDoes: "Summarize notes, extract action items, and draft a recap for approval.",
    setupMinutes: 3,
    setupSteps: ["Review the recap prompt", "Test with sample notes", "Publish"],
  },
  "content-generation": {
    whatItDoes: "Turn a brief into an outline and draft, then pause for an editor.",
    setupMinutes: 3,
    setupSteps: ["Set the audience in the brief", "Test with a sample topic", "Publish"],
  },
  "invoice-processing": {
    whatItDoes: "Parse an invoice payload and request approval above a threshold.",
    setupMinutes: 3,
    setupSteps: ["Confirm the amount threshold", "Test with sample invoice JSON", "Publish"],
  },
  "research-assistant": {
    whatItDoes: "Take a question and return a structured, source-aware brief.",
    setupMinutes: 2,
    setupSteps: ["Test with a sample question", "Publish if the brief looks right"],
  },
  "resume-screening": {
    whatItDoes: "Score a candidate against a role and route advances to a recruiter.",
    setupMinutes: 3,
    setupSteps: ["Confirm the role labels", "Test with sample resume text", "Publish"],
  },
  "github-issue-triage": {
    whatItDoes: "Classify an issue, optionally call GitHub, and notify the workspace.",
    setupMinutes: 4,
    setupSteps: ["Publish the webhook", "Optional: connect GitHub later", "Test with a sample issue payload", "Publish"],
  },
};

function integrationsFromGraph(graph: WorkflowGraph): string[] {
  const found = new Set<string>();
  for (const node of graph.nodes) {
    if (node.type.startsWith("ai.")) found.add("SpaceXAI");
    if (node.type === "webhook.trigger") found.add("Webhook");
    if (node.type === "comm.email") found.add("Email");
    if (node.type === "comm.notification") found.add("Workspace notifications");
    if (node.type === "data.http") found.add("HTTP");
    if (node.type.startsWith("github") || node.name.toLowerCase().includes("github")) found.add("GitHub");
  }
  return [...found];
}

export function templateMeta(
  slug: string,
  graph: WorkflowGraph,
  fallbackDescription: string,
): TemplateMeta {
  const known = BY_SLUG[slug];
  return {
    whatItDoes: known?.whatItDoes ?? fallbackDescription,
    setupMinutes: known?.setupMinutes ?? 3,
    integrations: integrationsFromGraph(graph),
    setupSteps: known?.setupSteps ?? ["Review the path", "Test with sample data", "Publish when you are ready"],
  };
}

export function nodeTypeLabel(type: string): string {
  return getNodeDefinition(type)?.name ?? type;
}
