"use client";

import { useMemo, useState } from "react";
import { Field, Textarea } from "@/components/ui/input";
import { getNodeDefinition } from "@/domain/nodes/definitions";
import { collectExpressionRefs } from "@/domain/expressions/evaluate";

export function ExpressionField({
  label,
  hint,
  value,
  onChange,
  placeholder,
  nodes,
  multiline = true,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  nodes: Array<{ id: string; name: string; type: string }>;
  multiline?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const suggestions = useMemo(() => {
    const list: Array<{ path: string; label: string }> = [
      { path: "trigger", label: "trigger" },
      { path: "trigger.body", label: "trigger.body" },
      { path: "trigger.body.email", label: "email" },
      { path: "trigger.body.name", label: "name" },
      { path: "trigger.body.company", label: "company" },
    ];
    for (const node of nodes) {
      list.push({ path: `nodes.${node.id}`, label: node.name });
      const def = getNodeDefinition(node.type);
      const props = Object.keys(def?.outputSchema.properties ?? {});
      for (const prop of props) list.push({ path: `nodes.${node.id}.${prop}`, label: `${node.name}.${prop}` });
    }
    const open = value.lastIndexOf("{{");
    const close = value.lastIndexOf("}}");
    const fragment = open > close ? value.slice(open + 2) : "";
    const needle = fragment.trim().toLowerCase();
    if (!needle) return list.slice(0, 12);
    return list
      .filter(
        (item) =>
          item.path.toLowerCase().startsWith(needle) ||
          item.label.toLowerCase().includes(needle) ||
          item.path.toLowerCase().includes(needle),
      )
      .slice(0, 12);
  }, [nodes, value]);

  function applySuggestion(path: string) {
    const open = value.lastIndexOf("{{");
    const close = value.lastIndexOf("}}");
    if (open === -1 || open < close) {
      onChange(`${value}{{${path}}}`);
      return;
    }
    onChange(`${value.slice(0, open)}{{${path}}}`);
  }
  const refs = useMemo(() => {
    try {
      return collectExpressionRefs(value);
    } catch {
      return [];
    }
  }, [value]);

  return (
    <Field label={label} hint={hint}>
      <Textarea
        value={value}
        placeholder={placeholder ?? "{{nodes.extract.email}}"}
        className={multiline ? "min-h-24 font-mono text-xs" : "min-h-10 font-mono text-xs"}
        onFocus={() => setOpen(true)}
        onChange={(e) => onChange(e.target.value)}
      />
      {open ? (
        <div className="mt-1 max-h-32 overflow-y-auto rounded-md border border-border bg-surface p-1">
          {suggestions.map((item) => (
            <button
              key={item.path}
              type="button"
              className="flex w-full items-center justify-between rounded px-2 py-1 text-left font-mono text-[11px] hover:bg-surface-hover"
              onClick={() => applySuggestion(item.path)}
            >
              <span>{item.label}</span>
              <span className="text-faint">{item.path}</span>
            </button>
          ))}
        </div>
      ) : null}
      {refs.length ? <p className="font-mono text-[10px] text-faint">refs: {refs.join(", ")}</p> : null}
    </Field>
  );
}
