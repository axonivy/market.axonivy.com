// @ts-check
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, fontProviders } from "astro/config";

import react from "@astrojs/react";

import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://market.axonivy.com",
  vite: { plugins: [tailwindcss()] },
  integrations: [
    react(),
    sitemap({ i18n: { defaultLocale: "en", locales: { en: "en", de: "de" } } }),
  ],

  i18n: {
    locales: ["en", "de"],
    defaultLocale: "en",
    routing: { prefixDefaultLocale: false },
  },

  fonts: [
    {
      provider: fontProviders.local(),
      display: "block",
      name: "Inter Variable",
      cssVariable: "--font-inter",
      options: {
        variants: [
          {
            weight: "100 900",
            style: "normal",
            src: [
              "./node_modules/@fontsource-variable/inter/files/inter-latin-standard-normal.woff2",
            ],
          },
        ],
      },
    },
  ],
});
