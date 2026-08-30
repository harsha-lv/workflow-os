"use client";

import { useState } from "react";
import { toast } from "sonner";

export function VerifyOnChainToggle({
  workflowId,
  initial,
}: {
  workflowId: string;
  initial: boolean;
}) {
  const [value, setValue] = useState(initial);
  const [pending, setPending] = useState(false);

  async function onChange(next: boolean) {
    setValue(next);
    setPending(true);
    const res = await fetch(`/api/workflows/${workflowId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ verifyOnChain: next }),
    });
    setPending(false);
    if (!res.ok) {
      setValue(!next);
      toast.error("Could not update verification settings.");
      return;
    }
    toast.success(next ? "Successful production runs will get a cryptographic proof." : "On-chain proofs disabled for this workflow.");
  }

  return (
    <label className="flex items-start gap-2 text-[12px] text-muted">
      <input
        type="checkbox"
        className="mt-0.5"
        checked={value}
        disabled={pending}
        onChange={(e) => void onChange(e.target.checked)}
      />
      <span>
        <span className="text-text">Anchor successful production runs</span>
        <span className="mt-0.5 block text-[11px] text-faint">
          Create a tamper-evident proof of workflow executions. Optional. Never required to finish a run.
        </span>
      </span>
    </label>
  );
}
