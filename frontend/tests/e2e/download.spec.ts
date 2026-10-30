import { expect, test, type Page } from "./fixtures.ts";

const MAVEN = "https://maven.axonivy.com/com/axonivy/connector/atrust";

const iarLink = (artifact: string) =>
  new RegExp(`/${artifact}/(\\d+(?:\\.\\d+)*)/${artifact}-\\1\\.iar$`);

function openDownload(page: Page) {
  return page.getByRole("button", { name: "Download" }).click();
}

function panel(page: Page) {
  const dialog = page.getByRole("dialog");
  return {
    artifact: dialog.getByRole("combobox").first(),
    version: dialog.getByRole("combobox").last(),
    devVersions: dialog.getByRole("checkbox"),
    download: dialog.getByRole("button", { name: "Download" }),
  };
}

const snapshots = (page: Page) =>
  panel(page)
    .version.locator("option")
    .filter({ hasText: /-SNAPSHOT$/ });

test.beforeEach(async ({ page }) => {
  await page.goto("/product/a-trust");
  await openDownload(page);
});

test("preselects the main artifact and the newest release", async ({
  page,
}) => {
  const { artifact, version, download } = panel(page);

  await expect(artifact).toHaveValue("a-trust-connector");
  const options = version.locator("option");
  await expect(options.nth(1)).toBeAttached();
  await expect(
    options.filter({ hasNotText: /^Version \d+(\.\d+)*$/ }),
  ).toHaveCount(0);
  await expect(options.first()).toHaveJSProperty("selected", true);
  const selected = await version.inputValue();
  await expect(download).toHaveAttribute(
    "href",
    `${MAVEN}/a-trust-connector/${selected}/a-trust-connector-${selected}.iar`,
  );
});

test("updates the link when artifact or version change", async ({ page }) => {
  const { artifact, version, download } = panel(page);
  await version.selectOption({ index: 1 });
  const older = await version.inputValue();
  await expect(download).toHaveAttribute(
    "href",
    `${MAVEN}/a-trust-connector/${older}/a-trust-connector-${older}.iar`,
  );

  await artifact.selectOption("a-trust-connector-demo");
  await expect(download).toHaveAttribute(
    "href",
    iarLink("a-trust-connector-demo"),
  );
});

test("does not offer the product zip", async ({ page }) => {
  await expect(panel(page).artifact).toHaveValue("a-trust-connector");
  await expect(
    panel(page).artifact.locator('option[value="a-trust-connector-product"]'),
  ).toHaveCount(0);
});

test("shows dev versions and remembers the choice", async ({ page }) => {
  const { devVersions } = panel(page);
  await expect(devVersions).not.toBeChecked();

  await devVersions.click();

  await expect(devVersions).toBeChecked();
  await expect(snapshots(page).first()).toBeAttached();

  await page.reload();
  await openDownload(page);
  await expect(panel(page).devVersions).toBeChecked();
  await expect(snapshots(page).first()).toBeAttached();

  await panel(page).devVersions.click();
  await expect(snapshots(page)).toHaveCount(0);
  await expect(panel(page).version.locator("option").first()).toHaveText(
    /^Version \d/,
  );
});
