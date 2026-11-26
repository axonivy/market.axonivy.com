import { test as unhydrated } from "@playwright/test";
import { expect, test, type Page } from "./fixtures.ts";

const DESIGNER = "ivy-viewer=designer-market&ivy-version=12.0.0";

declare global {
  interface Window {
    installed: string[];
  }
}

function fakeDesignerInstall(page: Page) {
  return page.addInitScript(() => {
    window.installed = [];
    window.install = (url) => window.installed.push(url);
  });
}

const installed = (page: Page) => page.evaluate(() => window.installed);

const productJson = (baseURL: string | undefined, version: string) =>
  new RegExp(
    `^${baseURL}/installers/.+/${version.replaceAll(".", "\\.")}/_product\\.json$`,
  );

function designer(page: Page) {
  return {
    version: page.getByRole("combobox", { name: "Version" }),
    devVersions: page.getByRole("checkbox"),
    install: page.getByRole("button", { name: "Install", exact: true }),
  };
}

test.describe("in the browser", () => {
  test("recognizes and keeps the VS Code viewer mode", async ({ page }) => {
    await page.goto("/?ivy-viewer=vscode-market");
    await expect(page.locator("html")).toHaveAttribute("data-vscode", "");

    await page.goto("/product/a-trust");
    await expect(page.locator("html")).toHaveAttribute("data-vscode", "");
  });

  test("asks to open the market in the Designer", async ({ page }) => {
    await page.goto("/product/a-trust");

    await page.getByRole("button", { name: "Download" }).click();

    const popover = page.getByRole("dialog");
    await expect(popover).toContainText(
      "You can also install a product directly in your Designer. To do so, open the Market in your Axon Ivy Designer",
    );
    await expect(
      popover.getByRole("link", { name: "Axon Ivy Designer" }),
    ).toHaveAttribute("href", "https://developer.axonivy.com/download");
    await expect(popover).not.toContainText("deprecated");
    await expect(
      popover.getByRole("button", { name: "Download" }),
    ).toBeVisible();
  });

  test("shows the deprecated notice without a browser install button", async ({
    page,
  }) => {
    await page.goto("/product/excel-importer");

    await expect(
      page.getByRole("heading", { name: "Deprecated" }),
    ).toBeVisible();
    await expect(page.getByText("This extension is deprecated")).toBeVisible();
    await expect(page.getByRole("button", { name: "Install Now" })).toHaveCount(
      0,
    );
  });

  test("disables the button without installer", async ({ page }) => {
    await page.goto("/product/visualvm-plugin");

    await expect(
      page.getByRole("button", { name: "No installer available" }),
    ).toBeDisabled();
  });
});

test.describe("in the Designer", () => {
  test.beforeEach(async ({ page }) => {
    await fakeDesignerInstall(page);
    await page.goto(`/?${DESIGNER}`);
    await page.goto("/product/a-trust");
  });

  test("installs the newest release of the Designer version", async ({
    page,
    baseURL,
  }) => {
    const { version, install } = designer(page);
    await expect(page.getByRole("button", { name: "Install Now" })).toHaveCount(
      0,
    );
    await expect(page.getByRole("button", { name: "Download" })).toHaveCount(0);
    await expect(version).toHaveValue("12.0.2");
    await expect(version.locator("option").first()).toHaveText(/12\.0\.2/);
    await expect(
      version.locator("option").filter({ hasText: /-SNAPSHOT$/ }),
    ).toHaveCount(0);

    await install.click();

    expect(await installed(page)).toEqual([
      expect.stringMatching(productJson(baseURL, "12.0.2")),
    ]);
  });

  test("limits Designer 10 to artifact versions 10 and older", async ({
    page,
  }) => {
    await page.goto(
      "/product/a-trust?ivy-viewer=designer-market&ivy-version=10.0.0",
    );

    const { version } = designer(page);
    const versions = await version
      .locator("option")
      .evaluateAll((options) =>
        options.map((option) =>
          Number.parseInt(
            (option as HTMLOptionElement).value.split(".")[0],
            10,
          ),
        ),
      );

    expect(versions.length).toBeGreaterThan(0);
    expect(versions.every((majorVersion) => majorVersion <= 10)).toBe(true);
    await expect(page.getByRole("status")).toHaveCount(0);
  });

  test("installs the selected version", async ({ page, baseURL }) => {
    const { version, install } = designer(page);
    await version.selectOption({ index: 1 });
    const older = await version.inputValue();

    await install.click();

    expect(await installed(page)).toEqual([
      expect.stringMatching(productJson(baseURL, older)),
    ]);
  });

  test("limits Designer 12 to artifact versions 12 and older", async ({
    page,
  }) => {
    const { version } = designer(page);
    const versions = await version
      .locator("option")
      .evaluateAll((options) =>
        options.map((option) =>
          Number.parseInt(
            (option as HTMLOptionElement).value.split(".")[0],
            10,
          ),
        ),
      );

    expect(versions.length).toBeGreaterThan(0);
    expect(versions.every((majorVersion) => majorVersion <= 12)).toBe(true);
  });

  test("shows a hint and hides controls when no compatible version exists", async ({
    page,
  }) => {
    await page.goto("/product/ivy-load-test");

    await expect(page.getByRole("status")).toHaveText(
      "No version is available for Designer 12 or older.",
    );
    await expect(designer(page).install).toHaveCount(0);
    await expect(designer(page).version).toHaveCount(0);
    await expect(designer(page).devVersions).toBeVisible();
  });

  test("shows dev versions", async ({ page }) => {
    const { version, devVersions } = designer(page);

    await devVersions.click();

    await expect(
      version
        .locator("option")
        .filter({ hasText: /-SNAPSHOT$/ })
        .first(),
    ).toBeAttached();
    await expect(version).toHaveValue("12.0.3-SNAPSHOT");
  });

  test("preserves Designer mode on the German product page", async ({
    page,
  }) => {
    await page.goto(`/de/product/a-trust?${DESIGNER}`);

    await expect(page.locator("html")).toHaveAttribute("lang", "de");
    await expect(page.locator("html")).toHaveAttribute(
      "data-designer",
      "12.0.0",
    );
    await expect(
      page.getByRole("button", { name: "Installieren", exact: true }),
    ).toBeVisible();
  });
});

