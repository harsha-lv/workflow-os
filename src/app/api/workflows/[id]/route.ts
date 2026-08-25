import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/server/context";
import { toErrorResponse } from "@/server/errors";
import { getWorkflow, saveDraft, deleteWorkflow } from "@/server/services/workflows";

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  graph: z.object({
    nodes: z.array(z.any()),
    edges: z.array(z.any()),
    viewport: z
      .object({ x: z.number(), y: z.number(), zoom: z.number() })
      .optional(),
  }),
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requirePermission("workflows.read");
    const { id } = await params;
    const data = await getWorkflow(ctx.org.id, id);
    return NextResponse.json(data);
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requirePermission("workflows.write");
    const { id } = await params;
    const body = patchSchema.parse(await request.json());
    await saveDraft({
      orgId: ctx.org.id,
      userId: ctx.user.id,
      workflowId: id,
      name: body.name,
      description: body.description,
      graph: body.graph,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid workflow payload." }, { status: 422 });
    }
    return toErrorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requirePermission("workflows.delete");
    const { id } = await params;
    await deleteWorkflow(ctx.org.id, ctx.user.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return toErrorResponse(error);
  }
}
