"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { WorkflowPreviewTree } from "@/components/workflow/preview-tree";
import { formatGraphStats, type WorkflowStats } from "@/domain/workflow/stats";
import type { WorkflowGraph } from "@/domain/graph";
import { START_EXAMPLES } from "@/domain/start-examples";

type Generated = {
  graph: WorkflowGraph;
  explanation: string;
  mocked?: boolean;
  stats: WorkflowStats;
};

export function AiBuilder({ initialPrompt = "" }: { initialPrompt?: string }) {
  const router = useRouter();
  const [prompt, setPrompt] = useState(initialPrompt);
  const [pending, setPending] = useState(false);
  const [saving, setSaving] = useState<"edit" | "test" | "publish" | null>(null);
  const [result, setResult] = useState<Generated | null>(null);

  const statsLabel = useMemo(() => (result ? formatGraphStats(result.stats) : null), [result]);

  async function generate() {
    if (prompt.trim().length < 8) {
      toast.error("Describe the automation in a sentence or two.");
      return;
    }
    setPending(true);
    const res = await fetch("/api/workflows/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const data = (await res.json()) as Generated & { error?: string };
    setPending(false);
    if (!res.ok || !data.graph) {
      toast.error(data.error ?? "Could not generate a workflow. Nothing was saved.");
      return;
    }
    setResult(data);
  }

  async function persist(next: "edit" | "test" | "publish") {
    if (!result) return;
    setSaving(next);
    const res = await fetch("/api/workflows", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: prompt.trim().slice(0, 80) || "AI draft",
        description: result.explanation,
        graph: result.graph,
      }),
    });
    const data = (await res.json()) as { id?: string; error?: string };
    setSaving(null);
    if (!res.ok || !data.id) {
      toast.error(data.error ?? "Could not save the draft. The generated path is still on this screen.");
      return;
    }
    const suffix = next === "test" ? "?test=1" : next === "publish" ? "?publish=1" : "?setup=ai";
    router.push(`/workflows/${data.id}${suffix}`);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-accent">Build with AI</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">What do you want to automate?</h1>
      <p className="mt-2 text-[13px] text-muted">
        FlowForge drafts a path from your description. You review it, test it, and publish it. Nothing is sent or
        published automatically.
      </p>
      <Textarea
        className="mt-4 min-h-28"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="When I receive a customer email, summarize it, classify its urgency, and send urgent messages to my team."
        aria-label="Describe the workflow"
      />
      <div className="mt-3 flex flex-wrap gap-1.5">
        {START_EXAMPLES.map((example) => (
          <button
            key={example.label}
            type="button"
            className="rounded-md border border-border px-2.5 py-1.5 text-[12px] text-muted hover:text-text"
            onClick={() => setPrompt(example.prompt)}
          >
            {example.label}
          </button>
        ))}
      </div>
      <div className="mt-4">
        <Button loading={pending} onClick={() => void generate()}>
          Generate workflow
        </Button>
      </div>

      {result ? (
        <section className="panel mt-8 p-5" aria-live="polite">
          <h2 className="text-[15px] font-medium tracking-tight">Your workflow</h2>
          {statsLabel ? <p className="mt-1 text-[12px] text-faint">{statsLabel}</p> : null}
          <div className="mt-4">
            <WorkflowPreviewTree graph={result.graph} />
          </div>
          <p className="mt-4 text-[13px] text-muted">{result.explanation}</p>
          {result.mocked ? (
            <p className="mt-2 text-[12px] text-faint">
              Drafted from FlowForge heuristics. Connect a SpaceXAI key for a live model. Review before you publish.
            </p>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-2">
            <Button loading={saving === "edit"} variant="secondary" onClick={() => void persist("edit")}>
              Edit workflow
            </Button>
            <Button loading={saving === "test"} variant="secondary" onClick={() => void persist("test")}>
              Test workflow
            </Button>
            <Button loading={saving === "publish"} onClick={() => void persist("publish")}>
              Review & publish
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
