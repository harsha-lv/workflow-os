import { describe, expect, it } from "vitest";
import { runWorkflow } from "@/domain/engine/run";
import { resumeWorkflow } from "@/domain/engine/resume";

describe("execution engine", () => {
  it("runs a linear graph and records step outputs", async () => {
    const result = await runWorkflow({
      graph: {
        nodes: [
          {
            id: "t",
            type: "manual.trigger",
            name: "Start",
            position: { x: 0, y: 0 },
            config: { sampleInput: { n: 1 } },
          },
          {
            id: "set",
            type: "data.set",
            name: "Set",
            position: { x: 0, y: 0 },
            config: { name: "n", value: "{{trigger.n}}" },
          },
          {
            id: "log",
            type: "output.log",
            name: "Log",
            position: { x: 0, y: 0 },
            config: { message: "n is {{vars.n}}" },
          },
        ],
        edges: [
          { id: "e1", source: "t", target: "set" },
          { id: "e2", source: "set", target: "log" },
        ],
      },
      trigger: { n: 3 },
    });
    expect(result.status).toBe("success");
    expect(result.steps).toHaveLength(3);
    expect(result.steps.every((s) => s.status === "success")).toBe(true);
  });

  it("branches on condition", async () => {
    const result = await runWorkflow({
      graph: {
        nodes: [
          { id: "t", type: "manual.trigger", name: "Start", position: { x: 0, y: 0 }, config: {} },
          {
            id: "if",
            type: "logic.condition",
            name: "If",
            position: { x: 0, y: 0 },
            config: { expression: "trigger.ok == true" },
          },
          {
            id: "yes",
            type: "output.log",
            name: "Yes",
            position: { x: 0, y: 0 },
            config: { message: "yes" },
          },
          {
            id: "no",
            type: "output.log",
            name: "No",
            position: { x: 0, y: 0 },
            config: { message: "no" },
          },
        ],
        edges: [
          { id: "e1", source: "t", target: "if" },
          { id: "e2", source: "if", target: "yes", sourceHandle: "true" },
          { id: "e3", source: "if", target: "no", sourceHandle: "false" },
        ],
      },
      trigger: { ok: true },
    });
    expect(result.status).toBe("success");
    expect(result.steps.map((s) => s.nodeId)).toContain("yes");
    expect(result.steps.map((s) => s.nodeId)).not.toContain("no");
  });

  it("pauses on approval and resumes with a decision", async () => {
    const graph = {
      nodes: [
        { id: "t", type: "manual.trigger", name: "Start", position: { x: 0, y: 0 }, config: {} },
        {
          id: "ap",
          type: "human.approval",
          name: "Approve",
          position: { x: 0, y: 0 },
          config: { title: "Go?" },
        },
        {
          id: "done",
          type: "output.log",
          name: "Done",
          position: { x: 0, y: 0 },
          config: { message: "sent" },
        },
      ],
      edges: [
        { id: "e1", source: "t", target: "ap" },
        { id: "e2", source: "ap", target: "done", sourceHandle: "approved" },
      ],
    };
    const paused = await runWorkflow({ graph, trigger: { id: 1 } });
    expect(paused.status).toBe("waiting");
    expect(paused.resumeFrom).toBe("ap");
    const resumed = await resumeWorkflow({
      graph,
      trigger: { id: 1 },
      previousOutputs: { t: { id: 1 } },
      decision: { nodeId: "ap", branch: "approved", output: { decision: "approve" } },
    });
    expect(resumed.status).toBe("success");
    expect(resumed.steps.some((s) => s.nodeId === "done")).toBe(true);
  });

  it("continues after a node error when policy says continue", async () => {
    const result = await runWorkflow({
      graph: {
        nodes: [
          { id: "t", type: "manual.trigger", name: "Start", position: { x: 0, y: 0 }, config: {} },
          {
            id: "bad",
            type: "data.json",
            name: "Parse",
            position: { x: 0, y: 0 },
            config: { mode: "parse", value: "not-json" },
            errorPolicy: { onError: "continue" },
          },
          {
            id: "log",
            type: "output.log",
            name: "Log",
            position: { x: 0, y: 0 },
            config: { message: "still here" },
          },
        ],
        edges: [
          { id: "e1", source: "t", target: "bad" },
          { id: "e2", source: "bad", target: "log" },
        ],
      },
      trigger: {},
    });
    expect(result.status).toBe("success");
    expect(result.steps.at(-1)?.nodeId).toBe("log");
  });
});
