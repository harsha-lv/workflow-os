import { describe, expect, it } from "vitest";
import { validateGraph } from "@/domain/workflow/validate";
import { suggestWorkflow } from "@/domain/workflow/suggestions";
import { sampleTriggerPayload } from "@/domain/workflow/sample";
import { diffGraphs } from "@/domain/workflow/diff";

describe("validation extras", () => {
  it("warns when HTTP has no error policy", () => {
    const result = validateGraph({
      nodes: [
        { id: "t", type: "manual.trigger", name: "Start", position: { x: 0, y: 0 }, config: {} },
        {
          id: "h",
          type: "data.http",
          name: "HTTP",
          position: { x: 0, y: 0 },
          config: { url: "https://example.com", method: "GET" },
        },
      ],
      edges: [{ id: "e", source: "t", target: "h" }],
    });
    expect(result.issues.some((i) => i.message.includes("error policy"))).toBe(true);
  });
});

describe("suggestions", () => {
  it("suggests error handling for AI + HTTP", () => {
    const suggestions = suggestWorkflow({
      nodes: [
        { id: "t", type: "webhook.trigger", name: "Hook", position: { x: 0, y: 0 }, config: {} },
        { id: "a", type: "ai.prompt", name: "AI", position: { x: 0, y: 0 }, config: { prompt: "hi" } },
        { id: "h", type: "data.http", name: "HTTP", position: { x: 0, y: 0 }, config: { url: "https://x" } },
      ],
      edges: [
        { id: "e1", source: "t", target: "a" },
        { id: "e2", source: "a", target: "h" },
      ],
    });
    expect(suggestions.some((s) => s.id === "error-handling")).toBe(true);
  });
});

describe("sample + diff", () => {
  it("generates webhook-shaped sample data", () => {
    const sample = sampleTriggerPayload({
      nodes: [{ id: "t", type: "webhook.trigger", name: "Hook", position: { x: 0, y: 0 }, config: {} }],
      edges: [],
    });
    expect(sample).toHaveProperty("body");
  });

  it("diffs added nodes", () => {
    const changes = diffGraphs(
      { nodes: [{ id: "t", type: "manual.trigger", name: "Start", position: { x: 0, y: 0 }, config: {} }], edges: [] },
      {
        nodes: [
          { id: "t", type: "manual.trigger", name: "Start", position: { x: 0, y: 0 }, config: {} },
          { id: "n", type: "output.log", name: "Log", position: { x: 0, y: 0 }, config: { message: "x" } },
        ],
        edges: [],
      },
    );
    expect(changes.some((c) => c.kind === "added" && c.label === "Log")).toBe(true);
  });
});
