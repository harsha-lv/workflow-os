import { describe, expect, it } from "vitest";
import {
  buildCanonicalReceipt,
  canonicalize,
  canonicalJson,
  hashCanonical,
  rootFromCanonical,
  stripSecrets,
} from "@/domain/verify/canonical";

describe("canonical serialization", () => {
  it("orders object keys deterministically", () => {
    const a = canonicalJson({ b: 1, a: 2 });
    const b = canonicalJson({ a: 2, b: 1 });
    expect(a).toBe('{"a":2,"b":1}');
    expect(a).toBe(b);
  });

  it("produces the same SHA-256 for equivalent objects", () => {
    expect(hashCanonical({ z: true, a: [2, 1] })).toBe(hashCanonical({ a: [2, 1], z: true }));
  });

  it("strips secret-like keys before hashing", () => {
    const cleaned = stripSecrets({
      email: "lead@demo.example",
      password: "hidden",
      apiKey: "sk-live",
      nested: { token: "abc", name: "Demo" },
    }) as Record<string, unknown>;
    expect(cleaned.password).toBeUndefined();
    expect(cleaned.apiKey).toBeUndefined();
    expect((cleaned.nested as Record<string, unknown>).token).toBeUndefined();
    expect((cleaned.nested as Record<string, unknown>).name).toBe("Demo");
    expect(JSON.stringify(canonicalize({ secret: "x", value: 1 }))).toBe('{"value":1}');
  });

  it("builds a stable execution root", () => {
    const input = {
      executionId: "run_1",
      organizationId: "org_1",
      workflowId: "wf_1",
      workflowVersionId: "ver_1",
      workflowVersionHash: "abc",
      triggerType: "manual",
      status: "success",
      startedAt: "2026-01-01T00:00:00.000Z",
      endedAt: "2026-01-01T00:00:01.000Z",
      output: "world",
      error: null,
      previousRoot: null,
      steps: [
        {
          nodeId: "out",
          nodeType: "output.response",
          status: "success",
          attempt: 1,
          input: { hello: "world" },
          output: "world",
          config: { value: "{{trigger.hello}}" },
        },
        {
          nodeId: "t",
          nodeType: "manual.trigger",
          status: "success",
          attempt: 1,
          input: { hello: "world" },
          output: { hello: "world" },
          config: {},
        },
      ],
    };
    const first = buildCanonicalReceipt(input);
    const second = buildCanonicalReceipt({
      ...input,
      steps: [...input.steps].reverse(),
    });
    expect(first.steps[0]?.nodeId).toBe("out");
    expect(rootFromCanonical(first)).toBe(rootFromCanonical(second));
    expect(first.steps[0]?.inputHash).toMatch(/^[0-9a-f]{64}$/);
  });
});
