"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { useEditor } from "./store";
import { toast } from "sonner";
import { WorkflowPreviewTree } from "@/components/workflow/preview-tree";
import { formatGraphStats, type WorkflowStats } from "@/domain/workflow/stats";
import type { WorkflowGraph } from "@/domain/graph";

export function CopilotDialog({
  open,
  workflowId,
  onClose,
}: {
  open: boolean;
  workflowId: string;
  onClose: () => void;
}) {
  const setGraph = useEditor((s) => s.setGraph);
  const [prompt, setPrompt] = useState("Create a workflow that receives new leads, scores them with AI, and holds high-value leads for review.");
  const [pending, setPending] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [stats, setStats] = useState<WorkflowStats | null>(null);
  const [preview, setPreview] = useState<WorkflowGraph | null>(null);

  if (!open) return null;

  async function generate() {
    setPending(true);
    const res = await fetch(`/api/workflows/${workflowId}/copilot`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const data = (await res.json()) as {
      graph?: Parameters<typeof setGraph>[0];
      explanation?: string;
      error?: string;
      mocked?: boolean;
      stats?: WorkflowStats;
    };
    setPending(false);
    if (!res.ok || !data.graph) {
      toast.error(data.error ?? "Could not generate a workflow.");
      return;
    }
    setGraph(data.graph);
    setPreview(data.graph);
    setExplanation(data.explanation ?? null);
    setStats(data.stats ?? null);
    toast.success(data.mocked ? "Drafted a starting path. Connect a SpaceXAI key for a live model." : "Workflow drafted. Review before you publish.");
  }

  return (
    <div className="fixed inset-0 z-50">
      <button type="button" className="command-overlay absolute inset-0" aria-label="Close" onClick={onClose} />
      <div className="dialog-content fixed left-1/2 top-1/2 z-50 w-[min(520px,calc(100vw-2rem))] rounded-[var(--radius)] border border-border bg-bg-elevated p-5 shadow-[var(--shadow)]">
        <p className="text-[15px] font-medium tracking-tight">Build with AI</p>
        <p className="mt-1 text-[13px] text-muted">Describes a path using existing node types. Nothing is published or executed.</p>
        <Textarea className="mt-3 min-h-28" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        {explanation ? (
          <div className="mt-3">
            {stats ? <p className="text-[12px] text-faint">{formatGraphStats(stats)}</p> : null}
            <p className="mt-1 text-[13px] text-muted">{explanation}</p>
            {preview ? (
              <div className="mt-3 max-h-48 overflow-y-auto">
                <WorkflowPreviewTree graph={preview} />
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            {explanation ? "Edit on canvas" : "Close"}
          </Button>
          <Button size="sm" loading={pending} onClick={() => void generate()}>
            Generate
          </Button>
        </div>
      </div>
    </div>
  );
}
