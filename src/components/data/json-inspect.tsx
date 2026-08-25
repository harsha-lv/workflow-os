"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export function JsonInspect({ value }: { value: unknown }) {
  const [query, setQuery] = useState("");
  const text = useMemo(() => (value == null ? "null" : JSON.stringify(value, null, 2)), [value]);
  const filtered = useMemo(() => {
    if (!query.trim()) return text;
    return text
      .split("\n")
      .filter((line) => line.toLowerCase().includes(query.toLowerCase()))
      .join("\n");
  }, [query, text]);

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter"
          className="h-7 flex-1 rounded-md border border-border bg-input px-2 text-[12px]"
        />
        <Button
          size="sm"
          variant="secondary"
          onClick={async () => {
            await navigator.clipboard.writeText(text);
            toast.success("Copied");
          }}
        >
          Copy
        </Button>
      </div>
      <pre className="max-h-72 overflow-auto rounded-md border border-border bg-bg-sunken p-3 font-mono text-[11px] leading-5">
        {filtered || "No matching lines."}
      </pre>
    </div>
  );
}
