import { expect, test } from "@playwright/test";
import { DEMO_EMAIL, DEMO_PASSWORD } from "../../src/server/seed";

test("sign in and open the dashboard", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(DEMO_EMAIL);
  await page.getByLabel("Password").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Operations" })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("link", { name: "Workflows" }).first().click();
  await expect(page.getByRole("heading", { name: "Workflows" })).toBeVisible();
});
