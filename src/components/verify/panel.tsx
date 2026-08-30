"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { shortHash } from "@/lib/format";
import { formatDateTime } from "@/lib/format";

export type ReceiptSummary = {
  id: string;
  sequence: number;
  root: string;
  status: string;
  chainId: string | null;
  txHash: string | null;
  blockNumber: string | null;
  contractAddress?: string | null;
  createdAt: string;
  verifiedAt?: string | null;
};

function outcomeLabel(status: string, verifiedOutcome?: string | null) {
  if (verifiedOutcome === "integrity_failed") return "Integrity check failed";
  if (verifiedOutcome === "anchor_failed") return "Verification failed";
  if (verifiedOutcome === "blockchain_anchored") return "Blockchain anchored";
  if (verifiedOutcome === "demo_verified") return "Demo verified";
  if (verifiedOutcome === "integrity_verified") return "Integrity verified";
  if (status === "confirmed") return "Blockchain anchored";
  if (status === "mocked") return "Demo verified";
  if (status === "failed") return "Verification failed";
  if (status === "pending") return "Pending";
  return status;
}

async function copy(value: string) {
  await navigator.clipboard.writeText(value);
  toast.success("Copied");
}

export function VerificationPanel({
  executionId,
  receipt,
}: {
  executionId: string;
  receipt: ReceiptSummary | null;
}) {
  const [current, setCurrent] = useState(receipt);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [retrying, setRetrying] = useState(false);

  if (!current) {
    return (
      <section className="panel proof-rail mt-5 p-5">
        <p className="section-label">Integrity</p>
        <p className="mt-2 text-[13px] text-muted">
          A cryptographic receipt is created when a run finishes. Blockchain anchoring is optional and never required
          to complete the workflow.
        </p>
      </section>
    );
  }

  async function verify() {
    setPending(true);
    const res = await fetch(`/api/executions/${executionId}/verify`, { method: "POST" });
    const data = (await res.json()) as {
      outcome?: string;
      message?: string;
      error?: string;
      status?: string;
      root?: string;
      txHash?: string | null;
      blockNumber?: string | null;
      chainId?: string | null;
    };
    setPending(false);
    if (!res.ok) {
      toast.error(data.error ?? "Could not verify this receipt.");
      return;
    }
    setOutcome(data.outcome ?? null);
    setMessage(data.message ?? null);
    setCurrent((row) =>
      row
        ? {
            ...row,
            status: data.status ?? row.status,
            root: data.root ?? row.root,
            txHash: data.txHash ?? row.txHash,
            blockNumber: data.blockNumber ?? row.blockNumber,
            chainId: data.chainId ?? row.chainId,
          }
        : row,
    );
  }

  async function retry() {
    setRetrying(true);
    const res = await fetch(`/api/executions/${executionId}/receipt`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "retry" }),
    });
    const data = (await res.json()) as { latest?: ReceiptSummary; error?: string };
    setRetrying(false);
    if (!res.ok || !data.latest) {
      toast.error(data.error ?? "Could not retry the blockchain proof.");
      return;
    }
    setCurrent(data.latest);
    toast.success("Proof updated.");
  }

  const mocked = current.status === "mocked";
  const canRetry = current.status === "failed" || (current.status === "pending" && !current.txHash);

  return (
    <section className="panel proof-rail mt-5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="section-label">Integrity proof</p>
          <p className="mt-2 text-[22px] font-medium tracking-[-0.04em] text-[color:var(--verify)]">
            {outcomeLabel(current.status, outcome)}
          </p>
        </div>
        <StatusBadge status={current.status === "mocked" ? "demo" : current.status} />
      </div>
      {mocked ? (
        <p className="mt-2 text-[12px] text-warning">
          Demo verification. This is a local cryptographic proof, not a real blockchain transaction.
        </p>
      ) : (
        <p className="mt-2 text-[12px] text-muted">
          FlowForge stores execution data in the database. Blockchain, when enabled, stores only a hash that the record
          has not been altered.
        </p>
      )}
      {message ? <p className="mt-2 text-[13px] text-muted">{message}</p> : null}
      <dl className="mt-3 grid gap-2 text-[13px] sm:grid-cols-2">
        <div>
          <dt className="text-[11px] text-faint">Receipt root</dt>
          <dd className="mt-0.5 flex items-center gap-2 font-mono text-[12px]">
            {shortHash(current.root)}
            <button type="button" className="text-muted hover:text-text" onClick={() => void copy(current.root)}>
              Copy
            </button>
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-faint">Sequence</dt>
          <dd className="mt-0.5">{current.sequence}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-faint">Network</dt>
          <dd className="mt-0.5">{current.chainId ?? "Local receipt"}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-faint">Transaction</dt>
          <dd className="mt-0.5 flex items-center gap-2 font-mono text-[12px]">
            {current.txHash ? shortHash(current.txHash) : "—"}
            {current.txHash ? (
              <button type="button" className="text-muted hover:text-text" onClick={() => void copy(current.txHash!)}>
                Copy
              </button>
            ) : null}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-faint">Block</dt>
          <dd className="mt-0.5">{current.blockNumber ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-[11px] text-faint">Recorded</dt>
          <dd className="mt-0.5">{formatDateTime(current.createdAt)}</dd>
        </div>
      </dl>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" loading={pending} onClick={() => void verify()}>
          Verify integrity
        </Button>
        {canRetry ? (
          <Button size="sm" variant="ghost" loading={retrying} onClick={() => void retry()}>
            Retry blockchain proof
          </Button>
        ) : null}
        <Button size="sm" variant="ghost" asChild>
          <a href={`/verify/${executionId}`} target="_blank" rel="noreferrer">
            Public proof
          </a>
        </Button>
      </div>
    </section>
  );
}
