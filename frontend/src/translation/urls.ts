import { getRelativeLocaleUrl } from "astro:i18n";
import { relativePath } from "./language";
import type { Lang } from "./ui";

export function getLanguageUrls(url: URL): Record<Lang, string> {
  const pathWithoutLang = url.pathname.replace(/^\/de(?=\/|$)/, "") || "/";
  const currentPath = url.pathname === "/404/" ? "/" : url.pathname;
  const isNotFoundPage = pathWithoutLang === "/404/";
  const englishPath = isNotFoundPage
    ? "/404.html"
    : getRelativeLocaleUrl("en", pathWithoutLang);
  const germanPath = isNotFoundPage
    ? "/de/404/"
    : getRelativeLocaleUrl("de", pathWithoutLang);

  return {
    en: relativePath(
      currentPath,
      isNotFoundPage ? englishPath : ensureTrailingSlash(englishPath),
    ),
    de: relativePath(currentPath, ensureTrailingSlash(germanPath)),
  };
}

function ensureTrailingSlash(path: string): string {
  return path.endsWith("/") ? path : `${path}/`;
}
