import { describe, expect, it } from "vitest";
import { MockAIProvider } from "@/domain/ai/mock";
import { getProvider } from "@/domain/ai/registry";

describe("AI providers", () => {
  it("uses mock when no key is configured", async () => {
    const provider = getProvider("xai", {});
    expect(provider.id).toBe("mock");
    const result = await new MockAIProvider().complete({
      messages: [{ role: "user", content: "classify this lead as qualified" }],
      json: true,
    });
    expect(result.mocked).toBe(true);
    expect(result.json).toBeTruthy();
  });
});
