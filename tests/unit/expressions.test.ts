import { describe, expect, it } from "vitest";
import { evaluateExpression, interpolate, resolveConfigValue } from "@/domain/expressions/evaluate";
import { parseExpression } from "@/domain/expressions/parser";

const scope = {
  trigger: { body: { email: "avery@northwind.dev", score: 91 } },
  nodes: { extract: { company: "Northwind", email: "avery@northwind.dev" } },
  vars: { priority: "high" },
  env: { APP_URL: "https://app.example" },
};

describe("expressions", () => {
  it("evaluates paths, comparisons, and filters", () => {
    expect(evaluateExpression("trigger.body.score >= 80", scope)).toBe(true);
    expect(evaluateExpression("nodes.extract.email | upper", scope)).toBe("AVERY@NORTHWIND.DEV");
    expect(interpolate("Hello {{nodes.extract.company}}", scope)).toBe("Hello Northwind");
    expect(evaluateExpression("coalesce(vars.missing, \"fallback\")", scope)).toBe("fallback");
  });

  it("blocks prototype access", () => {
    expect(() => evaluateExpression("trigger.constructor", scope)).toThrow();
  });

  it("does not use eval and parses ternary", () => {
    const ast = parseExpression("score > 50 ? \"yes\" : \"no\"");
    expect(ast.type).toBe("ternary");
    expect(evaluateExpression("trigger.body.score > 50 ? \"yes\" : \"no\"", scope)).toBe("yes");
  });

  it("resolves nested config templates", () => {
    const resolved = resolveConfigValue(
      { to: "{{nodes.extract.email}}", nested: { url: "{{env.APP_URL}}" } },
      scope,
    );
    expect(resolved).toEqual({ to: "avery@northwind.dev", nested: { url: "https://app.example" } });
  });
});
