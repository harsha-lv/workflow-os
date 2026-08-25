"use client";

import { StatusBadge } from "@/components/ui/badge";
import { formatDuration } from "@/lib/format";
import { cn } from "@/lib/utils";

export type LiveStep = {
  nodeId: string;
  name: string;
  status: string;
  durationMs: number | null;
  startedAt: string | Date | null;
};

export function LiveDock({
  status,
  steps,
  startedAt,
  onSelect,
}: {
  status: string;
  steps: LiveStep[];
  startedAt: string | Date | null;
  onSelect: (nodeId: string) => void;
}) {
  const origin = startedAt ? new Date(startedAt).getTime() : 0;
  return (
    <div className="border-t border-border bg-bg-elevated">
      <div className="flex items-center justify-between px-3 py-1.5">
        <p className="text-[12px] text-muted">Live execution</p>
        <StatusBadge status={status} />
      </div>
      <ol className="max-h-36 overflow-y-auto px-3 pb-2 font-mono text-[11px]">
        {steps.map((step) => {
          const ts = step.startedAt ? new Date(step.startedAt).getTime() - origin : 0;
          const stamp = `${Math.floor(Math.max(0, ts) / 1000)
            .toString()
            .padStart(2, "0")}.${String(Math.max(0, ts) % 1000).padStart(2, "0").slice(0, 2)}`;
          return (
            <li key={step.nodeId}>
              <button
                type="button"
                onClick={() => onSelect(step.nodeId)}
                className={cn("flex w-full items-center gap-2 rounded px-1 py-0.5 text-left hover:bg-surface-hover")}
              >
                <span className="text-faint">{stamp}</span>
                <span className="flex-1 truncate">{step.name}</span>
                <span className="text-faint">{formatDuration(step.durationMs)}</span>
                <StatusBadge status={step.status} />
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
