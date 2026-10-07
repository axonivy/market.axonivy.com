import en from "./market.axonivy.com/en.json";
import de from "./market.axonivy.com/de.json";
import i18next, { type ParseKeys } from "i18next";
import { initReactI18next } from "react-i18next";

declare module "i18next" {
  interface CustomTypeOptions {
    resources: { translation: typeof en };
  }
}

export type Lang = "en" | "de";

i18next
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, de: { translation: de } },
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    initAsync: false,
  });

export default i18next;
