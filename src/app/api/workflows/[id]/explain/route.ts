import { NextResponse } from "next/server";
import { requirePermission } from "@/server/context";
import { toErrorResponse } from "@/server/errors";
import { getWorkflow } from "@/server/services/workflows";
import { explainGraph, explainNode } from "@/domain/ops/copilot";
import { defaultProvider, envProviderConfig } from "@/domain/ai/registry";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requirePermission("workflows.read");
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as { nodeId?: string };
    const { draft, workflow } = await getWorkflow(ctx.org.id, id);
    const graph = draft?.definition.graph;
    if (!graph) return NextResponse.json({ text: "Nothing to explain yet." });
    if (body.nodeId) {
      const node = graph.nodes.find((n) => n.id === body.nodeId);
      if (!node) return NextResponse.json({ text: "That node is not in this draft." });
      return NextResponse.json({ text: explainNode(node.type, node.name) });
    }
    const baseline = explainGraph(graph);
    const provider = defaultProvider(envProviderConfig());
    if (provider.id === "mock") return NextResponse.json({ text: baseline, mocked: true });
    const result = await provider.complete({
      model: "grok-4.6",
      messages: [
        {
          role: "system",
          content: "Explain this workflow in two sentences for an operations lead. No marketing language.",
        },
        { role: "user", content: JSON.stringify({ name: workflow.name, nodes: graph.nodes.map((n) => ({ type: n.type, name: n.name })) }) },
      ],
    });
    return NextResponse.json({ text: result.text || baseline, mocked: result.mocked ?? false });
  } catch (error) {
    return toErrorResponse(error);
  }
}
