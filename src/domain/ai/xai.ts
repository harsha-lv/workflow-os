import OpenAI from "openai";
import { ProviderError, type AICompletionRequest, type AICompletionResult, type AIProvider } from "./types";

const DEFAULT_MODEL = "grok-4.6";

export class XaiProvider implements AIProvider {
  readonly id = "xai";
  readonly name = "SpaceXAI";
  readonly models = [
    { id: "grok-4.6", label: "Grok 4.6" },
    { id: "grok-4.5", label: "Grok 4.5" },
    { id: "grok-4.3", label: "Grok 4.3" },
  ];

  constructor(
    private readonly apiKey: string,
    private readonly baseURL = "https://api.x.ai/v1",
  ) {}

  async complete(request: AICompletionRequest): Promise<AICompletionResult> {
    const client = new OpenAI({ apiKey: this.apiKey, baseURL: this.baseURL });
    const model = request.model || process.env.XAI_MODEL || DEFAULT_MODEL;
    try {
      const response = await client.chat.completions.create({
        model,
        temperature: request.temperature ?? 0.2,
        max_tokens: request.maxTokens ?? 1200,
        messages: request.messages,
        ...(request.json ? { response_format: { type: "json_object" as const } } : {}),
      });
      const text = response.choices[0]?.message?.content ?? "";
      let json: unknown;
      if (request.json && text) {
        try {
          json = JSON.parse(text) as unknown;
        } catch {
          json = { raw: text };
        }
      }
      return {
        text,
        json,
        model: response.model || model,
        provider: this.id,
        usage: {
          inputTokens: response.usage?.prompt_tokens ?? 0,
          outputTokens: response.usage?.completion_tokens ?? 0,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "SpaceXAI request failed";
      throw new ProviderError(message, this.id, true);
    }
  }
}
