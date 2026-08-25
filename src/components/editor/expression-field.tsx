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
    const list = ["trigger", "vars", "env", "trigger.body", "trigger.body.email", "trigger.body.name", "trigger.body.company"];
    for (const node of nodes) {
      list.push(`nodes.${node.id}`);
      const def = getNodeDefinition(node.type);
      const props = Object.keys(def?.outputSchema.properties ?? {});
      for (const prop of props) list.push(`nodes.${node.id}.${prop}`);
    }
    const fragment = value.split("{{").at(-1)?.replace(/\}.*/, "") ?? "";
    const needle = fragment.trim().toLowerCase();
    if (!needle) return list.slice(0, 12);
    return list.filter((item) => item.toLowerCase().includes(needle)).slice(0, 12);
  }, [nodes, value]);
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
              key={item}
              type="button"
              className="block w-full rounded px-2 py-1 text-left font-mono text-[11px] hover:bg-surface-hover"
              onClick={() => onChange(value.includes("{{") ? `${value}{{${item}}}` : `{{${item}}}`)}
            >
              {item}
            </button>
          ))}
        </div>
      ) : null}
      {refs.length ? <p className="font-mono text-[10px] text-faint">refs: {refs.join(", ")}</p> : null}
    </Field>
  );
}
