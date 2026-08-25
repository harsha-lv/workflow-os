import { ExprSyntaxError, isTemplate, parseExpression, parseTemplateParts, type AstNode } from "./parser";

const BLOCKED = new Set(["__proto__", "prototype", "constructor"]);

export type VariableScope = {
  trigger?: unknown;
  nodes: Record<string, unknown>;
  vars: Record<string, unknown>;
  env: Record<string, string>;
  input?: unknown;
  secrets?: Record<string, string>;
  now?: string;
};

export class ExprRuntimeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExprRuntimeError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getPath(target: unknown, key: string | number): unknown {
  if (typeof key === "string" && BLOCKED.has(key)) {
    throw new ExprRuntimeError("Access to that property is not allowed");
  }
  if (Array.isArray(target) && typeof key === "number") return target[key];
  if (Array.isArray(target) && typeof key === "string" && /^\d+$/.test(key)) {
    return target[Number(key)];
  }
  if (isRecord(target) && typeof key === "string") return target[key];
  if (typeof target === "string" && (typeof key === "number" || /^\d+$/.test(String(key)))) {
    return target[Number(key)];
  }
  return undefined;
}

const FILTERS: Record<string, (value: unknown, args: unknown[]) => unknown> = {
  upper: (v) => String(v ?? "").toUpperCase(),
  lower: (v) => String(v ?? "").toLowerCase(),
  trim: (v) => String(v ?? "").trim(),
  length: (v) => (Array.isArray(v) || typeof v === "string" ? v.length : v == null ? 0 : 1),
  json: (v) => JSON.stringify(v),
  parse: (v) => {
    if (typeof v !== "string") return v;
    return JSON.parse(v) as unknown;
  },
  default: (v, args) => (v == null || v === "" ? args[0] : v),
  coalesce: (v, args) => (v == null || v === "" ? args[0] : v),
  includes: (v, args) => {
    const needle = args[0];
    if (typeof v === "string") return v.includes(String(needle ?? ""));
    if (Array.isArray(v)) return v.includes(needle);
    return false;
  },
  round: (v, args) => {
    const n = Number(v);
    const digits = Number(args[0] ?? 0);
    const f = 10 ** digits;
    return Math.round(n * f) / f;
  },
  first: (v) => (Array.isArray(v) ? v[0] : v),
  last: (v) => (Array.isArray(v) ? v[v.length - 1] : v),
  keys: (v) => (isRecord(v) ? Object.keys(v) : []),
  values: (v) => (isRecord(v) ? Object.values(v) : []),
};

const FUNCTIONS: Record<string, (args: unknown[]) => unknown> = {
  upper: (a) => FILTERS.upper!(a[0], a.slice(1)),
  lower: (a) => FILTERS.lower!(a[0], a.slice(1)),
  trim: (a) => FILTERS.trim!(a[0], a.slice(1)),
  length: (a) => FILTERS.length!(a[0], a.slice(1)),
  json: (a) => FILTERS.json!(a[0], a.slice(1)),
  parse: (a) => FILTERS.parse!(a[0], a.slice(1)),
  coalesce: (a) => a.find((v) => v != null && v !== "") ?? null,
  now: () => new Date().toISOString(),
  includes: (a) => FILTERS.includes!(a[0], a.slice(1)),
  round: (a) => FILTERS.round!(a[0], a.slice(1)),
  number: (a) => Number(a[0]),
  string: (a) => String(a[0] ?? ""),
  bool: (a) => Boolean(a[0]),
};

function truthy(value: unknown): boolean {
  return Boolean(value);
}

