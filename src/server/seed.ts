import { eq } from "drizzle-orm";
import { ensureMigrated } from "@/db/client";
import {
  approvals,
  auditLogs,
  executionSteps,
  executions,
  integrations,
  memberships,
  organizations,
  projects,
  secrets,
  templates,
  usageEvents,
  users,
  workflowEdges,
  workflowNodes,
  workflowVersions,
  workflows,
} from "@/db/schema";
import { id } from "@/domain/ids";
import { hashPassword, encryptSecret } from "@/server/crypto";
import { templateLibrary } from "@/domain/templates/library";
import { hashDefinition } from "@/server/hash";
import { randomToken } from "@/server/crypto";
import type { WorkflowGraph } from "@/domain/graph";

let seeding: Promise<void> | null = null;

export const DEMO_EMAIL = "maya.chen@northstar.example";
export const DEMO_PASSWORD = "workflow-os-demo";

export async function maybeSeed(): Promise<void> {
  if (process.env.SEED_ON_BOOT === "false") return;
  if (seeding) return seeding;
  seeding = seedIfEmpty();
  await seeding;
}

async function seedIfEmpty(): Promise<void> {
  const db = await ensureMigrated();
  const existing = await db.query.users.findFirst();
  const existingTemplates = await db.query.templates.findFirst();
  if (!existingTemplates) await seedTemplates();
  if (existing) return;
  await seedDemo();
}

export async function seedTemplates(): Promise<void> {
  const db = await ensureMigrated();
  for (const tpl of templateLibrary) {
    await db
      .insert(templates)
      .values({
        id: id("template"),
        slug: tpl.slug,
        name: tpl.name,
        description: tpl.description,
        category: tpl.category,
        featured: tpl.featured,
        definition: { name: tpl.name, description: tpl.description, graph: tpl.graph },
      })
      .onConflictDoNothing();
  }
}

function persistGraph(versionId: string, graph: WorkflowGraph) {
  const nodes = graph.nodes.map((node) => ({
    id: id("node"),
    versionId,
    nodeKey: node.id,
    type: node.type,
    name: node.name,
    config: node.config,
    positionX: Math.round(node.position.x),
    positionY: Math.round(node.position.y),
    disabled: Boolean(node.disabled),
  }));
  const edges = graph.edges.map((edge) => ({
    id: id("edge"),
    versionId,
    edgeKey: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle ?? null,
    targetHandle: edge.targetHandle ?? null,
    label: edge.label ?? null,
  }));
  return { nodes, edges };
}

