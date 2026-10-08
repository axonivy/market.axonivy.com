import { defineConfig, type Plugin } from "i18next-cli";
import { convertToTSX } from "@astrojs/compiler";

const astro = (): Plugin => ({
  name: "astro",
  async onLoad(code, path) {
    if (!path.endsWith(".astro")) return code;
    const { code: tsx } = await convertToTSX(code, { filename: path });
    return tsx;
  },
});

export default defineConfig({
  locales: ["en", "de"],
  extract: {
    input: ["src/**/*.{ts,tsx,astro}"],
    output: "src/translation/{{namespace}}/{{language}}.json",
    defaultNS: "market.axonivy.com",
    primaryLanguage: "en",
    sort: true,
  },
  plugins: [astro()],
});
