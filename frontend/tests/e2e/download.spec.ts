import { expect, test, type Page } from "./fixtures.ts";

const MAVEN = "https://maven.axonivy.com/com/axonivy/connector/atrust";

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

const hasSnapshots = async (page: Page) =>
  (await panel(page).version.locator("option").allTextContents()).some((text) =>
    text.endsWith("-SNAPSHOT"),
  );
const optionTexts = (page: Page) =>
  panel(page).version.locator("option").allTextContents();

test.beforeEach(async ({ page }) => {
  await page.goto("/a-trust");
  await openDownload(page);
});

test("preselects the main artifact and the newest release", async ({
  page,
}) => {
  const { artifact, version, download } = panel(page);

  await expect(artifact).toHaveValue("a-trust-connector");
  const versions = await optionTexts(page);
  expect(versions.length).toBeGreaterThan(1);
  expect(versions.every((text) => /^Version \d+(\.\d+)*$/.test(text))).toBe(
    true,
  );

  const selected = await version.inputValue();
  expect(`Version ${selected}`).toBe(versions[0]);
  await expect(download).toHaveAttribute(
    "href",
    `${MAVEN}/a-trust-connector/${selected}/a-trust-connector-${selected}.iar`,
  );
});

test("updates the link when artifact or version change", async ({ page }) => {
  const { artifact, version, download } = panel(page);
  const older = (await version.locator("option").nth(1).getAttribute("value"))!;

  await version.selectOption(older);
  await expect(download).toHaveAttribute(
    "href",
    `${MAVEN}/a-trust-connector/${older}/a-trust-connector-${older}.iar`,
  );

  await artifact.selectOption("a-trust-connector-demo");
  await expect(version).toHaveValue(older);
  await expect(download).toHaveAttribute(
    "href",
    `${MAVEN}/a-trust-connector-demo/${older}/a-trust-connector-demo-${older}.iar`,
  );
});

test("does not offer the product zip", async ({ page }) => {
  await expect(panel(page).artifact.locator("option")).not.toContainText([
    "A-Trust Product (zip)",
  ]);
  const values = await panel(page)
    .artifact.locator("option")
    .evaluateAll((options: HTMLOptionElement[]) =>
      options.map((option) => option.value),
    );
  expect(values).not.toContain("a-trust-connector-product");
});

test("shows dev versions and remembers the choice", async ({ page }) => {
  const { devVersions } = panel(page);
  await expect(devVersions).not.toBeChecked();

  await devVersions.click();

  await expect(devVersions).toBeChecked();
  await expect.poll(() => hasSnapshots(page)).toBe(true);

  await page.reload();
  await openDownload(page);
  await expect(panel(page).devVersions).toBeChecked();
  await expect.poll(() => hasSnapshots(page)).toBe(true);

  await panel(page).devVersions.click();
  await expect.poll(() => hasSnapshots(page)).toBe(false);
});
