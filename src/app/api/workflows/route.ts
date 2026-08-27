import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/server/context";
import { toErrorResponse } from "@/server/errors";
import { createWorkflow } from "@/server/services/workflows";

const schema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional(),
  templateSlug: z.string().max(80).optional(),
  graph: z
    .object({
      nodes: z.array(z.any()),
      edges: z.array(z.any()),
      viewport: z.object({ x: z.number(), y: z.number(), zoom: z.number() }).optional(),
    })
    .optional(),
});

export async function POST(request: Request) {
  try {
    const ctx = await requirePermission("workflows.write");
    const body = schema.parse(await request.json());
    const id = await createWorkflow({
      orgId: ctx.org.id,
      userId: ctx.user.id,
      name: body.name ?? "",
      description: body.description,
      templateSlug: body.templateSlug,
      graph: body.graph,
    });
    return NextResponse.json({ id });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Check the workflow details and try again." }, { status: 422 });
    }
    return toErrorResponse(error);
  }
}
