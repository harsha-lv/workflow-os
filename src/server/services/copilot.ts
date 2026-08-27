import { defaultProvider, envProviderConfig } from "@/domain/ai/registry";
import { heuristicCopilot, sanitizeCopilotGraph, type CopilotResult } from "@/domain/ops/copilot";
import { nodeDefinitions } from "@/domain/nodes/definitions";

export async function generateFromPrompt(prompt: string): Promise<CopilotResult> {
  const fallback = heuristicCopilot(prompt);
  const provider = defaultProvider(envProviderConfig());
  if (provider.id === "mock") return fallback;
  const catalog = nodeDefinitions.map((d) => d.type).join(", ");
  const result = await provider.complete({
    model: "grok-4.6",
    json: true,
    messages: [
      {
        role: "system",
        content: `Return JSON { "explanation": string, "graph": { "nodes": [{ "id", "type", "name", "position": {"x","y"}, "config": {} }], "edges": [{ "id", "source", "target", "sourceHandle"? }] } }. Use only these node types: ${catalog}. Positions should be spaced ~260px apart on x. Do not include secrets. Nothing is published or executed.`,
      },
      { role: "user", content: prompt },
    ],
  });
  const parsed = (result.json ?? null) as { explanation?: string; graph?: unknown } | null;
  const graph = sanitizeCopilotGraph(parsed?.graph);
  if (!graph) return fallback;
  return {
    graph,
    explanation: parsed?.explanation || fallback.explanation,
    mocked: result.mocked ?? false,
  };
}
