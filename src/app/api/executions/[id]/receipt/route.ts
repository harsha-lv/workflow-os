import { NextResponse } from "next/server";
import { requirePermission } from "@/server/context";
import { toErrorResponse } from "@/server/errors";
import { latestReceipt, listReceipts, retryAnchor } from "@/server/services/receipts";
import { NotFoundError } from "@/domain/permissions";

function serialize(row: Awaited<ReturnType<typeof latestReceipt>>) {
  if (!row) return null;
  return {
    id: row.id,
    executionId: row.executionId,
    sequence: row.sequence,
    root: row.root,
    chainId: row.chainId,
    txHash: row.txHash,
    blockNumber: row.blockNumber,
    contractAddress: row.contractAddress,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    verifiedAt: row.verifiedAt?.toISOString() ?? null,
  };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requirePermission("executions.read");
    const { id } = await params;
    const latest = await latestReceipt(id, ctx.org.id);
    if (!latest) throw new NotFoundError("No receipt for this execution");
    const receipts = await listReceipts(id, ctx.org.id);
    return NextResponse.json({ latest: serialize(latest), receipts: receipts.map(serialize) });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requirePermission("workflows.execute");
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as { action?: string };
    if (body.action !== "retry") {
      return NextResponse.json({ error: "Unsupported action." }, { status: 422 });
    }
    const receipt = await retryAnchor(id, ctx.org.id);
    return NextResponse.json({ latest: serialize(receipt) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
