import { describe, expect, it } from "vitest";
import { databaseUrl, isPostgresUrl, webhookUrl } from "@/server/config";

describe("database dialect", () => {
  it("detects postgres URLs and file URLs", () => {
    expect(isPostgresUrl("postgres://workflow:pass@db:5432/workflow_os")).toBe(true);
    expect(isPostgresUrl("postgresql://workflow@localhost/workflow_os")).toBe(true);
    expect(isPostgresUrl("file:./data/workflow-os.db")).toBe(false);
    expect(isPostgresUrl("http://example.com")).toBe(false);
  });

  it("treats blank DATABASE_URL as unset and prefers POSTGRES_URL", () => {
    const keys = ["DATABASE_URL", "POSTGRES_URL", "POSTGRES_PRISMA_URL"] as const;
    const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
    try {
      process.env.DATABASE_URL = "  ";
      delete process.env.POSTGRES_URL;
      delete process.env.POSTGRES_PRISMA_URL;
      expect(databaseUrl()).toBe("file:./data/workflow-os.db");
      process.env.POSTGRES_URL = "postgres://workflow:pass@db:5432/workflow_os";
      expect(databaseUrl()).toBe("postgres://workflow:pass@db:5432/workflow_os");
    } finally {
      for (const key of keys) {
        if (previous[key] === undefined) delete process.env[key];
        else process.env[key] = previous[key];
      }
    }
  });
});

describe("webhook URLs", () => {
  it("build from APP_URL", () => {
    expect(webhookUrl("abc123")).toBe("http://localhost:3000/api/webhooks/abc123");
  });
});
