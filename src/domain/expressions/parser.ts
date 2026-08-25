/**
 * Safe expression language. Never uses eval() or Function().
 *
 * Templates:  Hello {{customer.name | upper}}
 * Paths:      nodes.extract.email
 * Logic:      score >= 80 && status == "qualified"
 * Calls:      coalesce(name, "unknown"), length(items), json(body)
 */

export type ExprToken =
  | { kind: "number"; value: number }
  | { kind: "string"; value: string }
  | { kind: "ident"; value: string }
  | { kind: "bool"; value: boolean }
  | { kind: "null" }
  | { kind: "punct"; value: string }
  | { kind: "eof" };

const PUNCT = new Set([
  ".",
  ",",
  "(",
  ")",
  "[",
  "]",
  "|",
  "+",
  "-",
  "*",
  "/",
  "%",
  "!",
  "=",
  ">",
  "<",
  "&",
  "?",
  ":",
]);

export function tokenize(input: string): ExprToken[] {
  const tokens: ExprToken[] = [];
  let i = 0;
  const s = input;

  const pushPunct = (value: string) => tokens.push({ kind: "punct", value });

  while (i < s.length) {
    const c = s[i]!;
    if (c === " " || c === "\t" || c === "\n" || c === "\r") {
      i += 1;
      continue;
    }
    if (c === '"' || c === "'") {
      const quote = c;
      i += 1;
      let value = "";
      while (i < s.length && s[i] !== quote) {
        if (s[i] === "\\" && i + 1 < s.length) {
          value += s[i + 1];
          i += 2;
          continue;
        }
        value += s[i];
        i += 1;
      }
      if (s[i] !== quote) throw new ExprSyntaxError("Unterminated string");
      i += 1;
      tokens.push({ kind: "string", value });
      continue;
    }
    if ((c >= "0" && c <= "9") || (c === "." && s[i + 1] && s[i + 1]! >= "0" && s[i + 1]! <= "9")) {
      const start = i;
      i += 1;
      while (i < s.length && /[0-9.]/.test(s[i]!)) i += 1;
      tokens.push({ kind: "number", value: Number(s.slice(start, i)) });
      continue;
    }
    if (/[A-Za-z_$@]/.test(c)) {
      const start = i;
      i += 1;
      while (i < s.length && /[A-Za-z0-9_$@]/.test(s[i]!)) i += 1;
      const value = s.slice(start, i);
      if (value === "true" || value === "false") {
        tokens.push({ kind: "bool", value: value === "true" });
      } else if (value === "null") {
        tokens.push({ kind: "null" });
      } else if (value === "and") {
        pushPunct("&&");
      } else if (value === "or") {
        pushPunct("||");
      } else if (value === "not") {
        pushPunct("!");
      } else {
        tokens.push({ kind: "ident", value });
      }
      continue;
    }
    if (c === "&" && s[i + 1] === "&") {
      pushPunct("&&");
      i += 2;
      continue;
    }
    if (c === "|" && s[i + 1] === "|") {
      pushPunct("||");
      i += 2;
      continue;
    }
    if (c === "=" && s[i + 1] === "=") {
      pushPunct("==");
      i += 2;
      continue;
    }
    if (c === "!" && s[i + 1] === "=") {
      pushPunct("!=");
      i += 2;
      continue;
    }
    if (c === ">" && s[i + 1] === "=") {
      pushPunct(">=");
      i += 2;
      continue;
    }
    if (c === "<" && s[i + 1] === "=") {
      pushPunct("<=");
      i += 2;
      continue;
    }
    if (PUNCT.has(c)) {
      pushPunct(c);
      i += 1;
      continue;
    }
    throw new ExprSyntaxError(`Unexpected character '${c}'`);
  }
  tokens.push({ kind: "eof" });
  return tokens;
}

export type AstNode =
  | { type: "literal"; value: unknown }
  | { type: "ident"; name: string }
  | { type: "member"; object: AstNode; property: string | AstNode }
  | { type: "call"; callee: string; args: AstNode[] }
  | { type: "unary"; op: "!" | "-"; argument: AstNode }
  | { type: "binary"; op: string; left: AstNode; right: AstNode }
  | { type: "ternary"; test: AstNode; consequent: AstNode; alternate: AstNode }
  | { type: "pipe"; left: AstNode; filter: string; args: AstNode[] };

export class ExprSyntaxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExprSyntaxError";
  }
}

