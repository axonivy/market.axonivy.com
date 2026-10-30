import { expect, test } from "./fixtures.ts";

test("publishes a sitemap index with product routes", async ({ page }) => {
  const indexResponse = await page.request.get("/sitemap-index.xml");
  expect(indexResponse.ok()).toBe(true);

  const index = await indexResponse.text();
  expect(index).toContain("<sitemapindex");

  const sitemapUrl = index.match(/<loc>([^<]+)<\/loc>/)?.[1];
  expect(sitemapUrl).toBeDefined();
  if (!sitemapUrl) return;

  const sitemapPath = new URL(sitemapUrl).pathname;
  const sitemapResponse = await page.request.get(sitemapPath);
  expect(sitemapResponse.ok()).toBe(true);

  const sitemap = await sitemapResponse.text();
  expect(sitemap).toContain("<urlset");
  expect(sitemap).toContain("/portal");
});
