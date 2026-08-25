"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { sampleTriggerPayload } from "@/domain/workflow/sample";
import { useEditor } from "./store";

export function TestPanel({
  open,
  onClose,
  onRun,
}: {
  open: boolean;
  onClose: () => void;
  onRun: (input: unknown) => Promise<void>;
}) {
  const graph = useEditor((s) => s.graph);
  const [seed, setSeed] = useState(0);
  const [raw, setRaw] = useState(() => JSON.stringify(sampleTriggerPayload(graph, 0), null, 2));
  const [pending, setPending] = useState(false);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button type="button" className="command-overlay absolute inset-0" aria-label="Close test" onClick={onClose} />
      <div className="dialog-content fixed left-1/2 top-1/2 z-50 w-[min(520px,calc(100vw-2rem))] rounded-[var(--radius)] border border-border bg-bg-elevated p-5 shadow-[var(--shadow)]">
        <p className="text-[15px] font-medium tracking-tight">Test workflow</p>
        <p className="mt-1 text-[13px] text-muted">
          Runs the draft. Labeled as a test execution — not production.
        </p>
        <Textarea className="mt-3 min-h-40 font-mono text-[12px]" value={raw} onChange={(e) => setRaw(e.target.value)} />
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const next = seed + 1;
              setSeed(next);
              setRaw(JSON.stringify(sampleTriggerPayload(graph, next), null, 2));
            }}
          >
            Generate sample
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button
            size="sm"
            loading={pending}
            onClick={async () => {
              setPending(true);
              try {
                const parsed = JSON.parse(raw) as unknown;
                await onRun(parsed);
                onClose();
              } catch {
                setPending(false);
              }
              setPending(false);
            }}
          >
            Run test
          </Button>
        </div>
      </div>
    </div>
  );
}