export function parseExpression(input: string): AstNode {
  const tokens = tokenize(input.trim());
  let i = 0;
  const peek = () => tokens[i] ?? { kind: "eof" as const };
  const take = () => {
    const t = peek();
    i += 1;
    return t;
  };
  const expectPunct = (value: string) => {
    const t = take();
    if (t.kind !== "punct" || t.value !== value) {
      throw new ExprSyntaxError(`Expected '${value}'`);
    }
  };

  const parsePrimary = (): AstNode => {
    const t = peek();
    if (t.kind === "number") {
      take();
      return { type: "literal", value: t.value };
    }
    if (t.kind === "string") {
      take();
      return { type: "literal", value: t.value };
    }
    if (t.kind === "bool") {
      take();
      return { type: "literal", value: t.value };
    }
    if (t.kind === "null") {
      take();
      return { type: "literal", value: null };
    }
    if (t.kind === "ident") {
      take();
      if (peek().kind === "punct" && peek().kind === "punct" && (peek() as { value?: string }).value === "(") {
        expectPunct("(");
        const args: AstNode[] = [];
        if (!(peek().kind === "punct" && (peek() as { value?: string }).value === ")")) {
          args.push(parseTernary());
          while (peek().kind === "punct" && (peek() as { value?: string }).value === ",") {
            take();
            args.push(parseTernary());
          }
        }
        expectPunct(")");
        return { type: "call", callee: t.value, args };
      }
      return { type: "ident", name: t.value };
    }
    if (t.kind === "punct" && t.value === "(") {
      take();
      const inner = parseTernary();
      expectPunct(")");
      return inner;
    }
    throw new ExprSyntaxError("Expected expression");
  };

  const parseMember = (): AstNode => {
    let node = parsePrimary();
    for (;;) {
      const t = peek();
      if (t.kind === "punct" && t.value === ".") {
        take();
        const prop = take();
        if (prop.kind !== "ident") throw new ExprSyntaxError("Expected property name");
        node = { type: "member", object: node, property: prop.value };
        continue;
      }
      if (t.kind === "punct" && t.value === "[") {
        take();
        const property = parseTernary();
        expectPunct("]");
        node = { type: "member", object: node, property };
        continue;
      }
      break;
    }
    return node;
  };

  const parseUnary = (): AstNode => {
    const t = peek();
    if (t.kind === "punct" && (t.value === "!" || t.value === "-")) {
      take();
      return { type: "unary", op: t.value, argument: parseUnary() };
    }
    return parseMember();
  };

  const parseMul = (): AstNode => {
    let left = parseUnary();
    for (;;) {
      const t = peek();
      if (t.kind === "punct" && (t.value === "*" || t.value === "/" || t.value === "%")) {
        take();
        left = { type: "binary", op: t.value, left, right: parseUnary() };
        continue;
      }
      break;
    }
    return left;
  };

  const parseAdd = (): AstNode => {
    let left = parseMul();
    for (;;) {
      const t = peek();
      if (t.kind === "punct" && (t.value === "+" || t.value === "-")) {
        take();
        left = { type: "binary", op: t.value, left, right: parseMul() };
        continue;
      }
      break;
    }
    return left;
  };

  const parseCompare = (): AstNode => {
    let left = parseAdd();
    for (;;) {
      const t = peek();
      if (
        t.kind === "punct" &&
        (t.value === "==" || t.value === "!=" || t.value === ">" || t.value === "<" || t.value === ">=" || t.value === "<=")
      ) {
        take();
        left = { type: "binary", op: t.value, left, right: parseAdd() };
        continue;
      }
      break;
    }
    return left;
  };

  const parseAnd = (): AstNode => {
    let left = parseCompare();
    for (;;) {
      const t = peek();
      if (t.kind === "punct" && t.value === "&&") {
        take();
        left = { type: "binary", op: "&&", left, right: parseCompare() };
        continue;
      }
      break;
    }
    return left;
  };

  const parseOr = (): AstNode => {
    let left = parseAnd();
    for (;;) {
      const t = peek();
      if (t.kind === "punct" && t.value === "||") {
        take();
        left = { type: "binary", op: "||", left, right: parseAnd() };
        continue;
      }
      break;
    }
    return left;
  };

  const parsePipe = (): AstNode => {
    let left = parseOr();
    for (;;) {
      const t = peek();
      if (t.kind === "punct" && t.value === "|") {
        take();
        const filter = take();
        if (filter.kind !== "ident") throw new ExprSyntaxError("Expected filter name");
        const args: AstNode[] = [];
        if (peek().kind === "punct" && (peek() as { value?: string }).value === "(") {
          take();
          if (!(peek().kind === "punct" && (peek() as { value?: string }).value === ")")) {
            args.push(parseTernary());
            while (peek().kind === "punct" && (peek() as { value?: string }).value === ",") {
              take();
              args.push(parseTernary());
            }
          }
          expectPunct(")");
        }
        left = { type: "pipe", left, filter: filter.value, args };
        continue;
      }
      break;
    }
    return left;
  };

  const parseTernary = (): AstNode => {
    const test = parsePipe();
    if (peek().kind === "punct" && (peek() as { value?: string }).value === "?") {
      take();
      const consequent = parseTernary();
      expectPunct(":");
      const alternate = parseTernary();
      return { type: "ternary", test, consequent, alternate };
    }
    return test;
  };

  const ast = parseTernary();
  if (peek().kind !== "eof") throw new ExprSyntaxError("Unexpected trailing input");
  return ast;
}

const TEMPLATE_RE = /\{\{([\s\S]+?)\}\}/g;

export function parseTemplateParts(input: string): Array<{ literal: true; value: string } | { literal: false; ast: AstNode }> {
  const parts: Array<{ literal: true; value: string } | { literal: false; ast: AstNode }> = [];
  let last = 0;
  for (const match of input.matchAll(TEMPLATE_RE)) {
    const index = match.index ?? 0;
    if (index > last) parts.push({ literal: true, value: input.slice(last, index) });
    parts.push({ literal: false, ast: parseExpression(match[1] ?? "") });
    last = index + match[0].length;
  }
  if (last < input.length) parts.push({ literal: true, value: input.slice(last) });
  return parts;
}

export function isTemplate(value: string): boolean {
  return value.includes("{{");
}
