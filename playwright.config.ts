import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev -- --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      APP_URL: "http://127.0.0.1:3100",
      DATABASE_URL: "file:./data/workflow-os-e2e.db",
      AUTH_SECRET: "e2e-auth-secret-e2e-auth-secret-e2e-auth-secret",
      SEED_ON_BOOT: "true",
      NODE_ENV: "development",
      DEMO_EMAIL: "maya.chen@northstar.example",
      DEMO_PASSWORD: "workflow-os-demo",
    },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
