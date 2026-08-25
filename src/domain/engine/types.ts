import type { ExecutionStatus, StepStatus, WorkflowGraph } from "../graph";
import type { NodeLog, PauseKind } from "../nodes/types";

export type EngineStepResult = {
  nodeId: string;
  nodeType: string;
  name: string;
  status: StepStatus;
  attempt: number;
  input: unknown;
  output: unknown;
  config: Record<string, unknown>;
  error?: { message: string; type: string; details?: unknown };
  logs: NodeLog[];
  startedAt: string;
  endedAt?: string;
  durationMs?: number;
  branch?: string;
  pause?: { kind: PauseKind; until?: string; title?: string; summary?: string; payload?: unknown };
};

export type EngineRunResult = {
  status: ExecutionStatus;
  output: unknown;
  error?: { message: string; type: string; nodeId?: string; details?: unknown };
  steps: EngineStepResult[];
  resumeFrom?: string;
  waitUntil?: string;
};

export type EngineHooks = {
  now?: () => Date;
  secrets?: (name: string) => Promise<string | null>;
  http?: (request: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: unknown;
    timeoutMs?: number;
  }) => Promise<{ status: number; headers: Record<string, string>; body: unknown }>;
  recordUsage?: (kind: string, quantity: number, metadata?: Record<string, unknown>) => void;
  onStep?: (step: EngineStepResult) => Promise<void> | void;
  previousOutputs?: Record<string, unknown>;
  resumeDecision?: {
    nodeId: string;
    branch?: string;
    output: unknown;
  };
};

export type EngineInput = {
  graph: WorkflowGraph;
  trigger: unknown;
  variables?: Record<string, unknown>;
  env?: Record<string, string>;
  startNodeId?: string;
  hooks?: EngineHooks;
};
