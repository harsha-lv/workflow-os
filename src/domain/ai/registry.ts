import { MockAIProvider } from "./mock";
import { XaiProvider } from "./xai";
import type { AIProvider, AIProviderInfo } from "./types";

export type ProviderConfig = {
  xaiKey?: string;
  xaiBaseUrl?: string;
  openaiKey?: string;
  anthropicKey?: string;
  googleKey?: string;
};

export function listProviderInfo(config: ProviderConfig): AIProviderInfo[] {
  return [
    {
      id: "xai",
      name: "SpaceXAI",
      models: [
        { id: "grok-4.6", label: "Grok 4.6" },
        { id: "grok-4.5", label: "Grok 4.5" },
        { id: "grok-4.3", label: "Grok 4.3" },
      ],
      configured: Boolean(config.xaiKey),
    },
    {
      id: "openai",
      name: "OpenAI",
      models: [
        { id: "gpt-4.1", label: "GPT-4.1" },
        { id: "gpt-4o", label: "GPT-4o" },
      ],
      configured: Boolean(config.openaiKey),
    },
    {
      id: "anthropic",
      name: "Anthropic",
      models: [
        { id: "claude-sonnet-4-5", label: "Claude Sonnet 4.5" },
        { id: "claude-opus-4-5", label: "Claude Opus 4.5" },
      ],
      configured: Boolean(config.anthropicKey),
    },
    {
      id: "gemini",
      name: "Google Gemini",
      models: [{ id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" }],
      configured: Boolean(config.googleKey),
    },
    {
      id: "mock",
      name: "Mock (local)",
      models: [{ id: "mock-grok", label: "Mock Grok" }],
      configured: true,
    },
  ];
}

export function getProvider(id: string | undefined, config: ProviderConfig): AIProvider {
  if (id === "mock") return new MockAIProvider();
  if ((id === "xai" || !id) && config.xaiKey) {
    return new XaiProvider(config.xaiKey, config.xaiBaseUrl);
  }
  if (id === "openai" && config.openaiKey) {
    return new XaiProvider(config.openaiKey, "https://api.openai.com/v1");
  }
  // Unconfigured providers fall back to mock so local development still runs.
  // Node outputs are marked mocked: true so the UI never pretends they were live.
  return new MockAIProvider();
}

export function defaultProvider(config: ProviderConfig): AIProvider {
  if (config.xaiKey) return new XaiProvider(config.xaiKey, config.xaiBaseUrl);
  return new MockAIProvider();
}

export function envProviderConfig(): ProviderConfig {
  return {
    xaiKey: process.env.XAI_API_KEY || undefined,
    xaiBaseUrl: process.env.XAI_BASE_URL || "https://api.x.ai/v1",
    openaiKey: process.env.OPENAI_API_KEY || undefined,
    anthropicKey: process.env.ANTHROPIC_API_KEY || undefined,
    googleKey: process.env.GOOGLE_API_KEY || undefined,
  };
}
