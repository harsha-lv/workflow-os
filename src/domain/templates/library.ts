import type { WorkflowGraph } from "../graph";

export type TemplateDefinition = {
  slug: string;
  name: string;
  description: string;
  category: string;
  featured: boolean;
  graph: WorkflowGraph;
};

function n(
  id: string,
  type: string,
  name: string,
  x: number,
  y: number,
  config: Record<string, unknown> = {},
) {
  return { id, type, name, position: { x, y }, config };
}

function e(id: string, source: string, target: string, sourceHandle?: string) {
  return sourceHandle ? { id, source, target, sourceHandle } : { id, source, target };
}

export const templateLibrary: TemplateDefinition[] = [
  {
    slug: "lead-qualification",
    name: "Lead qualification",
    description: "Inbound lead → extract → classify → human approval → personalized email.",
    category: "Revenue",
    featured: true,
    graph: {
      nodes: [
        n("t1", "webhook.trigger", "New lead", 80, 240, { pathHint: "lead" }),
        n("n1", "ai.extractor", "Extract company", 340, 240, {
          input: "{{trigger.body}}",
          schema: { name: "string", email: "string", company: "string", title: "string" },
        }),
        n("n2", "ai.classifier", "Score lead", 600, 240, {
          input: "{{nodes.n1}}",
          labels: ["qualified", "nurture", "disqualified"],
        }),
        n("n3", "logic.condition", "Qualified?", 860, 240, {
          expression: "nodes.n2.label == \"qualified\" && nodes.n2.confidence >= 0.7",
        }),
        n("n4", "ai.prompt", "Draft email", 1120, 120, {
          prompt:
            "Write a short, specific outbound email to {{nodes.n1.name}} at {{nodes.n1.company}}. Reference their role {{nodes.n1.title}}. No fluff.",
          system: "You write concise B2B emails. Never invent facts.",
        }),
        n("n5", "human.approval", "Approve send", 1380, 120, {
          title: "Send email to {{nodes.n1.name}}?",
          summary: "{{nodes.n4.text}}",
        }),
        n("n6", "comm.email", "Send email", 1640, 80, {
          to: "{{nodes.n1.email}}",
          subject: "Quick note for {{nodes.n1.company}}",
          body: "{{nodes.n4.text}}",
        }),
        n("n7", "comm.notification", "Nurture later", 1120, 360, {
          title: "Lead routed to nurture",
          message: "{{nodes.n1.company}} scored {{nodes.n2.label}}",
        }),
        n("n8", "output.log", "Log result", 1900, 120, {
          message: "Lead {{nodes.n1.company}} finished with {{nodes.n2.label}}",
        }),
      ],
      edges: [
        e("e1", "t1", "n1"),
        e("e2", "n1", "n2"),
        e("e3", "n2", "n3"),
        e("e4", "n3", "n4", "true"),
        e("e5", "n3", "n7", "false"),
        e("e6", "n4", "n5"),
        e("e7", "n5", "n6", "approved"),
        e("e8", "n6", "n8"),
      ],
    },
  },
  {
    slug: "support-triage",
    name: "Customer support triage",
    description: "Classify tickets, score sentiment, draft a reply, and hold for review.",
    category: "Support",
    featured: true,
    graph: {
      nodes: [
        n("t1", "webhook.trigger", "New ticket", 80, 200, { pathHint: "support" }),
        n("n1", "ai.classifier", "Classify", 340, 200, {
          labels: ["billing", "bug", "how-to", "urgent"],
          input: "{{trigger.body.message}}",
        }),
        n("n2", "ai.summarizer", "Summarize", 600, 200, { input: "{{trigger.body.message}}" }),
        n("n3", "ai.prompt", "Draft reply", 860, 200, {
          system: "You are a calm support agent. Be specific. Do not promise refunds.",
          prompt: "Ticket: {{trigger.body.message}}\nCategory: {{nodes.n1.label}}\nSummary: {{nodes.n2.summary}}",
        }),
        n("n4", "human.review", "Agent review", 1120, 200, {
          title: "Review reply for {{trigger.body.email}}",
          instructions: "Edit the draft if needed, then approve.",
        }),
        n("n5", "comm.email", "Send reply", 1380, 200, {
          to: "{{trigger.body.email}}",
          subject: "Re: {{trigger.body.subject}}",
          body: "{{nodes.n3.text}}",
        }),
      ],
      edges: [e("e1", "t1", "n1"), e("e2", "n1", "n2"), e("e3", "n2", "n3"), e("e4", "n3", "n4"), e("e5", "n4", "n5")],
    },
  },
  {
    slug: "email-summarization",
    name: "Email summarization",
    description: "Turn a long thread into bullets and a suggested reply.",
    category: "Productivity",
    featured: false,
    graph: {
      nodes: [
        n("t1", "manual.trigger", "Paste thread", 80, 180, {
          sampleInput: { thread: "Customer asked about SSO timelines and pricing for 40 seats." },
        }),
        n("n1", "ai.summarizer", "Summarize thread", 340, 180, { input: "{{trigger.thread}}", style: "bullets" }),
        n("n2", "ai.prompt", "Suggest reply", 600, 180, {
          prompt: "Write a reply based on: {{nodes.n1.summary}}",
        }),
        n("n3", "output.response", "Return", 860, 180, { value: "{{nodes.n2.text}}" }),
      ],
      edges: [e("e1", "t1", "n1"), e("e2", "n1", "n2"), e("e3", "n2", "n3")],
    },
  },
  {
    slug: "document-extraction",
    name: "Document extraction",
    description: "Extract fields from a document, validate them, and send to review.",
    category: "Operations",
    featured: true,
    graph: {
      nodes: [
        n("t1", "form.trigger", "Upload document", 80, 220, {
          fields: [
            { key: "filename", label: "Filename" },
            { key: "text", label: "Document text" },
          ],
        }),
        n("n1", "ai.extractor", "Extract fields", 340, 220, {
          input: "{{trigger.text}}",
          schema: { vendor: "string", amount: "number", dueDate: "string", invoiceId: "string" },
        }),
        n("n2", "logic.condition", "Has amount?", 600, 220, { expression: "nodes.n1.amount > 0" }),
        n("n3", "human.review", "Finance review", 860, 120, { title: "Review invoice {{nodes.n1.invoiceId}}" }),
        n("n4", "output.log", "Reject incomplete", 860, 340, { message: "Document missing amount" }),
        n("n5", "data.transform", "Export", 1120, 120, {
          mapping: {
            vendor: "{{nodes.n1.vendor}}",
            amount: "{{nodes.n1.amount}}",
            invoiceId: "{{nodes.n1.invoiceId}}",
          },
        }),
      ],
      edges: [
        e("e1", "t1", "n1"),
        e("e2", "n1", "n2"),
        e("e3", "n2", "n3", "true"),
        e("e4", "n2", "n4", "false"),
        e("e5", "n3", "n5"),
      ],
    },
  },
  {
    slug: "meeting-follow-up",
    name: "Meeting follow-up",
    description: "Summarize notes, extract action items, and draft a recap email.",
    category: "Productivity",
    featured: false,
    graph: {
      nodes: [
        n("t1", "manual.trigger", "Meeting notes", 80, 180, {
          sampleInput: { notes: "Discussed onboarding blockers. Avery owns docs. Ship Friday." },
        }),
        n("n1", "ai.summarizer", "Recap", 340, 180, { input: "{{trigger.notes}}", style: "executive" }),
        n("n2", "ai.extractor", "Action items", 600, 180, {
          input: "{{trigger.notes}}",
          schema: { actions: "array", owners: "array" },
        }),
        n("n3", "ai.prompt", "Draft recap", 860, 180, {
          prompt: "Write a recap email.\nSummary: {{nodes.n1.summary}}\nActions: {{nodes.n2}}",
        }),
        n("n4", "human.approval", "Approve recap", 1120, 180, { title: "Send meeting recap?" }),
        n("n5", "comm.email", "Send recap", 1380, 180, {
          to: "team@northstar.example",
          subject: "Meeting recap",
          body: "{{nodes.n3.text}}",
        }),
      ],
      edges: [e("e1", "t1", "n1"), e("e2", "n1", "n2"), e("e3", "n2", "n3"), e("e4", "n3", "n4"), e("e5", "n4", "n5", "approved")],
    },
  },
  {
    slug: "content-generation",
    name: "Content generation",
    description: "Brief → outline → draft → human edit gate.",
    category: "Marketing",
    featured: false,
    graph: {
      nodes: [
        n("t1", "form.trigger", "Content brief", 80, 180, {
          fields: [
            { key: "topic", label: "Topic" },
            { key: "audience", label: "Audience" },
          ],
        }),
        n("n1", "ai.prompt", "Outline", 340, 180, {
          prompt: "Create an outline for {{trigger.topic}} aimed at {{trigger.audience}}.",
        }),
        n("n2", "ai.prompt", "Draft", 600, 180, { prompt: "Write the piece from this outline:\n{{nodes.n1.text}}" }),
        n("n3", "human.review", "Editor review", 860, 180, { title: "Review draft" }),
        n("n4", "output.response", "Publish payload", 1120, 180, { value: "{{nodes.n2.text}}" }),
      ],
      edges: [e("e1", "t1", "n1"), e("e2", "n1", "n2"), e("e3", "n2", "n3"), e("e4", "n3", "n4")],
    },
  },
  {
    slug: "invoice-processing",
    name: "Invoice processing",
    description: "Parse invoice JSON, validate totals, request approval above a threshold.",
    category: "Finance",
    featured: false,
    graph: {
      nodes: [
        n("t1", "webhook.trigger", "Invoice received", 80, 220, { pathHint: "invoice" }),
        n("n1", "data.json", "Parse payload", 340, 220, { mode: "parse", value: "{{trigger.body}}" }),
        n("n2", "logic.condition", "Over $2,500?", 600, 220, { expression: "trigger.body.amount >= 2500" }),
        n("n3", "human.approval", "Finance approval", 860, 120, { title: "Approve invoice {{trigger.body.number}}" }),
        n("n4", "comm.notification", "Auto-accept", 860, 340, {
          title: "Invoice auto-accepted",
          message: "{{trigger.body.number}} under threshold",
        }),
        n("n5", "output.log", "Posted", 1120, 220, { message: "Invoice {{trigger.body.number}} processed" }),
      ],
      edges: [
        e("e1", "t1", "n1"),
        e("e2", "n1", "n2"),
        e("e3", "n2", "n3", "true"),
        e("e4", "n2", "n4", "false"),
        e("e5", "n3", "n5", "approved"),
        e("e6", "n4", "n5"),
      ],
    },
  },
  {
    slug: "research-assistant",
    name: "Research assistant",
    description: "Take a question, gather a structured brief, and return a source-aware summary.",
    category: "Research",
    featured: false,
    graph: {
      nodes: [
        n("t1", "manual.trigger", "Research question", 80, 180, {
          sampleInput: { question: "How are mid-market SaaS teams qualifying inbound leads in 2026?" },
        }),
        n("n1", "ai.agent", "Research", 340, 180, {
          goal: "{{trigger.question}}",
          context: "Produce a brief a revenue operations lead could use this week.",
        }),
        n("n2", "ai.summarizer", "Brief", 600, 180, { input: "{{nodes.n1.result}}", style: "executive" }),
        n("n3", "output.response", "Return brief", 860, 180, { value: "{{nodes.n2}}" }),
      ],
      edges: [e("e1", "t1", "n1"), e("e2", "n1", "n2"), e("e3", "n2", "n3")],
    },
  },
  {
    slug: "resume-screening",
    name: "Resume screening",
    description: "Score a candidate against a role, then route to recruiter approval.",
    category: "People",
    featured: false,
    graph: {
      nodes: [
        n("t1", "form.trigger", "Candidate", 80, 200, {
          fields: [
            { key: "name", label: "Name" },
            { key: "resume", label: "Resume text" },
            { key: "role", label: "Role" },
          ],
        }),
        n("n1", "ai.classifier", "Fit", 340, 200, {
          labels: ["advance", "hold", "reject"],
          input: "Role: {{trigger.role}}\nResume: {{trigger.resume}}",
        }),
        n("n2", "logic.condition", "Advance?", 600, 200, { expression: "nodes.n1.label == \"advance\"" }),
        n("n3", "human.approval", "Recruiter review", 860, 120, { title: "Advance {{trigger.name}}?" }),
        n("n4", "comm.notification", "Reject notice", 860, 320, {
          title: "Candidate not advanced",
          message: "{{trigger.name}} scored {{nodes.n1.label}}",
        }),
      ],
      edges: [e("e1", "t1", "n1"), e("e2", "n1", "n2"), e("e3", "n2", "n3", "true"), e("e4", "n2", "n4", "false")],
    },
  },
  {
    slug: "github-issue-triage",
    name: "GitHub issue triage",
    description: "Classify an issue, suggest labels, and notify the workspace.",
    category: "Engineering",
    featured: false,
    graph: {
      nodes: [
        n("t1", "webhook.trigger", "GitHub issue", 80, 180, { pathHint: "github-issues" }),
        n("n1", "ai.classifier", "Type", 340, 180, {
          labels: ["bug", "feature", "docs", "question"],
          input: "{{trigger.body.issue.title}} {{trigger.body.issue.body}}",
        }),
        n("n2", "data.http", "Optional GitHub call", 600, 180, {
          method: "GET",
          url: "https://httpbin.org/json",
        }),
        n("n3", "comm.notification", "Notify", 860, 180, {
          title: "Issue triaged as {{nodes.n1.label}}",
          message: "{{trigger.body.issue.title}}",
        }),
      ],
      edges: [e("e1", "t1", "n1"), e("e2", "n1", "n2"), e("e3", "n2", "n3")],
    },
  },
];
