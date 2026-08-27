import { requirePermission } from "@/server/context";
import { AiBuilder } from "@/components/start/ai-builder";

export default async function AiWorkflowPage({
  searchParams,
}: {
  searchParams: Promise<{ prompt?: string }>;
}) {
  await requirePermission("workflows.write");
  const { prompt } = await searchParams;
  return (
    <div className="page-stack px-1 py-2">
      <AiBuilder initialPrompt={prompt ?? ""} />
    </div>
  );
}
