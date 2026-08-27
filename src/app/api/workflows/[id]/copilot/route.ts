import { NextResponse } from "next/server";
import { requirePermission } from "@/server/context";
import { toErrorResponse } from "@/server/errors";
import { generateFromPrompt } from "@/server/services/copilot";
import { graphStats } from "@/domain/workflow/stats";
import { ValidationError } from "@/domain/permissions";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requirePermission("workflows.write");
    await params;
    const body = (await request.json()) as { prompt?: string };
    const prompt = body.prompt?.trim();
    if (!prompt) throw new ValidationError("Describe the workflow you want.");
    const result = await generateFromPrompt(prompt);
    return NextResponse.json({ ...result, stats: graphStats(result.graph) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
