import { and, eq } from "drizzle-orm";
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
import { encryptSecret, hashPassword, randomToken } from "@/server/crypto";
import { templateLibrary } from "@/domain/templates/library";
import { hashDefinition } from "@/server/hash";
import type { WorkflowGraph } from "@/domain/graph";
import { requireDemoCredentials, seedOnBootEnabled } from "@/server/config";

let seeding: Promise<void> | null = null;

export async function maybeSeed(): Promise<void> {
  if (!seedOnBootEnabled()) return;
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

export async function seedDemo(): Promise<{ status: "created" | "updated" | "already_seeded"; email: string }> {
  const db = await ensureMigrated();
  const { email, password } = requireDemoCredentials();
  await seedTemplates();

  const existingUser = await db.query.users.findFirst({ where: eq(users.email, email) });
  const existingOrg = await db.query.organizations.findFirst({
    where: eq(organizations.slug, "demo-workspace"),
  });

  if (existingUser && existingOrg) {
    await db
      .update(users)
      .set({ passwordHash: hashPassword(password), updatedAt: new Date() })
      .where(eq(users.id, existingUser.id));
    const membership = await db.query.memberships.findFirst({
      where: and(eq(memberships.userId, existingUser.id), eq(memberships.organizationId, existingOrg.id)),
    });
    if (!membership) {
      await db.insert(memberships).values({
        id: id("membership"),
        organizationId: existingOrg.id,
        userId: existingUser.id,
        role: "owner",
      });
    }
    const existingWorkflow = await db.query.workflows.findFirst({
      where: eq(workflows.organizationId, existingOrg.id),
    });
    await db
      .update(organizations)
      .set({ isDemo: true, name: "FlowForge Demo" })
      .where(eq(organizations.id, existingOrg.id));
    if (existingWorkflow) return { status: "already_seeded", email };
    await insertDemoContent({
      db,
      orgId: existingOrg.id,
      userId: existingUser.id,
    });
    return { status: "updated", email };
  }

  const now = new Date();
  const userId = existingUser?.id ?? id("user");
  const orgId = existingOrg?.id ?? id("org");

  if (!existingUser) {
    await db.insert(users).values({
      id: userId,
      email,
      name: "Demo Operator",
      passwordHash: hashPassword(password),
      avatarColor: "#c96442",
      onboardedAt: now,
    });
  } else {
    await db
      .update(users)
      .set({ passwordHash: hashPassword(password), updatedAt: now })
      .where(eq(users.id, userId));
  }

  if (!existingOrg) {
    await db.insert(organizations).values({
      id: orgId,
      name: "FlowForge Demo",
      slug: "demo-workspace",
      plan: "team",
      isDemo: true,
    });
  } else {
    await db.update(organizations).set({ isDemo: true, name: "FlowForge Demo" }).where(eq(organizations.id, orgId));
  }

  const membership = await db.query.memberships.findFirst({
    where: and(eq(memberships.userId, userId), eq(memberships.organizationId, orgId)),
  });
  if (!membership) {
    await db.insert(memberships).values({
      id: id("membership"),
      organizationId: orgId,
      userId,
      role: "owner",
    });
  }

  await insertDemoContent({ db, orgId, userId });
  return { status: "created", email };
}

async function insertDemoContent(input: {
  db: Awaited<ReturnType<typeof ensureMigrated>>;
  orgId: string;
  userId: string;
}) {
  const { db, orgId, userId } = input;
  const now = new Date();
  const projectRevops = id("project");
  const projectSupport = id("project");
  const projectOps = id("project");
  const projectContent = id("project");

  await db.insert(projects).values([
    {
      id: projectRevops,
      organizationId: orgId,
      name: "Revenue operations (demo)",
      slug: "revops",
      description: "Demo data. Inbound qualification, routing, and follow-up.",
    },
    {
      id: projectSupport,
      organizationId: orgId,
      name: "Customer support (demo)",
      slug: "support",
      description: "Demo data. Ticket triage and response drafting.",
    },
    {
      id: projectOps,
      organizationId: orgId,
      name: "Operations (demo)",
      slug: "operations",
      description: "Demo data. Document processing and research briefs.",
    },
    {
      id: projectContent,
      organizationId: orgId,
      name: "Content (demo)",
      slug: "content",
      description: "Demo data. Draft, review, and approval for published copy.",
    },
  ]);

  await db.insert(integrations).values([
    {
      id: id("integration"),
      organizationId: orgId,
      provider: "xai",
      name: "SpaceXAI (demo)",
      status: process.env.XAI_API_KEY ? "connected" : "disconnected",
      config: { defaultModel: "grok-4.6", demo: true },
    },
    {
      id: id("integration"),
      organizationId: orgId,
      provider: "http",
      name: "Generic HTTP (demo)",
      status: "connected",
      config: { demo: true },
    },
    {
      id: id("integration"),
      organizationId: orgId,
      provider: "email",
      name: "Outbound email (demo)",
      status: "connected",
      config: { from: "workflows@demo.example", demo: true },
    },
  ]);

  await db.insert(secrets).values({
    id: id("secret"),
    organizationId: orgId,
    name: "DEMO_HTTP_TOKEN",
    encryptedValue: encryptSecret("demo_fixture_token_only"),
    lastFour: "only",
    createdBy: userId,
  });

  const lead = templateLibrary.find((t) => t.slug === "lead-qualification")!;
  const support = templateLibrary.find((t) => t.slug === "support-triage")!;
  const document = templateLibrary.find((t) => t.slug === "document-extraction")!;
  const research = templateLibrary.find((t) => t.slug === "research-assistant")!;
  const content = templateLibrary.find((t) => t.slug === "content-generation")!;

  async function insertWorkflow(opts: {
    name: string;
    description: string;
    projectId: string;
    status: "draft" | "published";
    graph: WorkflowGraph;
  }) {
    const workflowId = id("workflow");
    const versionId = id("version");
    const definition = {
      name: opts.name,
      description: opts.description,
      graph: opts.graph,
      variables: { demo: true },
    };
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
      createdAt: now,
      updatedAt: now,
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
    name: "Lead Qualification",
    description: `[Demo] ${lead.description}`,
    projectId: projectRevops,
    status: "published",
    graph: lead.graph,
  });
  const supportWf = await insertWorkflow({
    name: "Customer Support Triage",
    description: `[Demo] ${support.description}`,
    projectId: projectSupport,
    status: "published",
    graph: support.graph,
  });
  const documentWf = await insertWorkflow({
    name: "Document Processing",
    description: `[Demo] ${document.description}`,
    projectId: projectOps,
    status: "published",
    graph: document.graph,
  });
  const researchWf = await insertWorkflow({
    name: "AI Research Assistant",
    description: `[Demo] ${research.description}`,
    projectId: projectOps,
    status: "published",
    graph: research.graph,
  });
  const contentWf = await insertWorkflow({
    name: "Content Approval Workflow",
    description: `[Demo] ${content.description}`,
    projectId: projectContent,
    status: "published",
    graph: content.graph,
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

  const leadSuccessA = await insertRun({
    workflowId: leadWf.workflowId,
    versionId: leadWf.versionId,
    status: "success",
    triggerType: "webhook",
    input: {
      demo: true,
      body: {
        name: "Demo Lead Alpha",
        email: "lead-alpha@demo.example",
        company: "Demo Manufacturing Co",
        title: "Director of Operations (fixture)",
        message: "[Demo fixture] Evaluating workflow automation for a 180-person team. Budget approved for Q3.",
      },
    },
    output: { status: "success", demo: true, label: "qualified" },
    createdAt: hoursAgo(6),
    durationMs: 18420,
  });

  await db.insert(executionSteps).values([
    {
      id: id("step"),
      executionId: leadSuccessA,
      nodeId: "t1",
      nodeType: "webhook.trigger",
      name: "New lead",
      status: "success",
      input: { company: "Demo Manufacturing Co", demo: true },
      output: { body: { company: "Demo Manufacturing Co", demo: true } },
      config: {},
      logs: [{ ts: hoursAgo(6).toISOString(), level: "info", message: "[Demo] Webhook accepted" }],
      startedAt: hoursAgo(6),
      endedAt: new Date(hoursAgo(6).getTime() + 40),
      durationMs: 40,
    },
    {
      id: id("step"),
      executionId: leadSuccessA,
      nodeId: "n1",
      nodeType: "ai.extractor",
      name: "Extract company",
      status: "success",
      input: { body: { company: "Demo Manufacturing Co" } },
      output: {
        name: "Demo Lead Alpha",
        email: "lead-alpha@demo.example",
        company: "Demo Manufacturing Co",
      },
      config: {},
      logs: [{ ts: hoursAgo(6).toISOString(), level: "info", message: "[Demo] Extracted 4 fields" }],
      startedAt: hoursAgo(6),
      endedAt: new Date(hoursAgo(6).getTime() + 2400),
      durationMs: 2400,
    },
    {
      id: id("step"),
      executionId: leadSuccessA,
      nodeId: "n2",
      nodeType: "ai.classifier",
      name: "Score lead",
      status: "success",
      input: { company: "Demo Manufacturing Co" },
      output: { label: "qualified", confidence: 0.86, demo: true },
      config: {},
      logs: [{ ts: hoursAgo(6).toISOString(), level: "info", message: "[Demo] Classified as qualified" }],
      startedAt: hoursAgo(6),
      endedAt: new Date(hoursAgo(6).getTime() + 1800),
      durationMs: 1800,
    },
  ]);

  await insertRun({
    workflowId: leadWf.workflowId,
    versionId: leadWf.versionId,
    status: "success",
    triggerType: "webhook",
    input: {
      demo: true,
      body: {
        name: "Demo Lead Beta",
        email: "lead-beta@demo.example",
        company: "Harbor Systems (demo fixture)",
        title: "Head of Growth (fixture)",
        message: "[Demo fixture] Looking for a nurture path, not a sales conversation this quarter.",
      },
    },
    output: { status: "success", demo: true, label: "nurture" },
    createdAt: hoursAgo(4),
    durationMs: 12100,
  });

  const waitingRun = await insertRun({
    workflowId: leadWf.workflowId,
    versionId: leadWf.versionId,
    status: "waiting",
    triggerType: "webhook",
    input: {
      demo: true,
      body: {
        name: "Demo Lead Gamma",
        email: "lead-gamma@demo.example",
        company: "Fieldwork Labs (demo fixture)",
        title: "VP Revenue (fixture)",
        message: "[Demo fixture] Need human approval before any outbound email is sent.",
      },
    },
    output: { status: "waiting", demo: true },
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
    input: {
      demo: true,
      text: "[Demo] Draft email for Demo Lead Gamma at Fieldwork Labs (demo fixture).",
    },
    output: { status: "waiting", demo: true },
    config: { title: "[Demo] Send email to Demo Lead Gamma?" },
    logs: [{ ts: hoursAgo(1).toISOString(), level: "info", message: "[Demo] Waiting for approval" }],
    startedAt: hoursAgo(1),
  });

  await db.insert(approvals).values({
    id: id("approval"),
    organizationId: orgId,
    executionId: waitingRun,
    stepId: waitingStep,
    nodeId: "n5",
    status: "pending",
    title: "[Demo] Send email to Demo Lead Gamma?",
    summary: "[Demo fixture] Draft outreach for Fieldwork Labs. This is seeded demo data, not a real person.",
    payload: { to: "lead-gamma@demo.example", demo: true },
  });

  const supportSuccess = await insertRun({
    workflowId: supportWf.workflowId,
    versionId: supportWf.versionId,
    status: "success",
    triggerType: "webhook",
    input: {
      demo: true,
      body: {
        email: "ticket-alpha@demo.example",
        subject: "[Demo] How do I export a run?",
        message: "[Demo fixture] The customer asked how to export a completed execution as JSON.",
      },
    },
    output: { status: "success", demo: true, label: "how-to" },
    createdAt: hoursAgo(8),
    durationMs: 9800,
  });

  await db.insert(executionSteps).values({
    id: id("step"),
    executionId: supportSuccess,
    nodeId: "n1",
    nodeType: "ai.classifier",
    name: "Classify",
    status: "success",
    input: { message: "[Demo fixture] export a run" },
    output: { label: "how-to", confidence: 0.91, demo: true },
    config: {},
    logs: [{ ts: hoursAgo(8).toISOString(), level: "info", message: "[Demo] Classified as how-to" }],
    startedAt: hoursAgo(8),
    endedAt: new Date(hoursAgo(8).getTime() + 1200),
    durationMs: 1200,
  });

  const supportFailed = await insertRun({
    workflowId: supportWf.workflowId,
    versionId: supportWf.versionId,
    status: "failed",
    triggerType: "webhook",
    input: {
      demo: true,
      body: {
        email: "ticket-beta@demo.example",
        subject: "[Demo] SSO timeout",
        message: "[Demo fixture] Simulated downstream outage for the demo workspace.",
      },
    },
    output: null,
    error: {
      message: "[Demo] HTTP 502 from downstream provider (seeded failure)",
      type: "ProviderError",
      nodeId: "n3",
    },
    createdAt: hoursAgo(5),
    durationMs: 4200,
  });

  await db.insert(executionSteps).values({
    id: id("step"),
    executionId: supportFailed,
    nodeId: "n3",
    nodeType: "ai.prompt",
    name: "Draft reply",
    status: "failed",
    input: { message: "[Demo fixture] SSO timeout" },
    output: null,
    error: { message: "[Demo] HTTP 502 from downstream provider (seeded failure)", type: "ProviderError" },
    config: {},
    logs: [{ ts: hoursAgo(5).toISOString(), level: "error", message: "[Demo] Provider returned 502" }],
    startedAt: hoursAgo(5),
    endedAt: new Date(hoursAgo(5).getTime() + 4200),
    durationMs: 4200,
  });

  await insertRun({
    workflowId: documentWf.workflowId,
    versionId: documentWf.versionId,
    status: "success",
    triggerType: "manual",
    input: {
      demo: true,
      filename: "demo-invoice-1042.txt",
      text: "[Demo fixture] Vendor: Demo Supplies Co. Amount: 1840. Invoice ID: DEMO-1042. Due: 2026-09-15.",
    },
    output: { vendor: "Demo Supplies Co", amount: 1840, invoiceId: "DEMO-1042", demo: true },
    createdAt: hoursAgo(10),
    durationMs: 6400,
  });

  await insertRun({
    workflowId: documentWf.workflowId,
    versionId: documentWf.versionId,
    status: "success",
    triggerType: "manual",
    input: {
      demo: true,
      filename: "demo-invoice-1043.txt",
      text: "[Demo fixture] Vendor: Northwind Demo Freight. Amount: 920. Invoice ID: DEMO-1043. Due: 2026-09-20.",
    },
    output: { vendor: "Northwind Demo Freight", amount: 920, invoiceId: "DEMO-1043", demo: true },
    createdAt: hoursAgo(3),
    durationMs: 5100,
  });

  await insertRun({
    workflowId: researchWf.workflowId,
    versionId: researchWf.versionId,
    status: "success",
    triggerType: "manual",
    input: {
      demo: true,
      question: "[Demo fixture] How should a mid-market team structure human approval in an inbound lead workflow?",
    },
    output: {
      demo: true,
      summary: "[Demo] Pause before outbound messages, resume from the approval node, keep the audit trail.",
    },
    createdAt: hoursAgo(12),
    durationMs: 15200,
  });

  await insertRun({
    workflowId: contentWf.workflowId,
    versionId: contentWf.versionId,
    status: "success",
    triggerType: "manual",
    input: {
      demo: true,
      topic: "Why human-in-the-loop belongs in AI workflows",
      audience: "operations leads (demo fixture)",
    },
    output: { demo: true, status: "approved" },
    createdAt: hoursAgo(14),
    durationMs: 22100,
  });

  const contentFailed = await insertRun({
    workflowId: contentWf.workflowId,
    versionId: contentWf.versionId,
    status: "failed",
    triggerType: "manual",
    input: {
      demo: true,
      topic: "",
      audience: "demo fixture",
    },
    output: null,
    error: {
      message: "[Demo] Topic is required before an outline can be generated (seeded validation failure)",
      type: "ValidationError",
      nodeId: "n1",
    },
    createdAt: hoursAgo(2),
    durationMs: 800,
  });

  await db.insert(executionSteps).values({
    id: id("step"),
    executionId: contentFailed,
    nodeId: "n1",
    nodeType: "ai.prompt",
    name: "Outline",
    status: "failed",
    input: { topic: "" },
    output: null,
    error: {
      message: "[Demo] Topic is required before an outline can be generated (seeded validation failure)",
      type: "ValidationError",
    },
    config: {},
    logs: [{ ts: hoursAgo(2).toISOString(), level: "error", message: "[Demo] Validation failed" }],
    startedAt: hoursAgo(2),
    endedAt: new Date(hoursAgo(2).getTime() + 800),
    durationMs: 800,
  });

  await db.insert(usageEvents).values([
    { id: id("usage"), organizationId: orgId, kind: "execution", quantity: 9, metadata: { demo: true } },
    { id: id("usage"), organizationId: orgId, kind: "ai.tokens", quantity: 184_220, metadata: { demo: true } },
    { id: id("usage"), organizationId: orgId, kind: "email.sent", quantity: 3, metadata: { demo: true } },
  ]);

  await db.insert(auditLogs).values([
    {
      id: id("audit"),
      organizationId: orgId,
      userId,
      action: "workflow.published",
      resourceType: "workflow",
      resourceId: leadWf.workflowId,
      metadata: { name: "Lead Qualification", demo: true },
    },
    {
      id: id("audit"),
      organizationId: orgId,
      userId,
      action: "demo.seeded",
      resourceType: "organization",
      resourceId: orgId,
      metadata: { demo: true, workspace: "FlowForge Demo" },
    },
  ]);
}
