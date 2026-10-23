import { test as unhydrated } from "@playwright/test";
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
  await expect(cards(page).nth(50)).toBeVisible();

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
  await expect(
    cards(page).filter({
      hasNot: page.getByText("Connector", { exact: true }),
    }),
  ).toHaveCount(0);

  await page.getByRole("button", { name: "All" }).click();
  await expect(card(page, "portal")).toBeVisible();
});

test("searches name and description", async ({ page }) => {
  await search(page).fill("a-trust");
  await expect(page).toHaveURL(/[?&]search=a-trust/);
  await expect(cards(page)).toHaveCount(1);
  await expect(card(page, "a-trust")).toBeVisible();

  await search(page).fill("mobile phone signature");
  await expect(page).toHaveURL(
    /[?&]search=mobile(\+|%20)phone(\+|%20)signature/,
  );
  await expect(card(page, "a-trust")).toBeVisible();

  await search(page).fill("no product matches this");
  await expect(cards(page)).toHaveCount(0);
  await expect(
    page.getByText("Your search did not yield any results."),
  ).toBeVisible();
});

test("sorts A-Z and Z-A", async ({ page }) => {
  const names = cards(page).locator("h5");
  await expect(names.nth(50)).toBeVisible();
  const sorted = (list: string[]) =>
    [...list].sort((a, b) => a.localeCompare(b));

  await page.getByRole("combobox").selectOption("az");
  await expect(page).toHaveURL(/[?&]sort=az/);
  await expect(names).toHaveText(sorted(await names.allTextContents()));

  await page.getByRole("combobox").selectOption("za");
  await expect(page).toHaveURL(/[?&]sort=za/);
  await expect(names).toHaveText(
    sorted(await names.allTextContents()).reverse(),
  );
});

test("restores filter, search and sort from the URL", async ({ page }) => {
  await page.goto("/?type=utils&search=utils&sort=za");

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

test.describe("in the New REST Client wizard of the Designer", () => {
  const REST_CLIENT =
    "/?ivy-viewer=designer-market&ivy-version=12.0.0&type=connector&resultsOnly&search=";

  test("shows only the matching connectors", async ({ page }) => {
    await page.goto(`${REST_CLIENT}a-trust`);

    await expect(page.locator("html")).toHaveAttribute("data-rest-client", "");
    await expect(search(page)).toBeHidden();
    await expect(page.getByRole("combobox")).toBeHidden();
    await expect(cards(page)).toHaveCount(1);
    await expect(card(page, "a-trust")).toHaveAttribute("href", "/a-trust");
  });

  test("lists connectors only", async ({ page }) => {
    await page.goto(REST_CLIENT);

    await expect(card(page, "a-trust")).toBeVisible();
    await expect(card(page, "portal")).toHaveCount(0);
  });

  test("is not active outside the Designer", async ({ page }) => {
    await page.goto("/?type=connector&resultsOnly&search=");

    await expect(page.locator("html")).not.toHaveAttribute("data-rest-client");
    await expect(search(page)).toBeVisible();
  });

  test("is not kept when navigating", async ({ page }) => {
    await page.goto(`${REST_CLIENT}a-trust`);
    await page.goto("/");

    await expect(page.locator("html")).toHaveAttribute("data-designer");
    await expect(page.locator("html")).not.toHaveAttribute("data-rest-client");
  });
});

unhydrated.describe("before hydration", () => {
  const visibleCards = (page: Page) => cards(page).filter({ visible: true });

  unhydrated.beforeEach(async ({ page }) => {
    await page.route(/\/_astro\/.*\.js$/, (route) => route.abort());
  });

  unhydrated("shows only the products matching the URL", async ({ page }) => {
    await page.goto("/?type=utils&search=utils");

    await expect(card(page, "db-utils")).toBeVisible();
    await expect(card(page, "a-trust")).toBeHidden();
  });

  unhydrated(
    "shows only connectors in the REST client wizard",
    async ({ page }) => {
      await page.goto(
        "/?ivy-viewer=designer-market&ivy-version=12.0.0&type=utils&resultsOnly&search=a",
      );

      await expect(card(page, "a-trust")).toBeVisible();
      await expect(card(page, "db-utils")).toBeHidden();
    },
  );

  unhydrated("ignores an unknown type", async ({ page }) => {
    await page.goto("/?type=unknown");

    await expect(visibleCards(page)).toHaveCount(await cards(page).count());
  });
});
