import { expect, test, type Page } from "./fixtures.ts";

function infoRow(page: Page, label: string) {
  return page
    .getByRole("row")
    .filter({ has: page.getByRole("cell", { name: label, exact: true }) });
}

function mainArtifact(page: Page) {
  return page.getByRole("tabpanel").locator("section").filter({
    has: page.getByRole("heading", { name: "A Trust Connector", exact: true }),
  });
}

test.describe("a-trust", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/a-trust");
  });

  test("shows the header and breadcrumb", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: "A-Trust", level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByRole("img", { name: "A-Trust" }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Install Now" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Download" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Deprecated" })).toHaveCount(
      0,
    );

    await page.getByRole("link", { name: "Home" }).click();
    await expect(page).toHaveURL("/");
  });

  test("shows the information table", async ({ page }) => {
    await expect(
      infoRow(page, "Implemented by").getByRole("link"),
    ).toHaveAttribute("href", "https://www.axonivy.com");
    await expect(infoRow(page, "Compatibility")).toContainText(
      /\d+\.\d+ - \d+\.\d+\+$/,
    );
    await expect(infoRow(page, "Cost")).toContainText("Free");
    await expect(infoRow(page, "Language")).toContainText("English");
    await expect(infoRow(page, "Type")).toContainText("Connector");
    await expect(infoRow(page, "Version")).toContainText(/\d+\.\d+\.\d+/);
    await expect(infoRow(page, "Tags")).toContainText("E-signature");
    await expect(
      infoRow(page, "Source").getByRole("link", { name: "github.com" }),
    ).toHaveAttribute(
      "href",
      "https://github.com/axonivy-market/a-trust-connector",
    );
    await expect(infoRow(page, "Status").getByRole("img")).toHaveAttribute(
      "src",
      /a-trust-connector\/actions/,
    );
    await expect(
      infoRow(page, "More information").getByRole("link", {
        name: "Contact us",
      }),
    ).toHaveAttribute("href", /market_solutions=a-trust$/);
  });

  test("splits the README into tabs and adds the Maven tab", async ({
    page,
  }) => {
    const tabs = page.getByRole("tab");
    await expect(tabs).toHaveText([
      "Description",
      "Demo",
      "Installation Guide",
      "Maven",
      "Changelog",
    ]);
    await expect(
      page.getByRole("tab", { name: "Description" }),
    ).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("tabpanel")).toContainText(
      "A-Trust ID Austria",
    );

    await page.getByRole("tab", { name: "Demo" }).click();
    await expect(page).toHaveURL("/a-trust#demo");
    await expect(page.getByRole("tab", { name: "Demo" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByRole("tabpanel")).toContainText(
      "Start the A-Trust ID Austria Example process",
    );
  });

  test("opens the tab from the URL hash", async ({ page }) => {
    await page.goto("/a-trust#setup");
    await expect(
      page.getByRole("tab", { name: "Installation Guide" }),
    ).toHaveAttribute("aria-selected", "true");

    await page.goto("/a-trust#unknown");
    await expect(
      page.getByRole("tab", { name: "Description" }),
    ).toHaveAttribute("aria-selected", "true");
  });

  test("shows the Maven dependency of the featured version", async ({
    page,
  }) => {
    const version = (await infoRow(page, "Version")
      .getByRole("cell")
      .last()
      .textContent())!.trim();

    await page.getByRole("tab", { name: "Maven" }).click();

    const code = mainArtifact(page).locator("code").last();
    await expect(code).toContainText("<!-- A-Trust - A Trust Connector -->");
    await expect(code).toContainText(
      "<groupId>com.axonivy.connector.atrust</groupId>",
    );
    await expect(code).toContainText(
      "<artifactId>a-trust-connector</artifactId>",
    );
    await expect(code).toContainText(`<version>${version}</version>`);
    await expect(code).toContainText("<type>iar</type>");
  });

  test("copies a code block", async ({ page, context, browserName }) => {
    test.skip(
      browserName !== "chromium",
      "Clipboard permissions are Chromium only",
    );
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.getByRole("tab", { name: "Maven" }).click();

    await mainArtifact(page).getByRole("button", { name: "copy" }).click();

    await expect(
      mainArtifact(page).getByRole("button", { name: "copied" }),
    ).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toContain(
      "<artifactId>a-trust-connector</artifactId>",
    );
  });

  test("opens README links in a new tab", async ({ page }) => {
    const link = page
      .getByRole("tabpanel")
      .getByRole("link", { name: "A-Trust" })
      .first();
    await expect(link).toHaveAttribute("href", "https://www.a-trust.at");
    await expect(link).toHaveAttribute("target", "_blank");
  });

  test("shows the changelog from the GitHub releases", async ({ page }) => {
    await page.getByRole("tab", { name: "Changelog" }).click();
    await expect(page).toHaveURL(/#changelog$/);

    const panel = page.getByRole("tabpanel");
    await expect(
      panel.getByRole("heading", { level: 3 }).first().getByRole("link"),
    ).toHaveAttribute(
      "href",
      /^https:\/\/github\.com\/axonivy-market\/a-trust-connector\/releases\/tag\//,
    );
    await expect(panel.getByText("Latest", { exact: true })).toHaveCount(1);
  });
});

test("loads README images from the market cache", async ({ page }) => {
  await page.goto("/portal");

  const images = page
    .getByRole("tabpanel")
    .locator("img[src^='/market-cache/']");
  await expect(images.first()).toBeVisible();
  for (const image of await images.all()) {
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth))
      .toBeGreaterThan(0);
  }
});

test("shows deprecated products without Download for dropins", async ({
  page,
}) => {
  await page.goto("/excel-importer");

  await expect(page.getByRole("heading", { name: "Deprecated" })).toBeVisible();
  await expect(page.getByText("This extension is deprecated")).toBeVisible();
  await expect(infoRow(page, "Compatibility")).not.toContainText("+");
  await expect(page.getByRole("button", { name: "Download" })).toHaveCount(0);
});

test.describe("sunset", () => {
  test("links the successor's website", async ({ page }) => {
    await page.goto("/excel-importer");

    await expect(page.getByText("Last supported version: 13.1")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Successor", level: 5 }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "Native Database to Entity-Class import in Axon Ivy 14 and newer",
      ),
    ).toBeVisible();
    const link = page.getByRole("link", { name: "Learn more" });
    await expect(link).toHaveAttribute(
      "href",
      /databases\.html#generator-wizard$/,
    );
    await expect(link).toHaveAttribute("target", "_blank");
  });

  test("links the successor product", async ({ page }) => {
    await page.goto("/ai-assistant");

    await expect(page.getByText("Last supported version: 12.0")).toBeVisible();
    const link = page.getByRole("link", {
      name: "Axon Ivy Smart Workflow",
      exact: true,
    });
    await expect(link).not.toHaveAttribute("target");

    await link.click();
    await expect(page).toHaveURL("/smart-workflow");
    await expect(
      page.getByRole("heading", { name: "Axon Ivy Smart Workflow", level: 1 }),
    ).toBeVisible();
  });

  test("keeps the language for the successor product", async ({ page }) => {
    await page.goto("/de/ai-assistant");

    await expect(
      page.getByText("Letzte unterstützte Version: 12.0"),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Axon Ivy Smart Workflow", exact: true }),
    ).toHaveAttribute("href", "/de/smart-workflow");
  });
});
