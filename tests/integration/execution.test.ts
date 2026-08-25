import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import { enqueueExecution, runPersistedExecution } from "@/server/services/executions";
import { createWorkflow, publishWorkflow } from "@/server/services/workflows";
import { ensureMigrated, resetDbCache } from "@/db/client";
import { hashPassword } from "@/server/crypto";
import { id } from "@/domain/ids";
import { memberships, organizations, projects, users } from "@/db/schema";

const dbFile = "./data/workflow-os-test.db";

describe("execution persistence", () => {
  let orgId = "";
  let userId = "";
  let workflowId = "";

  beforeAll(async () => {
    process.env.DATABASE_URL = `file:${dbFile}`;
    process.env.SEED_ON_BOOT = "false";
    resetDbCache();
    fs.rmSync(dbFile, { force: true });
    fs.rmSync(`${dbFile}-wal`, { force: true });
    fs.rmSync(`${dbFile}-shm`, { force: true });
    const db = await ensureMigrated();
    userId = id("user");
    orgId = id("org");
    const projectId = id("project");
    await db.insert(users).values({
      id: userId,
      email: "ops@example.com",
      name: "Ops",
      passwordHash: hashPassword("password-password"),
    });
    await db.insert(organizations).values({ id: orgId, name: "Example", slug: "example", plan: "pro" });
    await db.insert(memberships).values({
      id: id("membership"),
      organizationId: orgId,
      userId,
      role: "owner",
    });
    await db.insert(projects).values({
      id: projectId,
      organizationId: orgId,
      name: "Core",
      slug: "core",
    });
    workflowId = await createWorkflow({
      orgId,
      userId,
      projectId,
      name: "Echo",
      graph: {
        nodes: [
          { id: "t", type: "manual.trigger", name: "Start", position: { x: 0, y: 0 }, config: {} },
          {
            id: "out",
            type: "output.response",
            name: "Return",
            position: { x: 200, y: 0 },
            config: { value: "{{trigger.hello}}" },
          },
        ],
        edges: [{ id: "e", source: "t", target: "out" }],
      },
    });
    await publishWorkflow(orgId, userId, workflowId);
  });

  afterAll(() => {
    resetDbCache();
  });

  it("creates, runs, and stores a successful execution", async () => {
    const executionId = await enqueueExecution({
      orgId,
      userId,
      workflowId,
      triggerType: "manual",
      payload: { hello: "world" },
      version: "published",
    });
    await runPersistedExecution(executionId);
    const db = await ensureMigrated();
    const run = await db.query.executions.findFirst({
      where: (t, { eq }) => eq(t.id, executionId),
    });
    expect(run?.status).toBe("success");
    expect(run?.output).toBe("world");
  });
});
