import { test, expect } from "@playwright/test";

test.describe("Document Upload Page", () => {
  test("should load upload page", async ({ page }) => {
    await page.goto("/upload");

    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 5000 });
  });

  test("should display upload button", async ({ page }) => {
    await page.goto("/upload");

    const uploadButton = page.getByRole("button", { name: /upload|上传/ }).first();
    const uploadLabel = page.locator("label").filter({ hasText: /upload|上传/ }).first();

    await expect(uploadButton.or(uploadLabel).first()).toBeVisible({ timeout: 5000 });
  });
});
