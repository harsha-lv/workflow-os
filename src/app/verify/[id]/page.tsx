import { publicVerificationView, verifyExecution } from "@/server/services/receipts";
import { shortHash, formatDateTime } from "@/lib/format";
import { StatusBadge } from "@/components/ui/badge";

export const metadata = {
  title: "Verification",
  description: "Public cryptographic proof for a FlowForge execution.",
};

function labelFor(outcome: string, mocked: boolean) {
  if (outcome === "integrity_failed") return "INVALID";
  if (outcome === "anchor_failed") return "INVALID";
  if (outcome === "pending") return "PENDING";
  if (outcome === "demo_verified" || mocked) return "VERIFIED";
  if (outcome === "blockchain_anchored" || outcome === "integrity_verified") return "VERIFIED";
  return outcome.toUpperCase();
}

export default async function PublicVerifyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let proof: ReturnType<typeof publicVerificationView> | null = null;
  try {
    proof = publicVerificationView(await verifyExecution(id, undefined, { audit: false }));
  } catch {
    proof = null;
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center px-6 py-16">
      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--verify)]">FlowForge Verification</p>
      <h1 className="mt-3 text-4xl font-medium tracking-[-0.045em]">Execution proof</h1>
      {!proof ? (
        <p className="mt-4 text-sm text-muted">No public proof was found for this identifier.</p>
      ) : (
        <div className="panel proof-rail mt-6 p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-3xl font-medium tracking-[-0.05em] text-[color:var(--verify)]">{labelFor(proof.outcome, proof.mocked)}</p>
            <StatusBadge status={proof.mocked ? "demo" : proof.status} />
          </div>
          {proof.mocked ? (
            <p className="mt-3 text-[13px] text-warning">
              Demo verification. This is not a real blockchain transaction.
            </p>
          ) : (
            <p className="mt-3 text-[13px] text-muted">
              {proof.outcome === "blockchain_anchored"
                ? "Real blockchain verification. Only a cryptographic hash was stored on-chain."
                : "Local cryptographic receipt. Workflow data is not shown here."}
            </p>
          )}
          <dl className="mt-4 grid gap-3 text-[13px]">
            <div>
              <dt className="text-[11px] text-faint">Receipt root</dt>
              <dd className="mt-0.5 font-mono text-[12px]">{shortHash(proof.root)}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-faint">Network</dt>
              <dd className="mt-0.5">{proof.chainId ?? "Local"}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-faint">Transaction</dt>
              <dd className="mt-0.5 font-mono text-[12px]">{proof.txHash ? shortHash(proof.txHash) : "—"}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-faint">Block</dt>
              <dd className="mt-0.5">{proof.blockNumber ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-faint">Verification timestamp</dt>
              <dd className="mt-0.5">{formatDateTime(proof.verifiedAt ?? proof.createdAt)}</dd>
            </div>
          </dl>
          {proof.explorerUrl ? (
            <a className="mt-4 inline-block text-[13px] text-accent hover:underline" href={proof.explorerUrl} rel="noreferrer">
              View on explorer
            </a>
          ) : null}
          <p className="mt-4 text-[12px] text-faint">{proof.message}</p>
        </div>
      )}
    </main>
  );
}
