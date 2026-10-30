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
    `^${baseURL}/maven-products/.+/${version.replaceAll(".", "\\.")}/_product\\.json$`,
  );

function designer(page: Page) {
  return {
    version: page.getByRole("combobox", { name: "Version" }),
    devVersions: page.getByRole("checkbox"),
    install: page.getByRole("button", { name: "Install", exact: true }),
  };
}

test.describe("in the browser", () => {
  test("asks to open the market in the Designer", async ({ page }) => {
    await page.goto("/product/a-trust");

    await page.getByRole("button", { name: "Install Now" }).click();

    const popover = page.getByRole("dialog");
    await expect(popover).toContainText(
      "Please open the Axon Ivy Market inside your Axon Ivy Designer",
    );
    await expect(
      popover.getByRole("link", { name: "Axon Ivy Designer" }),
    ).toHaveAttribute("href", "https://developer.axonivy.com/download");
    await expect(popover).not.toContainText("deprecated");
    await expect(page.getByRole("button", { name: "Download" })).toBeVisible();
  });

  test("warns about deprecated products", async ({ page }) => {
    await page.goto("/product/excel-importer");

    const install = page.getByRole("button", { name: "Install Now" });
    await expect(install).toHaveCSS("background-color", "rgb(255, 115, 0)");
    await install.click();
    await expect(page.getByRole("dialog")).toContainText(
      "Installing deprecated extensions is not recommended.",
    );
  });

  test("shows Contact us for custom solutions", async ({ page }) => {
    await page.goto("/product/employee-onboarding");

    const contact = page.getByRole("link", { name: "Contact us" }).first();
    await expect(contact).toHaveAttribute(
      "href",
      "https://www.axonivy.com/marketplace/contact/?market_solutions=employee-onboarding",
    );
    await expect(contact).toHaveAttribute("target", "_blank");
    await expect(page.getByRole("button", { name: /Install/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Download" })).toHaveCount(0);
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
    await expect(version.locator("option").first()).not.toHaveText(/12\.0\.2/);
    await expect(
      version.locator("option").filter({ hasText: /-SNAPSHOT$/ }),
    ).toHaveCount(0);

    await install.click();

    expect(await installed(page)).toEqual([
      expect.stringMatching(productJson(baseURL, "12.0.2")),
    ]);
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

  test("stays in Designer mode after switching language", async ({ page }) => {
    await page.getByRole("button", { name: "DE", exact: true }).click();

    await expect(page).toHaveURL(/\/de\/product\/a-trust\/?(#.*)?$/);
    await expect(
      page.getByRole("button", { name: "Installieren", exact: true }),
    ).toBeVisible();
  });

  test("still offers Contact us", async ({ page }) => {
    await page.goto("/product/employee-onboarding");

    await expect(
      page.getByRole("link", { name: "Contact us" }).first(),
    ).toBeVisible();
    await expect(designer(page).install).toHaveCount(0);
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

  await expect(page.getByRole("button", { name: "Install Now" })).toBeVisible();
});

unhydrated.describe("before hydration", () => {
  unhydrated.beforeEach(async ({ page }) => {
    await page.route(/\/_astro\/.*\.js$/, (route) => route.abort());
  });

  unhydrated("shows the browser buttons", async ({ page }) => {
    await page.goto("/product/a-trust");

    await expect(
      page.getByRole("button", { name: "Install Now" }),
    ).toBeVisible();
  });

  unhydrated("hides them in the Designer", async ({ page }) => {
    await page.goto(`/product/a-trust?${DESIGNER}`);

    for (const name of ["Install Now", "Download"]) {
      await expect(
        page.locator("button", { hasText: name }).first(),
      ).toBeAttached();
      await expect(page.getByRole("button", { name })).toHaveCount(0);
    }
  });
});

test.describe("on mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("shows Install Now and Download", async ({ page }) => {
    await page.goto("/product/a-trust");

    await expect(
      page.getByRole("button", { name: "Install Now" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Download" })).toBeVisible();
  });

  test("shows the version selection in the Designer", async ({ page }) => {
    await page.goto(`/product/a-trust?${DESIGNER}`);

    await expect(designer(page).version).toBeVisible();
    await expect(designer(page).install).toBeVisible();
  });
});
