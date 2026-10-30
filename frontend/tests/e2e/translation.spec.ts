import { expect, test } from "./fixtures.ts";

test("shows the German overview", async ({ page }) => {
  await page.goto("/de");

  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  await expect(
    page.getByRole("heading", { name: "Axon Ivy Marktplatz", level: 1 }),
  ).toBeVisible();
  const aTrust = page.locator('section a[href="/de/product/a-trust"]');
  await expect(aTrust).toContainText(
    "Verifiziere deine österreichischen Kunden",
  );
});

test("shows the German product page with the German README", async ({
  page,
}) => {
  await page.goto("/de/product/a-trust");

  await expect(page.getByRole("tab", { name: "Beschreibung" })).toBeVisible();
  await expect(page.getByRole("tabpanel")).toContainText(
    "ist ein österreichisches Unternehmen",
  );
  await expect(
    page.getByRole("button", { name: "Jetzt installieren" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Home", exact: true }),
  ).toHaveAttribute("href", "/de");
});

test("falls back to the English README", async ({ page }) => {
  // web-tester has no README_DE.md.
  await page.goto("/de/product/web-tester");

  await expect(page.getByRole("tab", { name: "Beschreibung" })).toBeVisible();
  await expect(page.getByRole("tabpanel")).toContainText(
    "keeping your workflow app functional",
  );
});

test("switches the language and keeps query and hash", async ({ page }) => {
  await page.goto("/product/a-trust?foo=bar#dependency");

  await page.getByRole("button", { name: "DE", exact: true }).click();

  await expect(page).toHaveURL(
    /\/de\/product\/a-trust\/?\?foo=bar#dependency$/,
  );
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
  await expect(
    page.getByRole("button", { name: "DE", exact: true }),
  ).toHaveAttribute("aria-current", "true");
  await expect(page.getByRole("tab", { name: "Maven" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect(await page.evaluate(() => localStorage.getItem("lang"))).toBe("de");
});

test("redirects to the saved language", async ({ page }) => {
  await page.goto("/product/a-trust");
  await page.evaluate(() => localStorage.setItem("lang", "de"));

  await page.goto("/product/a-trust?q=x#dependency");
  await expect(page).toHaveURL(/\/de\/product\/a-trust\/?\?q=x#dependency$/);

  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page).toHaveURL(/\/product\/a-trust\/?\?q=x#dependency$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.goto("/");
  await expect(page).toHaveURL("/");
});

test("keeps the language when opening a product", async ({ page }) => {
  await page.goto("/de");

  await page.locator('section a[href="/de/product/a-trust"]').click();

  await expect(page).toHaveURL("/de/product/a-trust");
  await expect(page.locator("html")).toHaveAttribute("lang", "de");
});
