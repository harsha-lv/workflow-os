"use client";

import { useEffect, useState } from "react";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDuration } from "@/lib/format";
import type { WorkflowGraph } from "@/domain/graph";
import { ExecutionGraph } from "./graph";
import { cn } from "@/lib/utils";
import { JsonInspect } from "@/components/data/json-inspect";
import { explainFailure } from "@/domain/ops/failure";
import { estimateUsd } from "@/domain/ops/health";
import { toast } from "sonner";

type StepView = {
  nodeId: string;
  name: string;
  type: string;
  status: string;
  durationMs: number | null;
  startedAt?: string | Date | null;
  input: unknown;
  output: unknown;
  config: unknown;
  logs: Array<{ ts: string; level: string; message: string; data?: unknown }>;
  error?: { message: string; type: string } | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

export function ExecutionInspector({
  graph,
  steps,
  runInput,
  runOutput,
  runStatus,
  executionId,
  startedAt,
}: {
  graph: WorkflowGraph;
  steps: StepView[];
  runInput: unknown;
  runOutput: unknown;
  runStatus?: string;
  executionId?: string;
  startedAt?: Date | string | null;
}) {
  const [selected, setSelected] = useState(steps[0]?.nodeId ?? graph.nodes[0]?.id ?? "");
  const [tab, setTab] = useState<"input" | "output" | "logs" | "meta">("output");
  const [cursor, setCursor] = useState(steps.length);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    if (cursor >= steps.length) {
      const stop = window.setTimeout(() => setPlaying(false), 0);
      return () => window.clearTimeout(stop);
    }
    const handle = window.setTimeout(() => setCursor((c) => c + 1), 650);
    return () => window.clearTimeout(handle);
  }, [playing, cursor, steps.length]);

  const visibleSteps = steps.slice(0, Math.max(cursor, 0));
  const step = visibleSteps.find((s) => s.nodeId === selected) ?? visibleSteps.at(-1);
  const node = graph.nodes.find((n) => n.id === selected);
  const statusByNode = new Map(visibleSteps.map((s) => [s.nodeId, s.status]));
  const failed = steps.find((s) => s.status === "failed");
  const brief = failed ? explainFailure({ error: failed.error, nodeName: failed.name, nodeType: failed.type }) : null;
  const output = asRecord(step?.output);
  const usage = asRecord(output?.usage);
  const origin = startedAt
    ? new Date(startedAt).getTime()
    : visibleSteps[0]?.startedAt
      ? new Date(visibleSteps[0].startedAt).getTime()
      : 0;

  async function retry(fromNodeId?: string) {
    if (!executionId) return;
    const res = await fetch(`/api/executions/${executionId}/retry`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ fromNodeId }),
    });
    if (!res.ok) {
      toast.error("Could not retry this run.");
      return;
    }
    toast.success(fromNodeId ? "Retrying from this step" : "Retrying workflow");
    window.location.reload();
  }

  return (
    <div className="mt-5">
      {brief ? (
        <div className="panel mb-4 border-danger/40 p-4">
          <p className="text-[13px] font-medium">{brief.what}</p>
          <p className="mt-2 text-[13px] text-muted">
            <span className="text-faint">Where · </span>
            {brief.where}
          </p>
          <p className="mt-1 text-[13px] text-muted">
            <span className="text-faint">Why · </span>
            {brief.why}
          </p>
          <p className="mt-1 text-[13px] text-muted">
            <span className="text-faint">Impact · </span>
            {brief.impact}
          </p>
          <p className="mt-1 text-[13px] text-muted">
            <span className="text-faint">Recommended · </span>
            {brief.recommended}
          </p>
          {executionId ? (
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={() => void retry(failed?.nodeId)}>
                Retry from this step
              </Button>
              <Button size="sm" variant="secondary" onClick={() => void retry()}>
                Retry
              </Button>
            </div>
          ) : null}
          <details className="mt-3">
            <summary className="cursor-pointer text-[12px] text-faint">Technical details</summary>
            <p className="mt-2 font-mono text-[11px] text-muted">{failed?.error?.message}</p>
          </details>
        </div>
      ) : null}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            setCursor(0);
            setPlaying(true);
          }}
        >
          Replay
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setPlaying(false);
            setCursor((c) => Math.min(steps.length, c + 1));
          }}
        >
          Step through
        </Button>
        {runStatus ? <StatusBadge status={playing ? "running" : runStatus} /> : null}
      </div>

      <ExecutionGraph graph={graph} statusByNode={statusByNode} onSelect={setSelected} />
      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        <ol className="panel max-h-[420px] overflow-y-auto p-1.5">
          {graph.nodes.map((n, index) => {
            const st = statusByNode.get(n.id) ?? "pending";
            const last = index === graph.nodes.length - 1;
            const live = visibleSteps.find((s) => s.nodeId === n.id);
            const ts = live?.startedAt ? new Date(live.startedAt).getTime() - origin : null;
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => setSelected(n.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-[13px] transition-colors duration-[var(--duration-fast)] hover:bg-surface-hover",
                    selected === n.id && "bg-surface-hover",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate">{n.name}</span>
                    <span className="font-mono text-[10px] text-faint">
                      {ts == null ? "—" : `${Math.floor(Math.max(0, ts) / 1000)
                        .toString()
                        .padStart(2, "0")}.${String(Math.max(0, ts) % 1000).padStart(3, "0").slice(0, 2)}`}
                    </span>
                  </span>
                  <StatusBadge status={st} />
                </button>
                {last ? null : (
                  <div className={cn("ml-[18px] h-3 w-px", st === "success" ? "bg-success/50" : st === "failed" ? "bg-danger/50" : "bg-border")} />
                )}
              </li>
            );
          })}
        </ol>
        <section className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-[15px] font-medium tracking-tight">{node?.name ?? "Run"}</h2>
            {step ? <StatusBadge status={step.status} /> : null}
            {step ? <span className="text-[12px] tabular-nums text-muted">{formatDuration(step.durationMs)}</span> : null}
          </div>
          <div className="mt-3 flex gap-1">
            {(["input", "output", "logs", "meta"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setTab(item)}
                className={cn(
                  "rounded-md px-2 py-1 text-[12px] capitalize text-muted hover:text-text",
                  tab === item && "bg-surface-hover text-text",
                )}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="mt-3">
            {tab === "input" ? <JsonInspect value={step ? step.input : runInput} /> : null}
            {tab === "output" ? <JsonInspect value={step ? step.output : runOutput} /> : null}
            {tab === "logs" ? (
              <ul className="grid gap-1 font-mono text-[11px] text-muted">
                {(step?.logs ?? []).length === 0 ? <li>No logs for this step.</li> : null}
                {(step?.logs ?? []).map((log, i) => (
                  <li key={i}>
                    [{log.level}] {log.message}
                  </li>
                ))}
              </ul>
            ) : null}
            {tab === "meta" ? (
              <div className="grid gap-2 text-[13px]">
                <p>Status · {step?.status ?? runStatus ?? "—"}</p>
                <p>Duration · {formatDuration(step?.durationMs ?? null)}</p>
                <p>Type · {step?.type ?? node?.type ?? "—"}</p>
                {usage ? (
                  <p>
                    Tokens · {String(usage.inputTokens ?? "—")} in / {String(usage.outputTokens ?? "—")} out
                    {typeof usage.inputTokens === "number" && typeof usage.outputTokens === "number"
                      ? ` · ~$${estimateUsd(usage.inputTokens, usage.outputTokens).toFixed(4)}`
                      : ""}
                  </p>
                ) : (
                  <p className="text-muted">No model usage recorded on this step.</p>
                )}
                {output?.model ? <p>Model · {String(output.model)}</p> : null}
                {output?.mocked ? <p className="text-warning">This step used the mock provider.</p> : null}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
