import { notFound } from "next/navigation";
import { requirePermission } from "@/server/context";
import { getWorkflow } from "@/server/services/workflows";
import { EditorShell } from "@/components/editor/editor-shell";
import { emptyGraph } from "@/domain/graph";
import { publicAppUrl } from "@/server/config";

export default async function WorkflowEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ai?: string; test?: string; publish?: string; setup?: string }>;
}) {
  const ctx = await requirePermission("workflows.write");
  const { id } = await params;
  const query = await searchParams;
  let workflow;
  let draft;
  try {
    const loaded = await getWorkflow(ctx.org.id, id);
    workflow = loaded.workflow;
    draft = loaded.draft;
  } catch {
    notFound();
  }
  return (
    <EditorShell
      workflowId={workflow.id}
      name={workflow.name}
      description={workflow.description}
      graph={draft?.definition.graph ?? emptyGraph()}
      webhookToken={workflow.webhookToken}
      webhookBaseUrl={publicAppUrl()}
      initialCopilot={query.ai === "1"}
      initialTest={query.test === "1"}
      initialPublish={query.publish === "1"}
      initialSetup={Boolean(query.setup)}
      verifyOnChain={Boolean(workflow.verifyOnChain)}
    />
  );
}
