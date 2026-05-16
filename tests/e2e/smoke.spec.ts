import { test, expect } from "@playwright/test";

test("homepage renders the nameplate and a hero", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("text=Techno Times").first()).toBeVisible();
  // Hero headline (first <h2> on the page).
  await expect(page.locator("h2").first()).toBeVisible();
});

test("category page renders breadcrumb LD + section header", async ({ page }) => {
  await page.goto("/technology");
  await expect(page.locator("h1", { hasText: "Technology" })).toBeVisible();
  const ld = await page
    .locator('script[type="application/ld+json"]')
    .first()
    .innerText();
  expect(ld).toContain("BreadcrumbList");
});

test("custom landing: politics has live-trackers heading", async ({ page }) => {
  await page.goto("/politics");
  await expect(page.locator("text=Live trackers")).toBeVisible();
  await expect(page.locator("text=The Supreme Court")).toBeVisible();
});

test("custom landing: sports has Leagues strip", async ({ page }) => {
  await page.goto("/sports");
  await expect(page.locator("text=Leagues")).toBeVisible();
  await expect(page.locator("text=Motorsports")).toBeVisible();
});

test("custom landing: opinion has Columnists block", async ({ page }) => {
  await page.goto("/opinion");
  await expect(page.locator("text=Columnists")).toBeVisible();
});

test("author profile page renders", async ({ page }) => {
  await page.goto("/by/mira-chen");
  await expect(page.locator("h1", { hasText: "Mira Chen" })).toBeVisible();
  await expect(page.locator("text=Senior Technology Correspondent")).toBeVisible();
});

test("about-our-ai disclosure page is reachable", async ({ page }) => {
  await page.goto("/about-our-ai");
  await expect(page.locator("h1", { hasText: "How Techno Times uses AI" })).toBeVisible();
});

test("privacy and terms pages render", async ({ page }) => {
  await page.goto("/privacy");
  await expect(page.locator("h1", { hasText: "Privacy Policy" })).toBeVisible();
  await page.goto("/terms");
  await expect(page.locator("h1", { hasText: "Terms of Service" })).toBeVisible();
});

test("search submits a query", async ({ page }) => {
  await page.goto("/search?q=ai");
  await expect(page.locator("h1")).toContainText("ai");
});

test("RSS feed is XML", async ({ request }) => {
  const r = await request.get("/feed.xml");
  expect(r.status()).toBe(200);
  expect(r.headers()["content-type"]).toContain("application/rss+xml");
  const body = await r.text();
  expect(body).toContain("<rss");
});

test("news-sitemap is XML", async ({ request }) => {
  const r = await request.get("/news-sitemap.xml");
  expect(r.status()).toBe(200);
  expect(r.headers()["content-type"]).toContain("application/xml");
});

test("admin gates on login", async ({ page }) => {
  const r = await page.goto("/admin", { waitUntil: "domcontentloaded" });
  // Either we hit the login page directly, or we got redirected to it.
  expect(page.url()).toContain("/admin/login");
  expect(r?.status() ?? 200).toBeLessThan(500);
});

test("admin API endpoints reject unauthenticated POSTs", async ({ request }) => {
  for (const path of [
    "/api/agent/articles",
    "/api/agent/budget",
    "/api/agent/logs",
    "/api/agent/runs",
    "/api/admin/article-action",
  ]) {
    const r =
      path === "/api/agent/budget"
        ? await request.get(path)
        : await request.post(path, {
            data: {},
            headers: { "content-type": "application/json" },
          });
    expect([401, 405]).toContain(r.status());
  }
});
