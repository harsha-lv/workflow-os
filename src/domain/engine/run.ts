import type { GraphEdge, GraphNode, WorkflowGraph } from "../graph";
import type { VariableScope } from "../expressions/evaluate";
import { resolveConfigValue } from "../expressions/evaluate";
import { getNodeDefinition } from "../nodes/definitions";
import { getNodeHandler } from "../nodes/handlers";
import { defaultProvider, envProviderConfig } from "../ai/registry";
import { hasCycle } from "../workflow/validate";
import type { EngineInput, EngineRunResult, EngineStepResult } from "./types";
import type { NodeLog } from "../nodes/types";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function outgoing(graph: WorkflowGraph, nodeId: string, branch?: string): GraphEdge[] {
  return graph.edges.filter((edge) => {
    if (edge.source !== nodeId) return false;
    if (!branch) return !edge.sourceHandle || edge.sourceHandle === "out";
    return edge.sourceHandle === branch || (!edge.sourceHandle && branch === "out");
  });
}

function incoming(graph: WorkflowGraph, nodeId: string): GraphEdge[] {
  return graph.edges.filter((edge) => edge.target === nodeId);
}

function findTriggers(graph: WorkflowGraph): GraphNode[] {
  return graph.nodes.filter((n) => getNodeDefinition(n.type)?.isTrigger);
}

function errorType(error: unknown): string {
  if (error && typeof error === "object" && "name" in error && typeof error.name === "string") {
    return error.name;
  }
  return "Error";
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

async function defaultHttp(request: {
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
}): Promise<{ status: number; headers: Record<string, string>; body: unknown }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), request.timeoutMs ?? 15000);
  try {
    const init: RequestInit = {
      method: request.method,
      headers: request.headers,
      signal: controller.signal,
    };
    if (request.body !== undefined && request.method !== "GET" && request.method !== "HEAD") {
      init.body = typeof request.body === "string" ? request.body : JSON.stringify(request.body);
      init.headers = { "content-type": "application/json", ...request.headers };
    }
    const response = await fetch(request.url, init);
    const text = await response.text();
    let body: unknown = text;
    try {
      body = text ? (JSON.parse(text) as unknown) : null;
    } catch {
      body = text;
    }
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    return { status: response.status, headers, body };
  } finally {
    clearTimeout(timeout);
  }
}

