import type { Lang } from "./ui";

export const localePath = (lang: Lang, path: string): string => {
  return lang === "en" ? path : `/${lang}${path === "/" ? "" : path}`;
};
