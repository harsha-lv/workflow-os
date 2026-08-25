"use client";

import { getNodeDefinition } from "@/domain/nodes/definitions";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useEditor } from "./store";
import { ExpressionField } from "./expression-field";
import { DataTree } from "./data-tree";
import { guideFor } from "@/domain/nodes/docs";

export function ConfigPanel({ onTest }: { onTest?: () => void }) {
  const graph = useEditor((s) => s.graph);
  const selected = useEditor((s) => s.selected);
  const updateNode = useEditor((s) => s.updateNode);
  const updateConfig = useEditor((s) => s.updateConfig);
  const issues = useEditor((s) => s.issues);
  const node = graph.nodes.find((n) => n.id === selected[0]);
  if (!node) {
    return (
      <aside className="hidden w-[340px] shrink-0 overflow-y-auto border-l border-border bg-bg-elevated p-4 lg:block">
        <p className="text-sm font-medium">Inspector</p>
        <p className="mt-2 text-sm text-muted">
          Select a node to configure it. Type <span className="font-mono text-text">{"{{node.field}}"}</span> to
          reference earlier outputs.
        </p>
        {issues.length ? (
          <ul className="mt-6 grid gap-2 text-xs">
            {issues.map((issue, i) => (
              <li key={i} className={issue.severity === "error" ? "text-danger" : "text-warning"}>
                {issue.message}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-6 text-xs text-success">No validation errors.</p>
        )}
      </aside>
    );
  }
  const def = getNodeDefinition(node.type);
  const basic = def?.configFields.filter((f) => !f.advanced) ?? [];
  const advanced = def?.configFields.filter((f) => f.advanced) ?? [];
  const nodeIssues = issues.filter((i) => i.nodeId === node.id);

  function setField(key: string, value: unknown) {
    updateConfig(node!.id, { ...node!.config, [key]: value });
  }

  return (
    <aside className="fixed inset-x-0 bottom-0 z-20 max-h-[55vh] overflow-y-auto border-t border-border bg-bg-elevated p-4 max-lg:animate-[slide-in-up_var(--duration)_var(--ease)] lg:static lg:z-0 lg:h-auto lg:max-h-none lg:w-[340px] lg:shrink-0 lg:border-l lg:border-t-0 lg:animate-[slide-in-right_var(--duration)_var(--ease)]">
      <p className="text-xs uppercase tracking-wide text-faint">{def?.category}</p>
      <Field label="Name">
        <Input value={node.name} onChange={(e) => updateNode(node.id, { name: e.target.value })} />
      </Field>
      <p className="mt-3 text-[13px] text-muted">{def?.description}</p>
      {def ? (
        <details className="mt-2">
          <summary className="cursor-pointer text-[12px] text-faint">What does this do?</summary>
          <div className="mt-2 grid gap-1 text-[12px] text-muted">
            <p>{def.docs}</p>
            <p>
              <span className="text-faint">Example · </span>
              {guideFor(def.type).example}
            </p>
            <p>
              <span className="text-faint">Watch for · </span>
              {guideFor(def.type).mistakes[0]}
            </p>
          </div>
        </details>
      ) : null}
      <div className="mt-4 grid gap-3">
        {basic.map((field) => (
          <ConfigField
            key={field.key}
            field={field}
            value={node.config[field.key]}
            onChange={(v) => setField(field.key, v)}
            graph={graph}
            currentId={node.id}
          />
        ))}
      </div>
      {advanced.length ? (
        <details className="mt-4">
          <summary className="cursor-pointer text-xs text-muted">Advanced</summary>
          <div className="mt-3 grid gap-3">
            {advanced.map((field) => (
              <ConfigField
                key={field.key}
                field={field}
                value={node.config[field.key]}
                onChange={(v) => setField(field.key, v)}
                graph={graph}
                currentId={node.id}
              />
            ))}
          </div>
        </details>
      ) : null}
      {nodeIssues.length ? (
        <ul className="mt-4 grid gap-1 text-xs text-danger">
          {nodeIssues.map((issue, i) => (
            <li key={i}>{issue.message}</li>
          ))}
        </ul>
      ) : null}
      <p className="mt-4 text-xs text-faint">{def?.docs}</p>
      <DataTree
        nodes={graph.nodes}
        currentId={node.id}
        onInsert={(expr) => {
          const current = node.config;
          const key = def?.configFields.find((f) => f.type === "expression" || f.type === "text")?.key;
          if (!key) return;
          const prev = current[key];
          updateConfig(node.id, { ...current, [key]: `${typeof prev === "string" ? prev : ""}${expr}` });
        }}
      />
      {onTest && def && !def.isTrigger ? (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onTest}>
          Run workflow
        </Button>
      ) : null}
    </aside>
  );
}

function ConfigField({
  field,
  value,
  onChange,
  graph,
  currentId,
}: {
  field: { key: string; label: string; type: string; description?: string; placeholder?: string; options?: Array<{ value: string; label: string }>; };
  value: unknown;
  onChange: (value: unknown) => void;
  graph: { nodes: Array<{ id: string; name: string; type: string }> };
  currentId: string;
}) {
  if (field.type === "boolean") {
    return (
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={Boolean(value)}
          onChange={(e) => onChange(e.target.checked)}
        />
        {field.label}
      </label>
    );
  }
  if (field.type === "select" && field.options) {
    return (
      <Field label={field.label} hint={field.description}>
        <select
          className="h-9 w-full rounded-md border border-border bg-bg-sunken px-2 text-sm"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        >
          {field.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </Field>
    );
  }
  if (field.type === "text" || field.type === "expression") {
    return (
      <ExpressionField
        label={field.label}
        hint={field.description}
        value={typeof value === "string" ? value : value != null ? JSON.stringify(value, null, 2) : ""}
        placeholder={field.placeholder}
        onChange={onChange}
        nodes={graph.nodes.filter((n) => n.id !== currentId)}
        multiline={field.type === "text" || field.type === "expression"}
      />
    );
  }
  if (field.type === "json") {
    return (
      <Field label={field.label} hint={field.description}>
        <Textarea
          value={typeof value === "string" ? value : JSON.stringify(value ?? {}, null, 2)}
          onChange={(e) => {
            try {
              onChange(JSON.parse(e.target.value) as unknown);
            } catch {
              onChange(e.target.value);
            }
          }}
          className="font-mono text-xs"
        />
      </Field>
    );
  }
  if (field.type === "number" || field.type === "duration") {
    return (
      <Field label={field.label} hint={field.description}>
        <Input
          type="number"
          value={Number(value ?? 0)}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </Field>
    );
  }
  return (
    <Field label={field.label} hint={field.description}>
      <Input
        value={String(value ?? "")}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </Field>
  );
}
