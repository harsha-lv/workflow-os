import { describe, expect, it } from "vitest";
import { assertCan, can } from "@/domain/permissions";

describe("permissions", () => {
  it("allows owners to manage billing and delete the org", () => {
    expect(can("owner", "org.delete")).toBe(true);
    expect(can("owner", "billing.manage")).toBe(true);
  });

  it("keeps viewers read-only", () => {
    expect(can("viewer", "workflows.read")).toBe(true);
    expect(can("viewer", "workflows.write")).toBe(false);
    expect(() => assertCan("viewer", "workflows.execute")).toThrow();
  });

  it("lets editors run workflows but not manage members", () => {
    expect(can("editor", "workflows.execute")).toBe(true);
    expect(can("editor", "members.invite")).toBe(false);
  });
});
