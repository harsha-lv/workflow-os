"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function WorkflowActions({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const router = useRouter();
  return (
    <div className="flex flex-wrap gap-1">
      <Button
        size="sm"
        variant="ghost"
        onClick={async () => {
          const res = await fetch(`/api/workflows/${id}/clone`, { method: "POST" });
          const data = (await res.json()) as { id?: string };
          if (!res.ok || !data.id) {
            toast.error("Could not clone.");
            return;
          }
          toast.success("Workflow cloned");
          router.push(`/workflows/${data.id}`);
        }}
      >
        Clone
      </Button>
      {status === "published" ? (
        <Button
          size="sm"
          variant="ghost"
          onClick={async () => {
            const res = await fetch(`/api/workflows/${id}/status`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ status: "paused" }),
            });
            if (!res.ok) {
              toast.error("Could not pause.");
              return;
            }
            toast.success("Workflow paused. Triggers will not start new runs.");
            router.refresh();
          }}
        >
          Pause
        </Button>
      ) : null}
      {status === "paused" ? (
        <Button
          size="sm"
          variant="ghost"
          onClick={async () => {
            await fetch(`/api/workflows/${id}/status`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ status: "published" }),
            });
            toast.success("Workflow resumed");
            router.refresh();
          }}
        >
          Resume
        </Button>
      ) : null}
    </div>
  );
}

export function ImportWorkflowButton() {
  const router = useRouter();
  return (
    <label className="inline-flex h-8 cursor-pointer items-center rounded-[var(--radius-sm)] border border-border px-3 text-[13px] hover:bg-surface-hover">
      Import
      <input
        type="file"
        accept="application/json"
        className="hidden"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (!file) return;
          const raw = JSON.parse(await file.text()) as unknown;
          const res = await fetch("/api/workflows/import", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(raw),
          });
          const data = (await res.json()) as { id?: string; error?: string; warnings?: unknown };
          if (!res.ok || !data.id) {
            toast.error(data.error ?? "Import failed. Nothing was executed.");
            return;
          }
          toast.success("Imported as a draft. Review before publishing.");
          router.push(`/workflows/${data.id}`);
        }}
      />
    </label>
  );
}
