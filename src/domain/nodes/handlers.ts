import { evaluateExpression, interpolate, resolveConfigValue, type VariableScope } from "../expressions/evaluate";
import { getProvider, type ProviderConfig } from "../ai/registry";
import type { NodeHandler, NodeHandlerContext } from "./types";

function str(value: unknown, fallback = ""): string {
  if (value == null) return fallback;
  return typeof value === "string" ? value : JSON.stringify(value);
}

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function interpolateMaybe(value: unknown, scope: VariableScope): unknown {
  return resolveConfigValue(value, scope);
}

async function runModel(
  ctx: NodeHandlerContext,
  config: Record<string, unknown>,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  json = false,
) {
  const providerId = str(config.provider, "xai");
  const envConfig: ProviderConfig = {
    xaiKey: process.env.XAI_API_KEY,
    xaiBaseUrl: process.env.XAI_BASE_URL,
    openaiKey: process.env.OPENAI_API_KEY,
    anthropicKey: process.env.ANTHROPIC_API_KEY,
    googleKey: process.env.GOOGLE_API_KEY,
  };
  const provider = getProvider(providerId, envConfig);
  const result = await provider.complete({
    model: str(config.model, "grok-4.6"),
    messages,
    temperature: num(config.temperature, 0.2),
    json,
  });
  ctx.recordUsage("ai.tokens", result.usage.inputTokens + result.usage.outputTokens, {
    provider: result.provider,
    model: result.model,
  });
  if (result.mocked) {
    ctx.log("Ran against the mock provider because no live API key is configured.", { provider: result.provider }, "warn");
  }
  return result;
}

const manualTrigger: NodeHandler = async (ctx) => ({ output: ctx.input ?? ctx.config.sampleInput ?? {} });

const scheduleTrigger: NodeHandler = async (ctx) => ({
  output: {
    scheduledFor: ctx.now().toISOString(),
    cron: ctx.config.cron ?? "0 9 * * 1-5",
  },
});

const webhookTrigger: NodeHandler = async (ctx) => ({ output: ctx.input ?? {} });
const formTrigger: NodeHandler = async (ctx) => ({ output: ctx.input ?? {} });

const aiPrompt: NodeHandler = async (ctx) => {
  const prompt = str(interpolateMaybe(ctx.config.prompt, ctx.scope));
  const system = str(interpolateMaybe(ctx.config.system, ctx.scope));
  const messages = [
    ...(system ? [{ role: "system" as const, content: system }] : []),
    { role: "user" as const, content: prompt },
  ];
  const result = await runModel(ctx, ctx.config, messages, Boolean(ctx.config.json));
  return {
    output: {
      text: result.text,
      json: result.json ?? null,
      model: result.model,
      provider: result.provider,
      usage: result.usage,
      mocked: result.mocked ?? false,
    },
  };
};

const aiClassifier: NodeHandler = async (ctx) => {
  const labels = Array.isArray(ctx.config.labels) ? ctx.config.labels : ["other"];
  const source = interpolateMaybe(ctx.config.input ?? ctx.input, ctx.scope);
  const result = await runModel(
    ctx,
    ctx.config,
    [
      {
        role: "system",
        content: `Classify the input into exactly one of these labels: ${JSON.stringify(labels)}. Return JSON { "label": string, "confidence": number, "reasons": string[] }.`,
      },
      { role: "user", content: typeof source === "string" ? source : JSON.stringify(source) },
    ],
    true,
  );
  const json = asRecord(result.json);
  const label = str(json.label, str(labels[0], "other"));
  return {
    output: {
      label,
      confidence: num(json.confidence, 0.5),
      reasons: Array.isArray(json.reasons) ? json.reasons : [],
      raw: result.text,
      mocked: result.mocked ?? false,
    },
  };
};

const aiExtractor: NodeHandler = async (ctx) => {
  const schema = ctx.config.schema ?? { text: "string" };
  const source = interpolateMaybe(ctx.config.input ?? ctx.input, ctx.scope);
  const result = await runModel(
    ctx,
    ctx.config,
    [
      {
        role: "system",
        content: `Extract fields matching this schema: ${JSON.stringify(schema)}. Return JSON only.`,
      },
      { role: "user", content: typeof source === "string" ? source : JSON.stringify(source) },
    ],
    true,
  );
  return { output: { ...(asRecord(result.json)), mocked: result.mocked ?? false, raw: result.text } };
};

