import { NextResponse } from "next/server";
import { requirePermission } from "@/server/context";
import { toErrorResponse } from "@/server/errors";
import { defaultProvider, envProviderConfig } from "@/domain/ai/registry";
import { heuristicCopilot, sanitizeCopilotGraph, type CopilotResult } from "@/domain/ops/copilot";
import { nodeDefinitions } from "@/domain/nodes/definitions";
import { ValidationError } from "@/domain/permissions";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("workflows.write");
    await params;
    const body = (await request.json()) as { prompt?: string };
    const prompt = body.prompt?.trim();
    if (!prompt) throw new ValidationError("Describe the workflow you want.");
    const fallback = heuristicCopilot(prompt);
    const provider = defaultProvider(envProviderConfig());
    if (provider.id === "mock") return NextResponse.json(fallback);
    const catalog = nodeDefinitions.map((d) => d.type).join(", ");
    const result = await provider.complete({
      model: "grok-4.6",
      json: true,
      messages: [
        {
          role: "system",
          content: `Return JSON { "explanation": string, "graph": { "nodes": [{ "id", "type", "name", "position": {"x","y"}, "config": {} }], "edges": [{ "id", "source", "target", "sourceHandle"? }] } }. Use only these node types: ${catalog}. Positions should be spaced ~260px apart on x.`,
        },
        { role: "user", content: prompt },
      ],
    });
    const parsed = (result.json ?? null) as { explanation?: string; graph?: unknown } | null;
    const graph = sanitizeCopilotGraph(parsed?.graph);
    const payload: CopilotResult = graph
      ? {
          graph,
          explanation: parsed?.explanation || fallback.explanation,
          mocked: result.mocked ?? false,
        }
      : fallback;
    return NextResponse.json(payload);
  } catch (error) {
    return toErrorResponse(error);
  }
}
