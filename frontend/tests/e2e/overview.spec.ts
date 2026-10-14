import { expect, test, type Page } from "./fixtures.ts";

const cards = (page: Page) => page.locator("section a[href]");
const card = (page: Page, id: string) =>
  page.locator(`section a[href="/${id}"]`);
const search = (page: Page) => page.getByPlaceholder("Search a keyword");

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("lists the products with the featured ones first", async ({ page }) => {
  await expect(
    page.getByRole("heading", { name: "Axon Ivy Market", level: 1 }),
  ).toBeVisible();
  expect(await cards(page).count()).toBeGreaterThan(50);

  const first = cards(page).first();
  await expect(first).toHaveAttribute("href", "/portal");
  await expect(first.getByText("Featured")).toBeVisible();
});

test("marks deprecated products", async ({ page }) => {
  await expect(
    card(page, "excel-importer").getByText("Deprecated"),
  ).toBeVisible();
  await expect(card(page, "a-trust").getByText("Deprecated")).toHaveCount(0);
});

test("filters by type", async ({ page }) => {
  await page.getByRole("button", { name: "Connectors" }).click();

  await expect(page).toHaveURL(/[?&]type=connector/);
  await expect(
    page.getByRole("button", { name: "Connectors" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(card(page, "a-trust")).toBeVisible();
  await expect(card(page, "portal")).toHaveCount(0);
  for (const connector of await cards(page).all()) {
    await expect(
      connector.getByText("Connector", { exact: true }),
    ).toBeVisible();
  }

  await page.getByRole("button", { name: "All" }).click();
  await expect(card(page, "portal")).toBeVisible();
});

test("searches name and description", async ({ page }) => {
  await search(page).fill("a-trust");
  await expect(page).toHaveURL(/[?&]q=a-trust/);
  await expect(cards(page)).toHaveCount(1);
  await expect(card(page, "a-trust")).toBeVisible();

  await search(page).fill("mobile phone signature");
  await expect(card(page, "a-trust")).toBeVisible();

  await search(page).fill("no product matches this");
  await expect(cards(page)).toHaveCount(0);
  await expect(
    page.getByText("Your search did not yield any results."),
  ).toBeVisible();
});

test("sorts A-Z and Z-A", async ({ page }) => {
  const names = () => cards(page).locator("h5").allTextContents();
  const sorted = (list: string[]) =>
    [...list].sort((a, b) => a.localeCompare(b));

  await page.getByRole("combobox").selectOption("az");
  await expect(page).toHaveURL(/[?&]sort=az/);
  const az = await names();
  expect(az).toEqual(sorted(az));

  await page.getByRole("combobox").selectOption("za");
  const za = await names();
  expect(za).toEqual(sorted(za).reverse());
});

test("restores filter, search and sort from the URL", async ({ page }) => {
  await page.goto("/?type=utils&q=utils&sort=za");

  await expect(page.getByRole("button", { name: "Utilities" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(search(page)).toHaveValue("utils");
  await expect(page.getByRole("combobox")).toHaveValue("za");
  await expect(card(page, "db-utils")).toBeVisible();
  await expect(card(page, "a-trust")).toHaveCount(0);
});

test("opens a product", async ({ page }) => {
  await card(page, "a-trust").click();

  await expect(page).toHaveURL("/a-trust");
  await expect(
    page.getByRole("heading", { name: "A-Trust", level: 1 }),
  ).toBeVisible();
});
