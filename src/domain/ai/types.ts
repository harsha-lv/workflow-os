export type AIMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AICompletionRequest = {
  model?: string;
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  json?: boolean;
};

export type AICompletionResult = {
  text: string;
  json?: unknown;
  model: string;
  provider: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  mocked?: boolean;
};

export type AIProviderInfo = {
  id: string;
  name: string;
  models: Array<{ id: string; label: string }>;
  configured: boolean;
};

export interface AIProvider {
  readonly id: string;
  readonly name: string;
  readonly models: Array<{ id: string; label: string }>;
  complete(request: AICompletionRequest): Promise<AICompletionResult>;
}

export class ProviderError extends Error {
  readonly provider: string;
  readonly retryable: boolean;
  constructor(message: string, provider: string, retryable = true) {
    super(message);
    this.name = "ProviderError";
    this.provider = provider;
    this.retryable = retryable;
  }
}
