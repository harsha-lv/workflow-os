import { describe, expect, it } from "vitest";
import { heuristicCopilot } from "@/domain/ops/copilot";
import { formatGraphStats, graphStats } from "@/domain/workflow/stats";

describe("heuristic copilot", () => {
  it("builds an email urgency path from a natural-language request", () => {
    const result = heuristicCopilot(
      "When I receive a customer email, summarize it, classify its urgency, and send urgent messages to my team.",
    );
    expect(result.graph.nodes.length).toBeGreaterThanOrEqual(5);
    expect(result.graph.nodes.some((n) => n.type === "ai.summarizer")).toBe(true);
    expect(result.graph.nodes.some((n) => n.type === "ai.classifier")).toBe(true);
    expect(result.graph.nodes.some((n) => n.type === "logic.condition")).toBe(true);
    expect(result.explanation.toLowerCase()).toContain("urgent");
  });
});

describe("graph stats", () => {
  it("counts real nodes and does not invent values", () => {
    const result = heuristicCopilot("Qualify new inbound leads");
    const stats = graphStats(result.graph);
    expect(stats.steps).toBe(result.graph.nodes.length);
    expect(formatGraphStats(stats)).toContain(`${stats.steps} step`);
  });
});
