import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Lang } from "@/translation/ui";

export type ReadmeSections = {
  description: string;
  demo?: string;
  setup?: string;
  components?: string;
};

export type Readme = { sections: ReadmeSections; baseUrl: string };

const SECTION_PATTERNS = {
  demo: /^\s*## Demo\s*$/m,
  setup: /^\s*## Setup\s*$/m,
  components: /^\s*## Components\s*$/m,
};

type Section = keyof typeof SECTION_PATTERNS;

function localizedFile(file: string, lang: Lang): string {
  if (lang === "en") return file;
  const translated = path.join(
    path.dirname(file),
    `README_${lang.toUpperCase()}.md`,
  );
  return existsSync(translated) ? translated : file;
}

export async function loadReadme(
  readme: { file: string; baseUrl: string },
  lang: Lang,
): Promise<Readme> {
  const markdown = await readFile(localizedFile(readme.file, lang), "utf8");

  const starts = Object.fromEntries(
    Object.entries(SECTION_PATTERNS).map(([section, pattern]) => [
      section,
      markdown.search(pattern),
    ]),
  ) as Record<Section, number>;
  const found = Object.values(starts).filter((start) => start >= 0);

  const extract = (section: Section): string | undefined => {
    const start = starts[section];
    if (start < 0) return undefined;
    const end = Math.min(
      ...found.filter((other) => other > start),
      markdown.length,
    );
    const content = markdown
      .slice(start, end)
      .replace(SECTION_PATTERNS[section], "")
      .trim();
    return content || undefined;
  };

  const descriptionEnd = Math.min(
    ...[starts.demo, starts.setup].filter((start) => start >= 0),
    markdown.length,
  );

  return {
    sections: {
      description: removeTitle(markdown.slice(0, descriptionEnd)),
      demo: extract("demo"),
      setup: extract("setup"),
      components: extract("components"),
    },
    baseUrl: readme.baseUrl,
  };
}

function removeTitle(text: string): string {
  return text.trimStart().startsWith("#")
    ? text
        .trimStart()
        .replace(/^.*\n?/, "")
        .trim()
    : text.trim();
}
