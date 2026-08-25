import type { AICompletionRequest, AICompletionResult, AIProvider } from "./types";

function extractJsonHint(prompt: string): unknown | null {
  const lowered = prompt.toLowerCase();
  if (lowered.includes("classif") || lowered.includes("categor")) {
    if (lowered.includes("lead") || lowered.includes("qualified")) {
      return {
        label: "qualified",
        confidence: 0.86,
        reasons: ["Company size and intent signal match the ICP", "Budget language is explicit"],
      };
    }
    if (lowered.includes("support") || lowered.includes("ticket") || lowered.includes("sentiment")) {
      return {
        category: "billing",
        sentiment: "frustrated",
        priority: "high",
        confidence: 0.81,
      };
    }
    return { label: "other", confidence: 0.62, reasons: ["Insufficient signal"] };
  }
  if (lowered.includes("extract")) {
    return {
      name: "Avery Lang",
      email: "avery.lang@northwind.dev",
      company: "Northwind Analytics",
      title: "Director of Operations",
      fields: { employees: 180, industry: "B2B SaaS" },
    };
  }
  if (lowered.includes("summar")) {
    return {
      summary: "The source material covers a customer request, the current status, and recommended next steps.",
      bullets: [
        "Customer asked for a follow-up with pricing context.",
        "Existing conversation shows buying intent.",
        "Recommended action: send a tailored reply and log the outcome.",
      ],
    };
  }
  return null;
}

export class MockAIProvider implements AIProvider {
  readonly id = "mock";
  readonly name = "Mock (no API key)";
  readonly models = [{ id: "mock-grok", label: "Mock Grok" }];

  async complete(request: AICompletionRequest): Promise<AICompletionResult> {
    const prompt = request.messages.map((m) => m.content).join("\n");
    const json = request.json ? extractJsonHint(prompt) : null;
    const text =
      json != null
        ? JSON.stringify(json, null, 2)
        : [
            "Draft generated without a live model key.",
            "",
            "Connect a SpaceXAI (xAI) key in Settings → Integrations to run this node against grok-4.6.",
            "",
            "Based on the provided context, the next action is ready for review.",
          ].join("\n");

    return {
      text,
      json: json ?? undefined,
      model: request.model ?? "mock-grok",
      provider: this.id,
      usage: {
        inputTokens: Math.ceil(prompt.length / 4),
        outputTokens: Math.ceil(text.length / 4),
      },
      mocked: true,
    };
  }
}
