import { eq } from "drizzle-orm";
import { ensureMigrated } from "@/db/client";
import { approvals } from "@/db/schema";
import { requirePermission } from "@/server/context";
import { decideApproval } from "@/server/services/executions";
import { revalidatePath } from "next/cache";
import { EmptyState, PageHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { formatRelative } from "@/lib/format";

export default async function ApprovalsPage() {
  const ctx = await requirePermission("approvals.decide");
  const db = await ensureMigrated();
  const rows = await db.query.approvals.findMany({
    where: eq(approvals.organizationId, ctx.org.id),
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });

  async function decide(formData: FormData) {
    "use server";
    const session = await requirePermission("approvals.decide");
    const approvalId = String(formData.get("id"));
    const decision = String(formData.get("decision")) as "approve" | "reject" | "request_changes";
    const comment = String(formData.get("comment") ?? "");
    const executionId = await decideApproval({
      orgId: session.org.id,
      userId: session.user.id,
      approvalId,
      decision,
      comment,
    });
    const { kickExecution } = await import("@/server/services/executions");
    kickExecution(executionId);
    revalidatePath("/approvals");
    revalidatePath("/runs");
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Approvals"
        description="Human-in-the-loop pauses stay here until someone approves, rejects, or asks for changes."
      />
      {rows.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            title="Nothing waiting on you."
            description="When a workflow pauses for a person, it appears here — including on a phone. You can approve, reject, or ask for changes."
          />
        </div>
      ) : (
        <div className="mt-5 grid gap-2.5">
          {rows.map((row) => (
            <article key={row.id} className="panel p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-[13px] font-medium">{row.title}</h2>
                  <p className="mt-1 text-[13px] text-muted">{row.summary}</p>
                  <p className="mt-2 text-[11px] text-faint">{formatRelative(row.createdAt)}</p>
                </div>
                <StatusBadge status={row.status} />
              </div>
              {row.status === "pending" ? (
                <form action={decide} className="mt-4 grid gap-2">
                  <input type="hidden" name="id" value={row.id} />
                  <textarea
                    name="comment"
                    placeholder="Optional comment"
                    className="min-h-16 rounded-md border border-border bg-bg-sunken px-3 py-2 text-sm"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button name="decision" value="approve" size="sm">
                      Approve
                    </Button>
                    <Button name="decision" value="request_changes" size="sm" variant="secondary">
                      Request changes
                    </Button>
                    <Button name="decision" value="reject" size="sm" variant="danger">
                      Reject
                    </Button>
                  </div>
                </form>
              ) : row.comment ? (
                <p className="mt-3 text-sm text-muted">{row.comment}</p>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
