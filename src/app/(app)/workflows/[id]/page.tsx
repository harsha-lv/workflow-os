import { notFound } from "next/navigation";
import { requirePermission } from "@/server/context";
import { getWorkflow } from "@/server/services/workflows";
import { EditorShell } from "@/components/editor/editor-shell";
import { emptyGraph } from "@/domain/graph";

export default async function WorkflowEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requirePermission("workflows.write");
  const { id } = await params;
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
    />
  );
}
