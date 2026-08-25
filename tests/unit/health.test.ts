import { describe, expect, it } from "vitest";
import { computeHealth, estimateUsd } from "@/domain/ops/health";
import { explainFailure } from "@/domain/ops/failure";
import { heuristicCopilot, sanitizeCopilotGraph } from "@/domain/ops/copilot";

describe("workflow health", () => {
  it("marks empty history as inactive", () => {
    const health = computeHealth([]);
    expect(health.signal).toBe("inactive");
    expect(health.score).toBeNull();
  });

  it("scores successful history as healthy", () => {
    const health = computeHealth(
      Array.from({ length: 8 }, () => ({ status: "success", durationMs: 1200, createdAt: new Date() })),
    );
    expect(health.signal).toBe("healthy");
    expect(health.score).toBe(100);
  });
});

describe("failure intelligence", () => {
  it("recommends retry for 500s", () => {
    const brief = explainFailure({
      error: { message: "HTTP 500 from downstream provider", type: "Error", nodeId: "n3" },
      nodeName: "HTTP Request",
      nodeType: "data.http",
    });
    expect(brief.retryable).toBe(true);
    expect(brief.impact).toContain("downstream");
  });
});

describe("copilot", () => {
  it("builds a lead path from a prompt", () => {
    const result = heuristicCopilot("Qualify inbound leads and send high-value ones for review");
    expect(result.graph.nodes.length).toBeGreaterThan(3);
    expect(result.graph.edges.length).toBeGreaterThan(2);
  });

  it("rejects unknown node types", () => {
    expect(sanitizeCopilotGraph({ nodes: [{ type: "rm -rf" }], edges: [] })).toBeNull();
  });
});

describe("cost estimate", () => {
  it("uses published token prices", () => {
    expect(estimateUsd(1_000_000, 0)).toBe(2);
    expect(estimateUsd(0, 1_000_000)).toBe(6);
  });
});
