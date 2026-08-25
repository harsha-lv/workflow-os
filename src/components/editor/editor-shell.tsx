"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { WorkflowGraph } from "@/domain/graph";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NodePalette } from "./palette";
import { ConfigPanel } from "./config-panel";
import { EditorCanvas } from "./canvas";
import { useEditor } from "./store";
import { NodePicker } from "./node-picker";
import { CopilotDialog } from "./copilot-dialog";
import { LiveDock, type LiveStep } from "./live-dock";
import { LiveRunContext } from "./live-run-context";
import { VersionList } from "./versions";
import { TestPanel } from "./test-panel";
import { PublishDialog } from "./publish-dialog";
import { suggestWorkflow } from "@/domain/workflow/suggestions";


export function EditorShell({
  workflowId,
  name,
  description,
  graph,
  webhookToken,
}: {
  workflowId: string;
  name: string;
  description: string;
  graph: WorkflowGraph;
  webhookToken: string | null;
}) {
  const hydrate = useEditor((s) => s.hydrate);
  const editorName = useEditor((s) => s.name);
  const setName = useEditor((s) => s.setName);
  const dirty = useEditor((s) => s.dirty);
  const saving = useEditor((s) => s.saving);
  const lastSavedAt = useEditor((s) => s.lastSavedAt);
  const undo = useEditor((s) => s.undo);
  const redo = useEditor((s) => s.redo);
  const removeSelected = useEditor((s) => s.removeSelected);
  const duplicateSelected = useEditor((s) => s.duplicateSelected);
  const select = useEditor((s) => s.select);
  const hydrated = useRef(false);
  const [picker, setPicker] = useState(false);
  const [copilot, setCopilot] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const [runStatus, setRunStatus] = useState("idle");
  const [steps, setSteps] = useState<LiveStep[]>([]);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, string>>({});
  const [testOpen, setTestOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const graphState = useEditor((s) => s.graph);

  useEffect(() => {
    hydrate({ workflowId, name, description, graph });
    hydrated.current = true;
  }, [description, graph, hydrate, name, workflowId]);

  const save = useCallback(async () => {
    const state = useEditor.getState();
    state.setSaving(true);
    const res = await fetch(`/api/workflows/${workflowId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: state.name, description: state.description, graph: state.graph }),
    });
    if (!res.ok) {
      toast.error("Save failed. Your last successful save is still on the server.");
      state.setSaving(false);
      return false;
    }
    state.markSaved();
    return true;
  }, [workflowId]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const typing = target.tagName === "INPUT" || target.tagName === "TEXTAREA";
      const meta = event.metaKey || event.ctrlKey;
      if (meta && event.key.toLowerCase() === "z" && event.shiftKey) {
        event.preventDefault();
        redo();
      } else if (meta && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undo();
      } else if (meta && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void save();
      } else if (meta && event.key.toLowerCase() === "d") {
        event.preventDefault();
        duplicateSelected();
      } else if (!typing && event.key.toLowerCase() === "n") {
        event.preventDefault();
        setPicker(true);
      } else if (!typing && event.key.toLowerCase() === "r") {
        event.preventDefault();
        void testRun();
      } else if (!typing && (event.key === "Delete" || event.key === "Backspace")) {
        removeSelected();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  useEffect(() => {
    if (!hydrated.current || !dirty) return;
    const handle = window.setTimeout(() => {
      void save();
    }, 900);
    return () => window.clearTimeout(handle);
  }, [dirty, editorName, save]);

  useEffect(() => {
    if (!runId) return;
    let cancelled = false;
    const tick = async () => {
      const res = await fetch(`/api/executions/${runId}`);
      if (!res.ok || cancelled) return;
      const data = (await res.json()) as {
        status: string;
        startedAt: string | null;
        steps: Array<{ nodeId: string; name: string; status: string; durationMs: number | null; startedAt: string | null }>;
      };
      setRunStatus(data.status);
      setStartedAt(data.startedAt);
      setSteps(data.steps);
      const next: Record<string, string> = {};
      for (const step of data.steps) next[step.nodeId] = step.status;
      setStatuses(next);
      if (data.status === "queued" || data.status === "running") {
        window.setTimeout(() => {
          void tick();
        }, 450);
      }
    };
    void tick();
    return () => {
      cancelled = true;
    };
  }, [runId]);

  async function publish() {
    const ok = await save();
    if (!ok) return;
    const res = await fetch(`/api/workflows/${workflowId}/publish`, { method: "POST" });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      toast.error(data.error ?? "Publish blocked by validation.");
      return;
    }
    toast.success("Workflow published");
  }

  async function testRun(input?: unknown, asTest = false) {
    const ok = await save();
    if (!ok) return;
    const res = await fetch(`/api/workflows/${workflowId}/run`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        version: "draft",
        triggerType: asTest ? "test" : "manual",
        input: input ?? { source: asTest ? "test" : "manual" },
      }),
    });
    const data = (await res.json()) as { id?: string; error?: string };
    if (!res.ok || !data.id) {
      toast.error(data.error ?? "Could not start a run.");
      return;
    }
    setRunId(data.id);
    setRunStatus("queued");
    toast.success(asTest ? "Test execution started" : "Execution started");
  }

  async function explain() {
    const res = await fetch(`/api/workflows/${workflowId}/explain`, { method: "POST", body: "{}" });
    const data = (await res.json()) as { text?: string };
    if (data.text) toast.message(data.text);
  }

  return (
    <LiveRunContext.Provider value={statuses}>
      <div className="flex h-[calc(100vh-2.75rem)] flex-col">
        <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border bg-bg-elevated px-3">
          <Input value={editorName} onChange={(e) => setName(e.target.value)} className="h-7 max-w-xs border-transparent bg-transparent px-1.5 hover:border-border" />
          <p className="hidden text-[11px] text-faint sm:block" aria-live="polite">
            {saving ? "Saving" : dirty ? "Unsaved" : lastSavedAt ? "Saved" : "Up to date"}
          </p>
          <VersionList workflowId={workflowId} />
          <div className="ml-auto flex items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={() => setPicker(true)} title="Add node (N)">
              Add
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setCopilot(true)}>
              Build with AI
            </Button>
            <Button variant="ghost" size="sm" onClick={() => void explain()}>
              Explain
            </Button>
            <Button variant="ghost" size="sm" onClick={undo} title="Undo ⌘Z">
              Undo
            </Button>
            <Button variant="ghost" size="sm" onClick={redo} title="Redo ⇧⌘Z">
              Redo
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setTestOpen(true)} title="Test with sample input">
              Test
            </Button>
            <Button variant="secondary" size="sm" onClick={() => void testRun()} title="Run (R)">
              Run
            </Button>
            <Button size="sm" onClick={() => setPublishOpen(true)}>
              Publish
            </Button>
          </div>
        </div>
        {webhookToken ? (
          <div className="flex items-center gap-2 border-b border-border bg-bg-elevated px-3 py-1 font-mono text-[11px] text-faint">
            <span className="truncate">
              Webhook {typeof window === "undefined" ? webhookToken : `${window.location.origin}/api/webhooks/${webhookToken}`}
            </span>
            <button
              type="button"
              className="text-muted hover:text-text"
              onClick={async () => {
                const url = `${window.location.origin}/api/webhooks/${webhookToken}`;
                await navigator.clipboard.writeText(url);
                toast.success("Copied");
              }}
            >
              Copy
            </button>
          </div>
        ) : null}
        {suggestWorkflow(graphState).length ? (
          <div className="flex gap-3 overflow-x-auto border-b border-border bg-bg-elevated px-3 py-1.5 text-[12px] text-muted">
            {suggestWorkflow(graphState).slice(0, 2).map((item) => (
              <button
                key={item.id}
                type="button"
                className="whitespace-nowrap hover:text-text"
                onClick={() => item.nodeId && select([item.nodeId])}
              >
                {item.title} — {item.detail}
              </button>
            ))}
          </div>
        ) : null}
        <div className="flex min-h-0 flex-1">
          <NodePalette />
          <div className="flex min-w-0 flex-1 flex-col bg-canvas">
            <div className="min-h-0 flex-1">
              <EditorCanvas />
            </div>
            {runId ? (
              <LiveDock status={runStatus} steps={steps} startedAt={startedAt} onSelect={(id) => select([id])} />
            ) : null}
          </div>
          <ConfigPanel onTest={testRun} />
        </div>
        <NodePicker open={picker} onClose={() => setPicker(false)} />
        <CopilotDialog open={copilot} workflowId={workflowId} onClose={() => setCopilot(false)} />
        <TestPanel open={testOpen} onClose={() => setTestOpen(false)} onRun={(input) => testRun(input, true)} />
        <PublishDialog
          open={publishOpen}
          onClose={() => setPublishOpen(false)}
          onConfirm={async () => {
            await publish();
            setPublishOpen(false);
          }}
        />
      </div>
    </LiveRunContext.Provider>
  );
}
