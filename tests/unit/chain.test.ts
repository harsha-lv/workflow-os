import { describe, expect, it } from "vitest";
import { createMockAdapter } from "@/server/chain/mock";
import { blockchainEnabled, blockchainMode } from "@/server/config";

describe("mock chain adapter", () => {
  it("anchors with a deterministic demo transaction id and never claims a live chain", async () => {
    const adapter = createMockAdapter("demo");
    const first = await adapter.anchor({ executionId: "run_1", root: "aa".repeat(32), versionHash: "bb".repeat(32) });
    const second = await adapter.anchor({ executionId: "run_1", root: "aa".repeat(32), versionHash: "bb".repeat(32) });
    expect(first.mocked).toBe(true);
    expect(first.txHash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(first.txHash).toBe(second.txHash);
    const verified = await adapter.verify(first.txHash);
    expect(verified.ok).toBe(true);
    expect(verified.mocked).toBe(true);
    expect(verified.message.toLowerCase()).toContain("not a real blockchain");
  });
});

describe("blockchain configuration", () => {
  it("defaults to disabled", () => {
    expect(blockchainEnabled()).toBe(false);
    expect(blockchainMode()).toBe("demo");
  });
});