const aiSummarizer: NodeHandler = async (ctx) => {
  const source = interpolateMaybe(ctx.config.input ?? ctx.input, ctx.scope);
  const style = str(ctx.config.style, "bullets");
  const result = await runModel(
    ctx,
    ctx.config,
    [
      {
        role: "system",
        content: `Summarize in ${style} style. Return JSON { "summary": string, "bullets": string[] }.`,
      },
      { role: "user", content: typeof source === "string" ? source : JSON.stringify(source) },
    ],
    true,
  );
  const json = asRecord(result.json);
  return {
    output: {
      summary: str(json.summary, result.text),
      bullets: Array.isArray(json.bullets) ? json.bullets : [],
      mocked: result.mocked ?? false,
    },
  };
};

const aiAgent: NodeHandler = async (ctx) => {
  const goal = str(interpolateMaybe(ctx.config.goal, ctx.scope));
  const context = interpolateMaybe(ctx.config.context ?? ctx.input, ctx.scope);
  const result = await runModel(
    ctx,
    ctx.config,
    [
      {
        role: "system",
        content:
          "You are a careful operations agent. Solve the goal. Return JSON { \"result\": string, \"actions\": string[] }.",
      },
      { role: "user", content: `Goal: ${goal}\nContext: ${typeof context === "string" ? context : JSON.stringify(context)}` },
    ],
    true,
  );
  const json = asRecord(result.json);
  return {
    output: {
      result: str(json.result, result.text),
      actions: Array.isArray(json.actions) ? json.actions : [],
      mocked: result.mocked ?? false,
    },
  };
};

const logicCondition: NodeHandler = async (ctx) => {
  const expr = str(ctx.config.expression);
  const result = Boolean(evaluateExpression(expr, ctx.scope));
  ctx.log(`Condition evaluated to ${result}`, { expression: expr });
  return { output: { result, input: ctx.input }, branch: result ? "true" : "false" };
};

const logicSwitch: NodeHandler = async (ctx) => {
  const value = interpolateMaybe(ctx.config.value, ctx.scope);
  const cases = Array.isArray(ctx.config.cases) ? ctx.config.cases.map(String) : [];
  const matched = cases.find((c) => c === String(value)) ?? "default";
  return { output: { value, matched }, branch: matched };
};

const logicLoop: NodeHandler = async (ctx) => {
  const raw = interpolateMaybe(ctx.config.items, ctx.scope);
  const items = Array.isArray(raw) ? raw : [];
  const maxItems = num(ctx.config.maxItems, 50);
  const sliced = items.slice(0, maxItems);
  ctx.log(`Looping over ${sliced.length} items`);
  return { output: { items: sliced, count: sliced.length } };
};

const logicDelay: NodeHandler = async (ctx) => {
  const ms = Math.max(0, num(ctx.config.ms, 1000));
  if (ms <= 25) {
    return { output: { resumedAt: ctx.now().toISOString(), delayedMs: ms } };
  }
  return {
    output: { delayedMs: ms },
    pause: { kind: "delay", until: new Date(ctx.now().getTime() + ms) },
  };
};

const logicFilter: NodeHandler = async (ctx) => {
  const raw = interpolateMaybe(ctx.config.items, ctx.scope);
  const items = Array.isArray(raw) ? raw : [];
  const expr = str(ctx.config.expression, "true");
  const kept: unknown[] = [];
  for (const item of items) {
    const scope: VariableScope = { ...ctx.scope, vars: { ...ctx.scope.vars, item } };
    if (evaluateExpression(expr, scope)) kept.push(item);
  }
  return { output: { items: kept, dropped: items.length - kept.length } };
};

const logicMerge: NodeHandler = async (ctx) => {
  const strategy = str(ctx.config.strategy, "object");
  const input = ctx.input;
  if (strategy === "array") {
    return { output: Array.isArray(input) ? input : [input] };
  }
  if (Array.isArray(input)) {
    return { output: Object.assign({}, ...input.filter((v) => v && typeof v === "object")) };
  }
  return { output: input ?? {} };
};

const dataSet: NodeHandler = async (ctx) => {
  const name = str(ctx.config.name);
  const value = interpolateMaybe(ctx.config.value, ctx.scope);
  ctx.scope.vars[name] = value;
  return { output: { name, value } };
};

const dataTransform: NodeHandler = async (ctx) => {
  const mapping = asRecord(ctx.config.mapping);
  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(mapping)) {
    output[key] = interpolateMaybe(value, ctx.scope);
  }
  return { output };
};

const dataJson: NodeHandler = async (ctx) => {
  const value = interpolateMaybe(ctx.config.value ?? ctx.input, ctx.scope);
  if (ctx.config.mode === "stringify") {
    return { output: { text: JSON.stringify(value) } };
  }
  if (typeof value === "string") return { output: JSON.parse(value) as unknown };
  return { output: value };
};