export async function runWorkflow(input: EngineInput): Promise<EngineRunResult> {
  const { graph } = input;
  if (hasCycle(graph)) {
    return {
      status: "failed",
      output: null,
      error: { message: "Workflow graph contains a cycle", type: "ValidationError" },
      steps: [],
    };
  }

  const now = input.hooks?.now ?? (() => new Date());
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));
  const outputs: Record<string, unknown> = { ...(input.hooks?.previousOutputs ?? {}) };
  const skipped = new Set<string>();
  const completed = new Set<string>(Object.keys(input.hooks?.previousOutputs ?? {}));
  const steps: EngineStepResult[] = [];
  const scope: VariableScope = {
    trigger: input.trigger,
    nodes: outputs,
    vars: { ...(input.variables ?? {}) },
    env: input.env ?? {},
    input: input.trigger,
    now: now().toISOString(),
  };

  let start = input.startNodeId
    ? nodeMap.get(input.startNodeId)
    : findTriggers(graph)[0];

  if (input.hooks?.resumeDecision) {
    const resumed = nodeMap.get(input.hooks.resumeDecision.nodeId);
    if (resumed) {
      outputs[resumed.id] = input.hooks.resumeDecision.output;
      outputs[resumed.name] = input.hooks.resumeDecision.output;
      completed.add(resumed.id);
      start = undefined;
      const branch = input.hooks.resumeDecision.branch;
      const nextIds = outgoing(graph, resumed.id, branch).map((e) => e.target);
      start = nextIds[0] ? nodeMap.get(nextIds[0]) : undefined;
      // We'll walk from successors of the resumed node
      const queue: string[] = nextIds;
      return walk(queue);
    }
  }

  async function executeNode(node: GraphNode, inbound: unknown): Promise<EngineStepResult> {
    const logs: NodeLog[] = [];
    const started = now();
    const attempt = 1;
    const resolvedConfig = resolveConfigValue(node.config, { ...scope, input: inbound }) as Record<
      string,
      unknown
    >;
    const step: EngineStepResult = {
      nodeId: node.id,
      nodeType: node.type,
      name: node.name,
      status: "running",
      attempt,
      input: inbound,
      output: null,
      config: resolvedConfig,
      logs,
      startedAt: started.toISOString(),
    };

    if (node.disabled) {
      step.status = "skipped";
      step.endedAt = now().toISOString();
      step.durationMs = 0;
      return step;
    }

    const policy = node.errorPolicy ?? { onError: "stop" as const };
    const retries = policy.onError === "retry" ? Math.max(0, policy.retries ?? 2) : 0;
    const handler = getNodeHandler(node.type);
    const ai = defaultProvider(envProviderConfig());

    let lastError: unknown;
    for (let i = 0; i <= retries; i += 1) {
      step.attempt = i + 1;
      try {
        const result = await handler({
          node,
          input: inbound,
          config: resolvedConfig,
          scope,
          ai,
          secrets: input.hooks?.secrets ?? (async () => null),
          http: input.hooks?.http ?? defaultHttp,
          now,
          log: (message, data, level = "info") => {
            logs.push({ ts: now().toISOString(), level, message, data });
          },
          recordUsage: input.hooks?.recordUsage ?? (() => undefined),
        });
        step.output = result.output;
        step.branch = result.branch;
        if (result.pause) {
          step.status = "waiting";
          step.pause = {
            kind: result.pause.kind,
            until: result.pause.until?.toISOString(),
            title: result.pause.title,
            summary: result.pause.summary,
            payload: result.pause.payload,
          };
        } else {
          step.status = "success";
        }
        lastError = undefined;
        break;
      } catch (error) {
        lastError = error;
        logs.push({
          ts: now().toISOString(),
          level: "error",
          message: errorMessage(error),
          data: { type: errorType(error), attempt: i + 1 },
        });
        if (i < retries) {
          await sleep(policy.retryDelayMs ?? 250);
        }
      }
    }

    if (lastError) {
      step.status = "failed";
      step.error = {
        message: errorMessage(lastError),
        type: errorType(lastError),
      };
      if (policy.onError === "continue") {
        step.status = "success";
        step.output = { error: step.error, continued: true };
        logs.push({ ts: now().toISOString(), level: "warn", message: "Continuing after error per node policy." });
      }
    }

    const ended = now();
    step.endedAt = ended.toISOString();
    step.durationMs = ended.getTime() - started.getTime();
    return step;
  }

  async function runLoopItems(node: GraphNode, items: unknown[], successors: string[]): Promise<EngineRunResult | null> {
    if (successors.length !== 1) return null;
    const target = nodeMap.get(successors[0]!);
    if (!target) return null;
    const collected: unknown[] = [];
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      scope.vars.item = item;
      scope.vars.index = index;
      const step = await executeNode(target, { item, index, items });
      steps.push(step);
      await input.hooks?.onStep?.(step);
      if (step.status === "failed") {
        return {
          status: "failed",
          output: null,
          error: { message: step.error?.message ?? "Loop item failed", type: step.error?.type ?? "Error", nodeId: target.id },
          steps,
        };
      }
      if (step.status === "waiting") {
        return {
          status: "waiting",
          output: collected,
          steps,
          resumeFrom: target.id,
          waitUntil: step.pause?.until,
        };
      }
      collected.push(step.output);
    }
    outputs[target.id] = { items: collected };
    outputs[target.name] = { items: collected };
    completed.add(target.id);
    return null;
  }

  async function walk(initialQueue: string[]): Promise<EngineRunResult> {
    const queue = [...initialQueue];
    const queued = new Set(queue);

    const enqueue = (id: string) => {
      if (queued.has(id) || completed.has(id) || skipped.has(id)) return;
      queued.add(id);
      queue.push(id);
    };

    while (queue.length) {
      const nodeId = queue.shift()!;
      const node = nodeMap.get(nodeId);
      if (!node || completed.has(nodeId) || skipped.has(nodeId)) continue;

      const inboundEdges = incoming(graph, nodeId);
      const ready = inboundEdges.every(
        (edge) => completed.has(edge.source) || skipped.has(edge.source),
      );
      if (inboundEdges.length > 0 && !ready) {
        queue.push(nodeId);
        // prevent infinite spin if nothing else progresses
        if (queue.every((id) => incoming(graph, id).some((e) => !completed.has(e.source) && !skipped.has(e.source)))) {
          break;
        }
        continue;
      }

      const inboundValues = inboundEdges
        .filter((edge) => completed.has(edge.source))
        .map((edge) => outputs[edge.source]);
      const inbound =
        inboundValues.length === 0
          ? input.trigger
          : inboundValues.length === 1
            ? inboundValues[0]
            : inboundValues;

      scope.input = inbound;
      const step = await executeNode(node, inbound);
      steps.push(step);
      await input.hooks?.onStep?.(step);

      if (step.status === "failed") {
        const policy = node.errorPolicy ?? { onError: "stop" as const };
        if (policy.onError === "fallback" && policy.fallbackTarget) {
          skipped.add(node.id);
          enqueue(policy.fallbackTarget);
          continue;
        }
        return {
          status: "failed",
          output: null,
          error: {
            message: step.error?.message ?? "Node failed",
            type: step.error?.type ?? "Error",
            nodeId: node.id,
            details: step.error?.details,
          },
          steps,
        };
      }

      if (step.status === "waiting") {
        outputs[node.id] = step.output;
        return {
          status: "waiting",
          output: step.output,
          steps,
          resumeFrom: node.id,
          waitUntil: step.pause?.until,
        };
      }

      outputs[node.id] = step.output;
      outputs[node.name] = step.output;
      completed.add(node.id);

      if (node.type === "logic.loop") {
        const items = (step.output as { items?: unknown[] } | null)?.items;
        if (Array.isArray(items) && items.length > 0) {
          const succ = outgoing(graph, node.id, "out").map((e) => e.target);
          const looped = await runLoopItems(node, items, succ);
          if (looped) return looped;
          if (succ[0]) {
            const after = outgoing(graph, succ[0]).map((e) => e.target);
            after.forEach(enqueue);
            continue;
          }
        }
      }

      const branch = step.branch;
      const nextEdges = outgoing(graph, node.id, branch);
      const allEdges = graph.edges.filter((e) => e.source === node.id);
      for (const edge of allEdges) {
        if (!nextEdges.includes(edge)) {
          // Skip only the unreachable branch heads; descendants skipped lazily
          skipped.add(`branch:${edge.id}`);
        }
      }
      if (branch) {
        for (const edge of allEdges) {
          if (edge.sourceHandle && edge.sourceHandle !== branch) {
            markUnreachable(edge.target, new Set([node.id]));
          }
        }
      }
      nextEdges.forEach((edge) => enqueue(edge.target));
    }

    const last = steps.filter((s) => s.status === "success").at(-1);
    return {
      status: "success",
      output: last?.output ?? input.trigger,
      steps,
    };
  }

  function markUnreachable(nodeId: string, seen: Set<string>): void {
    if (seen.has(nodeId)) return;
    seen.add(nodeId);
    const stillReachable = incoming(graph, nodeId).some(
      (e) => completed.has(e.source) || (!skipped.has(e.source) && !seen.has(e.source)),
    );
    if (stillReachable && incoming(graph, nodeId).length > 1) return;
    skipped.add(nodeId);
    for (const edge of outgoing(graph, nodeId)) markUnreachable(edge.target, seen);
  }

  if (!start && !input.hooks?.resumeDecision) {
    return {
      status: "failed",
      output: null,
      error: { message: "Workflow has no trigger", type: "ValidationError" },
      steps: [],
    };
  }

  const initial = start ? [start.id] : [];
  return walk(initial);
}
