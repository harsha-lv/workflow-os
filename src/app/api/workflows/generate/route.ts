import { NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/server/context";
import { toErrorResponse } from "@/server/errors";
import { generateFromPrompt } from "@/server/services/copilot";
import { graphStats } from "@/domain/workflow/stats";

const schema = z.object({
  prompt: z.string().trim().min(8).max(2000),
});

export async function POST(request: Request) {
  try {
    await requirePermission("workflows.write");
    const body = schema.parse(await request.json());
    const result = await generateFromPrompt(body.prompt);
    return NextResponse.json({
      ...result,
      stats: graphStats(result.graph),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Describe what you want to automate in a sentence or two." }, { status: 422 });
    }
    return toErrorResponse(error);
  }
}
