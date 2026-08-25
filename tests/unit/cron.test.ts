import { describe, expect, it } from "vitest";
import { cronMatches } from "@/domain/cron";

describe("cron", () => {
  it("matches weekday mornings", () => {
    const mondayNine = new Date(Date.UTC(2026, 7, 24, 9, 0, 0)); // Monday
    expect(cronMatches("0 9 * * 1-5", mondayNine)).toBe(true);
    expect(cronMatches("0 9 * * 1-5", new Date(Date.UTC(2026, 7, 23, 9, 0, 0)))).toBe(false);
  });
});
