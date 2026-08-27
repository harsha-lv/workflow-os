import { describe, expect, it } from "vitest";
import { isPostgresUrl, webhookUrl } from "@/server/config";

describe("database dialect", () => {
  it("detects postgres URLs and file URLs", () => {
    expect(isPostgresUrl("postgres://workflow:pass@db:5432/workflow_os")).toBe(true);
    expect(isPostgresUrl("postgresql://workflow@localhost/workflow_os")).toBe(true);
    expect(isPostgresUrl("file:./data/workflow-os.db")).toBe(false);
    expect(isPostgresUrl("http://example.com")).toBe(false);
  });
});

describe("webhook URLs", () => {
  it("build from APP_URL", () => {
    expect(webhookUrl("abc123")).toBe("http://localhost:3000/api/webhooks/abc123");
  });
});
