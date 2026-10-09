/// <reference types="vitest/config" />
import { getViteConfig } from "astro/config";

export default getViteConfig({
  test: {
    globals: true,
    // tests/e2e holds the Playwright tests.
    include: ["tests/integration/**/*.test.ts"],
    exclude: ["**/node_modules/**"],
    outputFile: "report.xml",
  },
});
