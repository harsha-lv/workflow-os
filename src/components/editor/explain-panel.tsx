"use client";

import { Button } from "@/components/ui/button";
import { formatGraphStats, type WorkflowStats } from "@/domain/workflow/stats";

export function ExplainPanel({
  open,
  text,
  stats,
  onClose,
}: {
  open: boolean;
  text: string | null;
  stats: WorkflowStats | null;
  onClose: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <button type="button" className="command-overlay absolute inset-0" aria-label="Close explanation" onClick={onClose} />
      <div
        role="dialog"
        aria-labelledby="explain-title"
        className="dialog-content fixed left-1/2 top-1/2 z-50 w-[min(520px,calc(100vw-2rem))] rounded-[var(--radius)] border border-border bg-bg-elevated p-5 shadow-[var(--shadow)]"
      >
        <h2 id="explain-title" className="text-[15px] font-medium tracking-tight">
          Explain this workflow
        </h2>
        {stats ? <p className="mt-1 text-[12px] text-faint">{formatGraphStats(stats)}</p> : null}
        <p className="mt-3 text-[13px] text-muted">{text ?? "Nothing to explain yet."}</p>
        <div className="mt-4 flex justify-end">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