test("accepts the ivy.version param of newer Designers", async ({ page }) => {
  await page.goto(
    "/product/a-trust?ivy-viewer=designer-market&ivy.version=13.1.0",
  );

  await expect(page.locator("html")).toHaveAttribute("data-designer", "13.1.0");
  await expect(designer(page).install).toBeVisible();
  await expect(designer(page).version).toHaveValue("13.1.2");
});

test("shows all versions for Designer 13", async ({ page }) => {
  await page.goto(
    "/product/a-trust?ivy-viewer=designer-market&ivy-version=13.1.0",
  );

  const versions = await designer(page)
    .version.locator("option")
    .evaluateAll((options) =>
      options.map((option) =>
        Number.parseInt((option as HTMLOptionElement).value.split(".")[0], 10),
      ),
    );

  expect(versions).toContain(13);
});

test.describe("without a version of the Designer release", () => {
  test("selects the newest older version", async ({ page }) => {
    await page.goto(
      "/product/a-trust?ivy-viewer=designer-market&ivy-version=12.5.0",
    );

    await expect(designer(page).version).toHaveValue("12.0.2");
  });

  test("selects the newest version", async ({ page }) => {
    await page.goto(
      "/product/a-trust?ivy-viewer=designer-market&ivy-version=9.0.0",
    );

    const { version } = designer(page);
    await expect(version).toHaveValue("13.2.0");
    await expect(version.locator("option").first()).toHaveJSProperty(
      "selected",
      true,
    );
  });
});

test("ignores other viewers", async ({ page }) => {
  await page.goto("/product/a-trust?ivy-viewer=browser");

  await expect(page.getByRole("button", { name: "Install Now" })).toHaveCount(
    0,
  );
  await expect(page.getByRole("button", { name: "Download" })).toBeVisible();
});

unhydrated.describe("before hydration", () => {
  unhydrated.beforeEach(async ({ page }) => {
    await page.route(/\/_astro\/.*\.js$/, (route) => route.abort());
  });

  unhydrated("shows the browser buttons", async ({ page }) => {
    await page.goto("/product/a-trust");

    await expect(page.getByRole("button", { name: "Install Now" })).toHaveCount(
      0,
    );
    await expect(page.getByRole("button", { name: "Download" })).toBeVisible();
  });

  unhydrated("hides them in the Designer", async ({ page }) => {
    await page.goto(`/product/a-trust?${DESIGNER}`);

    await expect(
      page.locator("button", { hasText: "Download" }).first(),
    ).toBeAttached();
    await expect(page.getByRole("button", { name: "Download" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Install Now" })).toHaveCount(
      0,
    );
  });
});

test.describe("on mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("shows Download without a browser install button", async ({ page }) => {
    await page.goto("/product/a-trust");

    await expect(page.getByRole("button", { name: "Install Now" })).toHaveCount(
      0,
    );
    await expect(page.getByRole("button", { name: "Download" })).toBeVisible();
  });

  test("shows the version selection in the Designer", async ({ page }) => {
    await page.goto(`/product/portal?${DESIGNER}`);

    const { version, install } = designer(page);
    const documentation = page.getByRole("link", {
      name: "Documentation",
      exact: true,
    });

    await expect(version).toBeVisible();
    await expect(install).toBeVisible();
    await expect(documentation).toBeVisible();
    await expect(documentation).toHaveText("");
    expect((await documentation.boundingBox())?.y).toBe(
      (await install.boundingBox())?.y,
    );
    expect((await version.boundingBox())?.y).toBeLessThan(
      (await install.boundingBox())?.y ?? 0,
    );
  });
});
