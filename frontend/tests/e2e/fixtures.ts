import { test as base, type Page } from "@playwright/test";

export { expect, type Page } from "@playwright/test";

export function hydrated(page: Page) {
  return page.waitForFunction(() =>
    [...document.querySelectorAll("astro-island")].every((island) => {
      const root = island.firstElementChild;
      return (
        !island.hasAttribute("ssr") &&
        (!root ||
          Object.keys(root).some((key) => key.startsWith("__reactFiber$")))
      );
    }),
  );
}

// `page.goto` and `page.reload` wait until all islands are hydrated.
export const test = base.extend({
  page: async ({ page }, use) => {
    const goto = page.goto.bind(page);
    const reload = page.reload.bind(page);
    page.goto = async (...args) => {
      const response = await goto(...args);
      await hydrated(page);
      return response;
    };
    page.reload = async (...args) => {
      const response = await reload(...args);
      await hydrated(page);
      return response;
    };
    await use(page);
  },
});
