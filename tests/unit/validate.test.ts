import { describe, expect, it } from "vitest";
import { validateGraph } from "@/domain/workflow/validate";
import { emptyGraph } from "@/domain/graph";

describe("workflow validation", () => {
  it("requires a trigger", () => {
    const result = validateGraph(emptyGraph());
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.message.includes("trigger"))).toBe(true);
  });

  it("rejects cycles and missing required config", () => {
    const result = validateGraph({
      nodes: [
        { id: "a", type: "manual.trigger", name: "Start", position: { x: 0, y: 0 }, config: {} },
        { id: "b", type: "logic.condition", name: "If", position: { x: 0, y: 0 }, config: {} },
        { id: "c", type: "output.log", name: "Log", position: { x: 0, y: 0 }, config: {} },
      ],
      edges: [
        { id: "e1", source: "a", target: "b" },
        { id: "e2", source: "b", target: "c" },
        { id: "e3", source: "c", target: "b" },
      ],
    });
    expect(result.ok).toBe(false);
    expect(result.issues.some((i) => i.message.includes("cycle"))).toBe(true);
    expect(result.issues.some((i) => i.message.toLowerCase().includes("required"))).toBe(true);
  });
});
