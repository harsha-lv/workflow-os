"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Kbd } from "@/components/ui/kbd";

export type SearchHit = {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  href: string;
};

const GROUPS: Array<{ type: string; label: string }> = [
  { type: "command", label: "Jump to" },
  { type: "workflow", label: "Workflows" },
  { type: "template", label: "Templates" },
  { type: "execution", label: "Runs" },
  { type: "project", label: "Projects" },
  { type: "integration", label: "Integrations" },
  { type: "approval", label: "Approvals" },
  { type: "audit", label: "Audit" },
];

export function CommandPalette({
  open,
  onOpenChange,
  hits,
  onQuery,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hits: SearchHit[];
  onQuery: (q: string) => void;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        onOpenChange(!open);
      }
      if (event.key === "Escape" && open) onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => onQuery(q), 80);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, open]);

  const grouped = useMemo(() => {
    return GROUPS.map((group) => ({
      ...group,
      items: hits.filter((hit) => hit.type === group.type),
    })).filter((group) => group.items.length > 0);
  }, [hits]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button className="command-overlay absolute inset-0" aria-label="Close search" onClick={() => onOpenChange(false)} />
      <Command
        label="Global search"
        className="command-panel fixed left-1/2 top-[16%] z-50 w-[min(560px,calc(100vw-2rem))] overflow-hidden rounded-[var(--radius)] border border-border bg-bg-elevated shadow-[var(--shadow)]"
      >
        <div className="flex items-center border-b border-border">
          <Command.Input
            autoFocus
            value={q}
            onValueChange={setQ}
            placeholder="Search workflows, runs, templates, approvals…"
            className="h-11 w-full bg-transparent px-3.5 text-[13px] outline-none"
          />
          <Kbd className="mr-3">esc</Kbd>
        </div>
        <Command.List className="max-h-80 overflow-y-auto p-1.5">
          <Command.Empty className="px-3 py-8 text-[13px] text-muted">
            Nothing matches yet. Try a workflow name, template, or run id.
          </Command.Empty>
          {grouped.map((group) => (
            <Command.Group key={group.type} className="mb-1.5">
              <p className="section-label px-2 py-1.5">{group.label}</p>
              {group.items.map((hit) => (
                <Command.Item
                  key={`${hit.type}-${hit.id}`}
                  value={`${hit.title} ${hit.subtitle ?? ""} ${hit.type}`}
                  onSelect={() => {
                    onOpenChange(false);
                    router.push(hit.href);
                  }}
                  className="flex cursor-pointer items-center justify-between rounded-md px-2 py-1.5 text-[13px] transition-colors duration-[var(--duration-fast)] data-[selected=true]:bg-surface-hover"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">{hit.title}</span>
                    <span className="text-[11px] text-faint">
                      {hit.type}
                      {hit.subtitle ? ` · ${hit.subtitle}` : ""}
                    </span>
                  </span>
                  <Kbd className="ml-3">↵</Kbd>
                </Command.Item>
              ))}
            </Command.Group>
          ))}
        </Command.List>
      </Command>
    </div>
  );
}
