import { and, desc, eq } from "drizzle-orm";
import { ensureMigrated } from "@/db/client";
import {
  projects,
  workflowEdges,
  workflowNodes,
  workflowVersions,
  workflows,
} from "@/db/schema";
import { emptyGraph, type WorkflowGraph, type WorkflowStatus } from "@/domain/graph";
import { id } from "@/domain/ids";
import { NotFoundError, ValidationError } from "@/domain/permissions";
import { validateGraph } from "@/domain/workflow/validate";
import { hashDefinition } from "@/server/hash";
import { writeAudit } from "@/server/audit";
import { randomToken } from "@/server/crypto";
import { templateLibrary } from "@/domain/templates/library";

export async function listWorkflows(orgId: string) {
  const db = await ensureMigrated();
  return db.query.workflows.findMany({
    where: eq(workflows.organizationId, orgId),
    orderBy: [desc(workflows.updatedAt)],
  });
}

export async function getWorkflow(orgId: string, workflowId: string) {
  const db = await ensureMigrated();
  const workflow = await db.query.workflows.findFirst({
    where: and(eq(workflows.id, workflowId), eq(workflows.organizationId, orgId)),
  });
  if (!workflow) throw new NotFoundError("Workflow not found");
  const versions = await db.query.workflowVersions.findMany({
    where: eq(workflowVersions.workflowId, workflow.id),
    orderBy: [desc(workflowVersions.version)],
  });
  const draft = versions[0] ?? null;
  const published = workflow.publishedVersionId
    ? versions.find((v) => v.id === workflow.publishedVersionId) ?? null
    : null;
  return { workflow, versions, draft, published };
}

export async function createWorkflow(input: {
  orgId: string;
  userId: string;
  projectId?: string;
  name: string;
  description?: string;
  templateSlug?: string;
  graph?: WorkflowGraph;
}) {
  const db = await ensureMigrated();
  let projectId = input.projectId;
  if (!projectId) {
    const project = await db.query.projects.findFirst({
      where: eq(projects.organizationId, input.orgId),
    });
    if (!project) throw new ValidationError("Create a project first");
    projectId = project.id;
  }
  const tpl = input.templateSlug
    ? templateLibrary.find((t) => t.slug === input.templateSlug)
    : undefined;
  const graph = input.graph ?? tpl?.graph ?? emptyGraph();
  const name = input.name || tpl?.name || "Untitled workflow";
  const description = input.description ?? tpl?.description ?? "";
  const workflowId = id("workflow");
  const versionId = id("version");
  const definition = { name, description, graph };
  await db.insert(workflows).values({
    id: workflowId,
    organizationId: input.orgId,
    projectId,
    name,
    description,
    status: "draft",
    webhookToken: randomToken(18),
    createdBy: input.userId,
  });
  await db.insert(workflowVersions).values({
    id: versionId,
    workflowId,
    version: 1,
    definition,
    hash: hashDefinition(definition),
    createdBy: input.userId,
  });
  await persistGraphRows(versionId, graph);
  await writeAudit({
    organizationId: input.orgId,
    userId: input.userId,
    action: "workflow.created",
    resourceType: "workflow",
    resourceId: workflowId,
    metadata: { name, template: input.templateSlug },
  });
  return workflowId;
}

export async function saveDraft(input: {
  orgId: string;
  userId: string;
  workflowId: string;
  name?: string;
  description?: string;
  graph: WorkflowGraph;
}) {
  const db = await ensureMigrated();
  const { workflow, draft } = await getWorkflow(input.orgId, input.workflowId);
  if (!draft) throw new NotFoundError("Draft version missing");
  const name = input.name ?? workflow.name;
  const description = input.description ?? workflow.description;
  const definition = { name, description, graph: input.graph };
  const nextHash = hashDefinition(definition);
  const publishedLocked = workflow.publishedVersionId === draft.id;
  if (publishedLocked) {
    const versionId = id("version");
    await db.insert(workflowVersions).values({
      id: versionId,
      workflowId: workflow.id,
      version: draft.version + 1,
      definition,
      hash: nextHash,
      createdBy: input.userId,
    });
    await persistGraphRows(versionId, input.graph);
  } else {
    await db
      .update(workflowVersions)
      .set({ definition, hash: nextHash })
      .where(eq(workflowVersions.id, draft.id));
    await db.delete(workflowNodes).where(eq(workflowNodes.versionId, draft.id));
    await db.delete(workflowEdges).where(eq(workflowEdges.versionId, draft.id));
    await persistGraphRows(draft.id, input.graph);
  }
  await db
    .update(workflows)
    .set({ name, description, updatedAt: new Date() })
    .where(eq(workflows.id, workflow.id));
  await writeAudit({
    organizationId: input.orgId,
    userId: input.userId,
    action: "workflow.edited",
    resourceType: "workflow",
    resourceId: workflow.id,
  });
}

