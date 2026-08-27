import { expect, test } from "@playwright/test";

test("sign in and open the dashboard", async ({ page }) => {
  const email = process.env.DEMO_EMAIL ?? "maya.chen@northstar.example";
  const password = process.env.DEMO_PASSWORD ?? "workflow-os-demo";
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Operations" })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("link", { name: "Workflows" }).first().click();
  await expect(page.getByRole("heading", { name: "Workflows" })).toBeVisible();
});