const dataHttp: NodeHandler = async (ctx) => {
  const url = str(interpolateMaybe(ctx.config.url, ctx.scope));
  const method = str(ctx.config.method, "GET").toUpperCase();
  const headers = asRecord(interpolateMaybe(ctx.config.headers ?? {}, ctx.scope)) as Record<string, string>;
  const body = ctx.config.body != null ? interpolateMaybe(ctx.config.body, ctx.scope) : undefined;
  const response = await ctx.http({
    method,
    url,
    headers,
    body,
    timeoutMs: num(ctx.config.timeoutMs, 15000),
  });
  ctx.log(`HTTP ${method} ${url} → ${response.status}`);
  return { output: response };
};

const humanApproval: NodeHandler = async (ctx) => {
  const title = str(interpolateMaybe(ctx.config.title, ctx.scope), "Approval required");
  const summary = str(interpolateMaybe(ctx.config.summary ?? ctx.input, ctx.scope));
  const timeoutMinutes = num(ctx.config.timeoutMinutes, 1440);
  return {
    output: { status: "waiting" },
    pause: {
      kind: "approval",
      title,
      summary,
      payload: ctx.input,
      until: new Date(ctx.now().getTime() + timeoutMinutes * 60_000),
    },
  };
};

const humanReview: NodeHandler = async (ctx) => {
  const title = str(interpolateMaybe(ctx.config.title, ctx.scope), "Review required");
  return {
    output: { status: "waiting" },
    pause: {
      kind: "review",
      title,
      summary: str(ctx.config.instructions, ""),
      payload: ctx.input,
    },
  };
};

const commEmail: NodeHandler = async (ctx) => {
  const to = str(interpolateMaybe(ctx.config.to, ctx.scope));
  const subject = str(interpolateMaybe(ctx.config.subject, ctx.scope));
  const body = str(interpolateMaybe(ctx.config.body, ctx.scope));
  if (!to) throw new Error("Email node requires a recipient");
  ctx.log("Queued outbound email", { to, subject });
  ctx.recordUsage("email.sent", 1, { to });
  return {
    output: {
      to,
      subject,
      body,
      status: "queued",
      provider: "internal",
      note: "Connect an email provider in Integrations to deliver messages externally.",
    },
  };
};

const commNotification: NodeHandler = async (ctx) => {
  const title = str(interpolateMaybe(ctx.config.title, ctx.scope));
  const message = str(interpolateMaybe(ctx.config.message, ctx.scope));
  ctx.log(title, { message, severity: ctx.config.severity });
  return { output: { title, message, severity: ctx.config.severity ?? "info" } };
};

const outputResponse: NodeHandler = async (ctx) => {
  const value = interpolateMaybe(ctx.config.value ?? ctx.input, ctx.scope);
  return { output: value };
};

const outputLog: NodeHandler = async (ctx) => {
  const message = str(interpolateMaybe(ctx.config.message, ctx.scope));
  const data = interpolateMaybe(ctx.config.data, ctx.scope);
  ctx.log(message, data);
  return { output: { message, data } };
};

export const nodeHandlers: Record<string, NodeHandler> = {
  "manual.trigger": manualTrigger,
  "schedule.trigger": scheduleTrigger,
  "webhook.trigger": webhookTrigger,
  "form.trigger": formTrigger,
  "ai.prompt": aiPrompt,
  "ai.classifier": aiClassifier,
  "ai.extractor": aiExtractor,
  "ai.summarizer": aiSummarizer,
  "ai.agent": aiAgent,
  "logic.condition": logicCondition,
  "logic.switch": logicSwitch,
  "logic.loop": logicLoop,
  "logic.delay": logicDelay,
  "logic.filter": logicFilter,
  "logic.merge": logicMerge,
  "data.set": dataSet,
  "data.transform": dataTransform,
  "data.json": dataJson,
  "data.http": dataHttp,
  "human.approval": humanApproval,
  "human.review": humanReview,
  "comm.email": commEmail,
  "comm.notification": commNotification,
  "output.response": outputResponse,
  "output.log": outputLog,
};

export function getNodeHandler(type: string): NodeHandler {
  const handler = nodeHandlers[type];
  if (!handler) {
    return async () => {
      throw new Error(`No handler registered for node type '${type}'`);
    };
  }
  return handler;
}

export function interpolateString(template: string, scope: VariableScope): string {
  return interpolate(template, scope);
}
