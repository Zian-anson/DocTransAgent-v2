import { test, expect } from "@playwright/test";

test.describe("Dashboard Page", () => {
  test("should load dashboard and display stats", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("h1")).toBeVisible();

    const statCards = page.locator('[class*="rounded"]').filter({ hasText: /Document|文档|翻译|KB|术语/ });
    await expect(statCards.first()).toBeVisible({ timeout: 10000 });
  });

  test("should show GMI Cloud pipeline section", async ({ page }) => {
    await page.goto("/");

    const pipelineHeading = page.getByRole("heading", { name: /GMI Cloud|多模型推理管/ });
    await expect(pipelineHeading).toBeVisible({ timeout: 5000 });
  });

  test("should navigate to upload page from dashboard", async ({ page }) => {
    await page.goto("/");

    const uploadLink = page.getByRole("link", { name: /Upload|上传|文档/ }).first();
    if (await uploadLink.isVisible()) {
      await uploadLink.click();
      await expect(page).toHaveURL(/\/upload/);
    }
  });
});
