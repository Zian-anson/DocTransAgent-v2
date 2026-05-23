import { test, expect } from "@playwright/test";

test.describe("Knowledge Base Search", () => {
  test("should load KB search page", async ({ page }) => {
    await page.goto("/kb");

    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 5000 });
  });

  test("should have search input", async ({ page }) => {
    await page.goto("/kb");

    const searchInput = page.getByRole("textbox").or(page.locator("input"));
    await expect(searchInput.first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Q&A Page", () => {
  test("should load Q&A page", async ({ page }) => {
    await page.goto("/qa");

    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Glossary Page", () => {
  test("should load glossary page", async ({ page }) => {
    await page.goto("/glossary");

    await expect(page.locator("h1, h2").first()).toBeVisible({ timeout: 5000 });
  });
});