export async function seedDemo(): Promise<void> {
  const db = await ensureMigrated();
  const now = new Date();
  const userId = id("user");
  const editorId = id("user");
  const viewerId = id("user");
  const orgId = id("org");
  const projectRevops = id("project");
  const projectSupport = id("project");
  const projectFinance = id("project");

  await db.insert(users).values([
    {
      id: userId,
      email: DEMO_EMAIL,
      name: "Maya Chen",
      passwordHash: hashPassword(DEMO_PASSWORD),
      avatarColor: "#c96442",
      onboardedAt: now,
    },
    {
      id: editorId,
      email: "jordan.okonkwo@northstar.example",
      name: "Jordan Okonkwo",
      passwordHash: hashPassword(DEMO_PASSWORD),
      avatarColor: "#6b8fd4",
      onboardedAt: now,
    },
    {
      id: viewerId,
      email: "priya.shah@northstar.example",
      name: "Priya Shah",
      passwordHash: hashPassword(DEMO_PASSWORD),
      avatarColor: "#3d9a6a",
      onboardedAt: now,
    },
  ]);

  await db.insert(organizations).values({
    id: orgId,
    name: "Northstar Labs",
    slug: "northstar-labs",
    plan: "team",
  });

  await db.insert(memberships).values([
    { id: id("membership"), organizationId: orgId, userId, role: "owner" },
    { id: id("membership"), organizationId: orgId, userId: editorId, role: "editor" },
    { id: id("membership"), organizationId: orgId, userId: viewerId, role: "viewer" },
  ]);

  await db.insert(projects).values([
    {
      id: projectRevops,
      organizationId: orgId,
      name: "Revenue operations",
      slug: "revops",
      description: "Inbound qualification, routing, and follow-up.",
    },
    {
      id: projectSupport,
      organizationId: orgId,
      name: "Customer support",
      slug: "support",
      description: "Ticket triage and response drafting.",
    },
    {
      id: projectFinance,
      organizationId: orgId,
      name: "Finance ops",
      slug: "finance",
      description: "Invoice intake and approval.",
    },
  ]);

  await db.insert(integrations).values([
    {
      id: id("integration"),
      organizationId: orgId,
      provider: "xai",
      name: "SpaceXAI",
      status: process.env.XAI_API_KEY ? "connected" : "disconnected",
      config: { defaultModel: "grok-4.6" },
    },
    {
      id: id("integration"),
      organizationId: orgId,
      provider: "http",
      name: "Generic HTTP",
      status: "connected",
      config: {},
    },
    {
      id: id("integration"),
      organizationId: orgId,
      provider: "email",
      name: "Outbound email",
      status: "connected",
      config: { from: "workflows@northstar.example" },
    },
    {
      id: id("integration"),
      organizationId: orgId,
      provider: "github",
      name: "GitHub",
      status: "disconnected",
      config: {},
    },
    {
      id: id("integration"),
      organizationId: orgId,
      provider: "slack",
      name: "Slack",
      status: "disconnected",
      config: {},
    },
  ]);

  await db.insert(secrets).values({
    id: id("secret"),
    organizationId: orgId,
    name: "HTTPBIN_TOKEN",
    encryptedValue: encryptSecret("ns_live_demo_token_91f3"),
    lastFour: "91f3",
    createdBy: userId,
  });

  await seedTemplates();

  const lead = templateLibrary.find((t) => t.slug === "lead-qualification")!;
  const support = templateLibrary.find((t) => t.slug === "support-triage")!;
  const invoice = templateLibrary.find((t) => t.slug === "invoice-processing")!;
  const research = templateLibrary.find((t) => t.slug === "research-assistant")!;

  async function insertWorkflow(opts: {
    name: string;
    description: string;
    projectId: string;
    status: "draft" | "published";
    graph: WorkflowGraph;
    createdAt?: Date;
  }) {
    const workflowId = id("workflow");
    const versionId = id("version");
    const definition = { name: opts.name, description: opts.description, graph: opts.graph };
    await db.insert(workflows).values({
      id: workflowId,
      organizationId: orgId,
      projectId: opts.projectId,
      name: opts.name,
      description: opts.description,
      status: opts.status,
      publishedVersionId: opts.status === "published" ? versionId : null,
      webhookToken: randomToken(18),
      createdBy: userId,
      createdAt: opts.createdAt ?? now,
      updatedAt: opts.createdAt ?? now,
    });
    await db.insert(workflowVersions).values({
      id: versionId,
      workflowId,
      version: 1,
      definition,
      hash: hashDefinition(definition),
      createdBy: userId,
      publishedAt: opts.status === "published" ? now : null,
    });
    const persisted = persistGraph(versionId, opts.graph);
    if (persisted.nodes.length) await db.insert(workflowNodes).values(persisted.nodes);
    if (persisted.edges.length) await db.insert(workflowEdges).values(persisted.edges);
    return { workflowId, versionId };
  }

  const leadWf = await insertWorkflow({
    name: "Inbound lead qualification",
    description: lead.description,
    projectId: projectRevops,
    status: "published",
    graph: lead.graph,
  });
  const supportWf = await insertWorkflow({
    name: "Support ticket triage",
    description: support.description,
    projectId: projectSupport,
    status: "published",
    graph: support.graph,
  });
  await insertWorkflow({
    name: "Invoice intake",
    description: invoice.description,
    projectId: projectFinance,
    status: "published",
    graph: invoice.graph,
  });
  await insertWorkflow({
    name: "Research brief (draft)",
    description: research.description,
    projectId: projectRevops,
    status: "draft",
    graph: research.graph,
  });

  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600_000);

  async function insertRun(opts: {
    workflowId: string;
    versionId: string;
    status: string;
    triggerType: string;
    input: unknown;
    output: unknown;
    createdAt: Date;
    durationMs: number;
    error?: { message: string; type: string; nodeId?: string };
    waiting?: boolean;
  }) {
    const runId = id("execution");
    await db.insert(executions).values({
      id: runId,
      organizationId: orgId,
      workflowId: opts.workflowId,
      workflowVersionId: opts.versionId,
      status: opts.status,
      triggerType: opts.triggerType,
      triggeredBy: userId,
      input: opts.input,
      output: opts.output,
      error: opts.error,
      startedAt: opts.createdAt,
      endedAt: opts.waiting ? null : new Date(opts.createdAt.getTime() + opts.durationMs),
      durationMs: opts.waiting ? null : opts.durationMs,
      createdAt: opts.createdAt,
    });
    return runId;
  }

  const successRun = await insertRun({
    workflowId: leadWf.workflowId,
    versionId: leadWf.versionId,
    status: "success",
    triggerType: "webhook",
    input: {
      body: {
        name: "Avery Lang",
        email: "avery.lang@northwind.dev",
        company: "Northwind Analytics",
        title: "Director of Operations",
        message: "Evaluating workflow automation for a 180-person team. Budget is approved for Q3.",
      },
    },
    output: { status: "queued" },
    createdAt: hoursAgo(2),
    durationMs: 18420,
  });

  await db.insert(executionSteps).values([
    {
      id: id("step"),
      executionId: successRun,
      nodeId: "t1",
      nodeType: "webhook.trigger",
      name: "New lead",
      status: "success",
      input: { company: "Northwind Analytics" },
      output: { body: { company: "Northwind Analytics" } },
      config: {},
      logs: [{ ts: hoursAgo(2).toISOString(), level: "info", message: "Webhook accepted" }],
      startedAt: hoursAgo(2),
      endedAt: new Date(hoursAgo(2).getTime() + 40),
      durationMs: 40,
    },
    {
      id: id("step"),
      executionId: successRun,
      nodeId: "n1",
      nodeType: "ai.extractor",
      name: "Extract company",
      status: "success",
      input: { body: { company: "Northwind Analytics" } },
      output: { name: "Avery Lang", email: "avery.lang@northwind.dev", company: "Northwind Analytics" },
      config: {},
      logs: [{ ts: hoursAgo(2).toISOString(), level: "info", message: "Extracted 4 fields" }],
      startedAt: hoursAgo(2),
      endedAt: new Date(hoursAgo(2).getTime() + 2400),
      durationMs: 2400,
    },
  ]);

  const waitingRun = await insertRun({
    workflowId: leadWf.workflowId,
    versionId: leadWf.versionId,
    status: "waiting",
    triggerType: "webhook",
    input: {
      body: {
        name: "Samir Patel",
        email: "samir@fieldwork.io",
        company: "Fieldwork",
        title: "Head of Growth",
        message: "Need a way for AEs to approve AI-drafted outreach before it sends.",
      },
    },
    output: { status: "waiting" },
    createdAt: hoursAgo(1),
    durationMs: 9100,
    waiting: true,
  });

  const waitingStep = id("step");
  await db.insert(executionSteps).values({
    id: waitingStep,
    executionId: waitingRun,
    nodeId: "n5",
    nodeType: "human.approval",
    name: "Approve send",
    status: "waiting",
    input: { text: "Samir — Fieldwork's AE approval requirement is exactly the human-in-the-loop path Workflow OS is built for." },
    output: { status: "waiting" },
    config: { title: "Send email to Samir Patel?" },
    logs: [{ ts: hoursAgo(1).toISOString(), level: "info", message: "Waiting for approval" }],
    startedAt: hoursAgo(1),
  });

  await db.insert(approvals).values({
    id: id("approval"),
    organizationId: orgId,
    executionId: waitingRun,
    stepId: waitingStep,
    nodeId: "n5",
    status: "pending",
    title: "Send email to Samir Patel?",
    summary:
      "Samir — Fieldwork's AE approval requirement is exactly the human-in-the-loop path Workflow OS is built for.",
    payload: { to: "samir@fieldwork.io" },
  });

  await insertRun({
    workflowId: supportWf.workflowId,
    versionId: supportWf.versionId,
    status: "failed",
    triggerType: "webhook",
    input: { body: { email: "casey@harbor.app", subject: "SSO timeout", message: "SSO started failing after the IdP rotation." } },
    output: null,
    error: { message: "HTTP 502 from downstream provider", type: "ProviderError", nodeId: "n3" },
    createdAt: hoursAgo(5),
    durationMs: 4200,
  });

  await db.insert(usageEvents).values([
    { id: id("usage"), organizationId: orgId, kind: "execution", quantity: 128 },
    { id: id("usage"), organizationId: orgId, kind: "ai.tokens", quantity: 184_220 },
    { id: id("usage"), organizationId: orgId, kind: "email.sent", quantity: 41 },
  ]);

  await db.insert(auditLogs).values([
    {
      id: id("audit"),
      organizationId: orgId,
      userId,
      action: "workflow.published",
      resourceType: "workflow",
      resourceId: leadWf.workflowId,
      metadata: { name: "Inbound lead qualification" },
    },
    {
      id: id("audit"),
      organizationId: orgId,
      userId,
      action: "member.invited",
      resourceType: "membership",
      resourceId: editorId,
      metadata: { email: "jordan.okonkwo@northstar.example", role: "editor" },
    },
  ]);

  const demo = await db.query.users.findFirst({ where: eq(users.email, DEMO_EMAIL) });
  if (!demo) throw new Error("Seed failed");
}
