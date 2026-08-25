import type { WorkflowGraph } from "../graph";
import { runWorkflow } from "./run";
import type { EngineHooks, EngineRunResult } from "./types";

export async function resumeWorkflow(input: {
  graph: WorkflowGraph;
  trigger: unknown;
  variables?: Record<string, unknown>;
  previousOutputs: Record<string, unknown>;
  decision: { nodeId: string; branch?: string; output: unknown };
  hooks?: EngineHooks;
}): Promise<EngineRunResult> {
  return runWorkflow({
    graph: input.graph,
    trigger: input.trigger,
    variables: input.variables,
    hooks: {
      ...input.hooks,
      previousOutputs: input.previousOutputs,
      resumeDecision: input.decision,
    },
  });
}
