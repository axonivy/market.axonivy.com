import { common } from "./common";
import { dashboard } from "./dashboard";
import { productDetails } from "./product-details";
import { notFound } from "./404";

const parts = [common, dashboard, productDetails, notFound];

export const ui = {
  en: Object.assign({}, ...parts.map((part) => part.en)) as typeof common.en &
    typeof dashboard.en &
    typeof productDetails.en &
    typeof notFound.en,
  de: Object.assign({}, ...parts.map((part) => part.de)) as typeof common.de &
    typeof dashboard.de &
    typeof productDetails.de &
    typeof notFound.de,
} as const;

export type Lang = keyof typeof ui;
export type TranslationKey = keyof (typeof ui)["en"];

export function useTranslations(lang: Lang) {
  return (key: TranslationKey) => ui[lang][key] ?? ui.en[key];
}
