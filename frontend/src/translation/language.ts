import type { Lang } from "./ui";

export const localePath = (lang: Lang, path: string): string => {
  return lang === "en" ? path : `/${lang}${path === "/" ? "" : path}`;
};

export function relativePath(fromPath: string, targetPath: string): string {
  const normalizedFromPath = fromPath === "/404/" ? "/" : fromPath;
  const sourcePath = normalizedFromPath.split(/[?#]/, 1)[0];
  const sourceSegments = sourcePath.split("/").filter(Boolean);
  if (!sourcePath.endsWith("/")) sourceSegments.pop();

  const target = new URL(targetPath, "https://market.invalid");
  const targetSegments = target.pathname.split("/").filter(Boolean);
  let sharedSegments = 0;
  while (
    sharedSegments < sourceSegments.length &&
    sourceSegments[sharedSegments] === targetSegments[sharedSegments]
  ) {
    sharedSegments += 1;
  }

  const relativeSegments = [
    ...Array.from(
      { length: sourceSegments.length - sharedSegments },
      () => "..",
    ),
    ...targetSegments.slice(sharedSegments),
  ];
  const relative = relativeSegments.join("/") || ".";
  const trailingSlash = target.pathname.endsWith("/") ? "/" : "";

  return `${relative}${trailingSlash}${target.search}${target.hash}`;
}

export function localeRelativePath(
  lang: Lang,
  path: string,
  fromPath: string,
): string {
  const targetPath = localePath(lang, path);
  return relativePath(
    fromPath,
    targetPath.endsWith("/") ? targetPath : `${targetPath}/`,
  );
}
