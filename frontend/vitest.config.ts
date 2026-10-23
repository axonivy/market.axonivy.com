/// <reference types="vitest/config" />
import { getViteConfig } from "astro/config";

export default getViteConfig({
  test: {
    globals: true,
    // tests/e2e holds the Playwright tests.
    include: ["tests/integration/**/*.test.{ts,tsx}"],
    exclude: ["**/node_modules/**"],
    reporters: ["default", "junit"],
    outputFile: { junit: "report.xml" },
  },
});
