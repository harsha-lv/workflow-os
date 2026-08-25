import { NextResponse } from "next/server";
import { requirePermission } from "@/server/context";
import { toErrorResponse } from "@/server/errors";
import { createWorkflow } from "@/server/services/workflows";
import { parseImport } from "@/domain/workflow/sample";
import { validateGraph } from "@/domain/workflow/validate";

export async function POST(request: Request) {
  try {
    const ctx = await requirePermission("workflows.write");
    const body = parseImport(await request.json());
    const validation = validateGraph(body.graph);
    const id = await createWorkflow({
      orgId: ctx.org.id,
      userId: ctx.user.id,
      name: `${body.name} — Imported`,
      description: body.description,
      graph: body.graph,
    });
    return NextResponse.json({
      id,
      warnings: validation.issues,
      secrets: body.graph.nodes.some((n) => n.type === "data.http")
        ? ["HTTP nodes may reference workspace secrets that are not in this file."]
        : [],
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}
