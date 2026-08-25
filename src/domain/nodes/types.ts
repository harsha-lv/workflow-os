import type { GraphNode } from "../graph";
import type { VariableScope } from "../expressions/evaluate";
import type { AIProvider } from "../ai/types";

export type NodeCategory =
  | "trigger"
  | "ai"
  | "logic"
  | "data"
  | "human"
  | "communication"
  | "output";

export type FieldType =
  | "string"
  | "text"
  | "number"
  | "boolean"
  | "select"
  | "json"
  | "expression"
  | "secret"
  | "model"
  | "duration"
  | "cron"
  | "code"
  | "multiselect";

export type ConfigField = {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  description?: string;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  default?: unknown;
  advanced?: boolean;
};

export type JsonSchema = {
  type: "object" | "string" | "number" | "boolean" | "array" | "any";
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  description?: string;
};

export type NodePort = {
  id: string;
  label: string;
};

export type NodeDefinition = {
  type: string;
  name: string;
  description: string;
  icon: string;
  category: NodeCategory;
  color: string;
  docs: string;
  isTrigger?: boolean;
  canPause?: boolean;
  inputs: number;
  outputs: NodePort[];
  configFields: ConfigField[];
  inputSchema: JsonSchema;
  outputSchema: JsonSchema;
};

export type LogLevel = "debug" | "info" | "warn" | "error";

export type NodeLog = {
  ts: string;
  level: LogLevel;
  message: string;
  data?: unknown;
};

export type PauseKind = "approval" | "delay" | "webhook" | "review";

export type NodeHandlerResult = {
  output: unknown;
  branch?: string;
  pause?: {
    kind: PauseKind;
    until?: Date;
    title?: string;
    summary?: string;
    payload?: unknown;
  };
  skipRest?: boolean;
};

export type NodeHandlerContext = {
  node: GraphNode;
  input: unknown;
  config: Record<string, unknown>;
  scope: VariableScope;
  ai: AIProvider;
  secrets: (name: string) => Promise<string | null>;
  http: (request: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: unknown;
    timeoutMs?: number;
  }) => Promise<{ status: number; headers: Record<string, string>; body: unknown }>;
  now: () => Date;
  log: (message: string, data?: unknown, level?: LogLevel) => void;
  recordUsage: (kind: string, quantity: number, metadata?: Record<string, unknown>) => void;
};

export type NodeHandler = (ctx: NodeHandlerContext) => Promise<NodeHandlerResult>;

export type RegisteredNode = {
  definition: NodeDefinition;
  handler: NodeHandler;
  validate?: (config: Record<string, unknown>) => string[];
};
