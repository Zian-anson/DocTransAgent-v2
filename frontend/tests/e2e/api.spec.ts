import { test, expect } from "@playwright/test";

test.describe("Smoke Tests — Critical Paths", () => {
  test("backend health check returns ok", async ({ request }) => {
    const resp = await request.get("http://127.0.0.1:8000/api/health");
    expect(resp.ok()).toBeTruthy();
    const body = await resp.json();
    expect(body.status).toBe("ok");
    expect(body.models.translate).toBeDefined();
  });

  test("dashboard stats API returns data", async ({ request }) => {
    const resp = await request.get("http://127.0.0.1:8000/api/dashboard/stats");
    expect(resp.ok()).toBeTruthy();
    const body = await resp.json();
    expect(body.documents).toBeDefined();
  });

  test("documents list API returns array", async ({ request }) => {
    const resp = await request.get("http://127.0.0.1:8000/api/documents");
    expect(resp.ok()).toBeTruthy();
    const body = await resp.json();
    expect(Array.isArray(body)).toBe(true);
  });

  test("glossary API returns data", async ({ request }) => {
    const resp = await request.get("http://127.0.0.1:8000/api/glossary");
    expect(resp.ok()).toBeTruthy();
    const body = await resp.json();
    expect(Array.isArray(body)).toBe(true);
  });
});