export async function publishWorkflow(orgId: string, userId: string, workflowId: string) {
  const db = await ensureMigrated();
  const { workflow, draft } = await getWorkflow(orgId, workflowId);
  if (!draft) throw new NotFoundError("Nothing to publish");
  const issues = validateGraph(draft.definition.graph);
  if (!issues.ok) {
    throw new ValidationError("Workflow cannot be published until errors are resolved.", issues.issues);
  }
  await db
    .update(workflowVersions)
    .set({ publishedAt: new Date() })
    .where(eq(workflowVersions.id, draft.id));
  await db
    .update(workflows)
    .set({
      status: "published" satisfies WorkflowStatus,
      publishedVersionId: draft.id,
      updatedAt: new Date(),
    })
    .where(eq(workflows.id, workflow.id));
  await writeAudit({
    organizationId: orgId,
    userId,
    action: "workflow.published",
    resourceType: "workflow",
    resourceId: workflow.id,
    metadata: { version: draft.version },
  });
}

export async function cloneWorkflow(orgId: string, userId: string, workflowId: string) {
  const { workflow, draft } = await getWorkflow(orgId, workflowId);
  return createWorkflow({
    orgId,
    userId,
    projectId: workflow.projectId,
    name: `${workflow.name} — Copy`,
    description: workflow.description,
    graph: draft?.definition.graph,
  });
}

export async function setWorkflowStatus(
  orgId: string,
  userId: string,
  workflowId: string,
  status: WorkflowStatus,
) {
  const db = await ensureMigrated();
  const { workflow } = await getWorkflow(orgId, workflowId);
  if (status === "paused" && workflow.status !== "published") {
    throw new ValidationError("Only published workflows can be paused.");
  }
  await db.update(workflows).set({ status, updatedAt: new Date() }).where(eq(workflows.id, workflow.id));
  await writeAudit({
    organizationId: orgId,
    userId,
    action: status === "paused" ? "workflow.paused" : "workflow.status",
    resourceType: "workflow",
    resourceId: workflow.id,
    metadata: { status },
  });
}

export async function archiveWorkflow(orgId: string, userId: string, workflowId: string) {
  const db = await ensureMigrated();
  const { workflow } = await getWorkflow(orgId, workflowId);
  await db.update(workflows).set({ status: "archived", updatedAt: new Date() }).where(eq(workflows.id, workflow.id));
  await writeAudit({
    organizationId: orgId,
    userId,
    action: "workflow.archived",
    resourceType: "workflow",
    resourceId: workflow.id,
  });
}

export async function deleteWorkflow(orgId: string, userId: string, workflowId: string) {
  const db = await ensureMigrated();
  const { workflow } = await getWorkflow(orgId, workflowId);
  await db.delete(workflows).where(eq(workflows.id, workflow.id));
  await writeAudit({
    organizationId: orgId,
    userId,
    action: "workflow.deleted",
    resourceType: "workflow",
    resourceId: workflow.id,
  });
}

async function persistGraphRows(versionId: string, graph: WorkflowGraph) {
  const db = await ensureMigrated();
  if (graph.nodes.length) {
    await db.insert(workflowNodes).values(
      graph.nodes.map((node) => ({
        id: id("node"),
        versionId,
        nodeKey: node.id,
        type: node.type,
        name: node.name,
        config: node.config,
        positionX: Math.round(node.position.x),
        positionY: Math.round(node.position.y),
        disabled: Boolean(node.disabled),
      })),
    );
  }
  if (graph.edges.length) {
    await db.insert(workflowEdges).values(
      graph.edges.map((edge) => ({
        id: id("edge"),
        versionId,
        edgeKey: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle ?? null,
        targetHandle: edge.targetHandle ?? null,
        label: edge.label ?? null,
      })),
    );
  }
}