function evalAst(node: AstNode, scope: VariableScope): unknown {
  switch (node.type) {
    case "literal":
      return node.value;
    case "ident": {
      if (node.name === "now") return scope.now ?? new Date().toISOString();
      if (node.name in scope) return (scope as Record<string, unknown>)[node.name];
      if (scope.vars && node.name in scope.vars) return scope.vars[node.name];
      if (scope.trigger && isRecord(scope.trigger) && node.name in scope.trigger) {
        return scope.trigger[node.name];
      }
      if (scope.nodes[node.name] !== undefined) return scope.nodes[node.name];
      return undefined;
    }
    case "member": {
      const object = evalAst(node.object, scope);
      const property =
        typeof node.property === "string" ? node.property : evalAst(node.property, scope);
      if (typeof property !== "string" && typeof property !== "number") {
        throw new ExprRuntimeError("Property must be a string or number");
      }
      return getPath(object, property);
    }
    case "call": {
      const fn = FUNCTIONS[node.callee];
      if (!fn) throw new ExprRuntimeError(`Unknown function '${node.callee}'`);
      return fn(node.args.map((a) => evalAst(a, scope)));
    }
    case "unary": {
      const v = evalAst(node.argument, scope);
      if (node.op === "!") return !truthy(v);
      return -Number(v);
    }
    case "binary": {
      if (node.op === "&&") {
        const left = evalAst(node.left, scope);
        return truthy(left) ? evalAst(node.right, scope) : left;
      }
      if (node.op === "||") {
        const left = evalAst(node.left, scope);
        return truthy(left) ? left : evalAst(node.right, scope);
      }
      const left = evalAst(node.left, scope);
      const right = evalAst(node.right, scope);
      switch (node.op) {
        case "+":
          if (typeof left === "string" || typeof right === "string") return String(left) + String(right);
          return Number(left) + Number(right);
        case "-":
          return Number(left) - Number(right);
        case "*":
          return Number(left) * Number(right);
        case "/":
          return Number(left) / Number(right);
        case "%":
          return Number(left) % Number(right);
        case "==":
          return left === right;
        case "!=":
          return left !== right;
        case ">":
          return Number(left) > Number(right);
        case "<":
          return Number(left) < Number(right);
        case ">=":
          return Number(left) >= Number(right);
        case "<=":
          return Number(left) <= Number(right);
        default:
          throw new ExprRuntimeError(`Unknown operator '${node.op}'`);
      }
    }
    case "ternary":
      return truthy(evalAst(node.test, scope))
        ? evalAst(node.consequent, scope)
        : evalAst(node.alternate, scope);
    case "pipe": {
      const left = evalAst(node.left, scope);
      const filter = FILTERS[node.filter];
      if (!filter) throw new ExprRuntimeError(`Unknown filter '${node.filter}'`);
      return filter(
        left,
        node.args.map((a) => evalAst(a, scope)),
      );
    }
  }
}

export function evaluateExpression(input: string, scope: VariableScope): unknown {
  const trimmed = input.trim();
  if (!trimmed) return "";
  try {
    return evalAst(parseExpression(trimmed), scope);
  } catch (error) {
    if (error instanceof ExprSyntaxError || error instanceof ExprRuntimeError) throw error;
    throw new ExprRuntimeError(error instanceof Error ? error.message : "Expression failed");
  }
}

export function interpolate(input: string, scope: VariableScope): string {
  if (!isTemplate(input)) return input;
  const parts = parseTemplateParts(input);
  return parts
    .map((part) => {
      if (part.literal) return part.value;
      const value = evalAst(part.ast, scope);
      if (value == null) return "";
      if (typeof value === "string") return value;
      if (typeof value === "number" || typeof value === "boolean") return String(value);
      return JSON.stringify(value);
    })
    .join("");
}

export function resolveConfigValue(value: unknown, scope: VariableScope): unknown {
  if (typeof value === "string") {
    if (isTemplate(value)) {
      const parts = parseTemplateParts(value);
      if (parts.length === 1 && parts[0] && !parts[0].literal) {
        return evalAst(parts[0].ast, scope);
      }
      return interpolate(value, scope);
    }
    return value;
  }
  if (Array.isArray(value)) return value.map((v) => resolveConfigValue(v, scope));
  if (isRecord(value)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = resolveConfigValue(v, scope);
    return out;
  }
  return value;
}

export function collectExpressionRefs(input: string): string[] {
  const refs: string[] = [];
  const walk = (node: AstNode, prefix: string[] = []): void => {
    if (node.type === "ident") refs.push([...prefix, node.name].join("."));
    if (node.type === "member") {
      const path: string[] = [];
      const collect = (n: AstNode): void => {
        if (n.type === "ident") path.unshift(n.name);
        else if (n.type === "member") {
          if (typeof n.property === "string") path.unshift(n.property);
          collect(n.object);
        }
      };
      collect(node);
      if (path.length) refs.push(path.join("."));
      return;
    }
    if (node.type === "call") node.args.forEach((a) => walk(a, prefix));
    if (node.type === "unary") walk(node.argument, prefix);
    if (node.type === "binary") {
      walk(node.left, prefix);
      walk(node.right, prefix);
    }
    if (node.type === "ternary") {
      walk(node.test, prefix);
      walk(node.consequent, prefix);
      walk(node.alternate, prefix);
    }
    if (node.type === "pipe") {
      walk(node.left, prefix);
      node.args.forEach((a) => walk(a, prefix));
    }
  };
  if (isTemplate(input)) {
    for (const part of parseTemplateParts(input)) {
      if (!part.literal) walk(part.ast);
    }
  } else {
    try {
      walk(parseExpression(input));
    } catch {
      /* ignore invalid as the editor validates later */
    }
  }
  return [...new Set(refs)];
}
