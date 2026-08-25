"use client";

import { Button } from "@/components/ui/button";
import { validateGraph } from "@/domain/workflow/validate";
import { formatValidationHeadline } from "@/domain/workflow/suggestions";
import { diffGraphs, type GraphChange } from "@/domain/workflow/diff";
import { useEditor } from "./store";
import type { WorkflowGraph } from "@/domain/graph";

export function PublishDialog({
  open,
  onClose,
  onConfirm,
  publishedGraph,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  publishedGraph?: WorkflowGraph;
}) {
  const graph = useEditor((s) => s.graph);
  const select = useEditor((s) => s.select);
  if (!open) return null;
  const result = validateGraph(graph);
  const changes: GraphChange[] = publishedGraph ? diffGraphs(publishedGraph, graph) : [];
  const headline = formatValidationHeadline(result.issues);

  return (
    <div className="fixed inset-0 z-50">
      <button type="button" className="command-overlay absolute inset-0" aria-label="Close" onClick={onClose} />
      <div className="dialog-content fixed left-1/2 top-1/2 z-50 w-[min(520px,calc(100vw-2rem))] rounded-[var(--radius)] border border-border bg-bg-elevated p-5 shadow-[var(--shadow)]">
        <p className="text-[15px] font-medium tracking-tight">{headline}</p>
        <p className="mt-1 text-[13px] text-muted">Draft → Published. Executions will use this version.</p>
        {result.issues.length ? (
          <ul className="mt-3 grid gap-1.5 text-[13px]">
            {result.issues.map((issue, i) => (
              <li key={i}>
                <button
                  type="button"
                  className={issue.severity === "error" ? "text-danger" : "text-warning"}
                  onClick={() => {
                    if (issue.nodeId) select([issue.nodeId]);
                    onClose();
                  }}
                >
                  {issue.severity === "error" ? "Error · " : "Warning · "}
                  {issue.message}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-[13px] text-success">No blocking issues.</p>
        )}
        {changes.length ? (
          <ul className="mt-3 grid gap-1 text-[12px] text-muted">
            {changes.slice(0, 8).map((change, i) => (
              <li key={i}>
                {change.kind === "added" ? "+" : change.kind === "removed" ? "−" : "~"} {change.label}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" disabled={!result.ok} onClick={() => void onConfirm()}>
            Publish
          </Button>
        </div>
      </div>
    </div>
  );
}
