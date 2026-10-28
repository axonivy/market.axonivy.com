import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { MarketIndex } from "./fetch-market.ts";
import {
  fetchWithRetry,
  INDEX_FILE,
  mapLimit,
  NotFoundError,
  readJson,
  ROOT,
  toPosix,
  warn,
  warnings,
} from "./shared.ts";

const CHANGELOG_DIR = path.join(ROOT, ".market", "changelogs");
const GITHUB_API_URL = process.env.GITHUB_API_URL ?? "https://api.github.com";

export type ChangelogRelease = {
  name: string;
  publishedAt: string;
  url: string;
  body: string;
  latest: boolean;
};

type GitHubRelease = {
  name: string | null;
  tag_name: string;
  published_at: string | null;
  html_url: string;
  body: string | null;
  draft: boolean;
  prerelease: boolean;
};

const GITHUB_HEADERS: HeadersInit = {
  Accept: "application/vnd.github+json",
  ...(process.env.GITHUB_TOKEN && {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
  }),
};

function githubRepo(sourceUrl: string): string | undefined {
  return sourceUrl
    .match(/^https:\/\/github\.com\/([^/]+\/[^/#?]+)/)?.[1]
    ?.replace(/\.git$/, "");
}

// GitHub only renders #123 and @user as links itself, plain markdown doesn't.
function linkifyReferences(body: string, repo: string): string {
  return body
    .replace(
      /(?<![\w/[&])#(\d+)\b/g,
      (_, number) => `[#${number}](https://github.com/${repo}/pull/${number})`,
    )
    .replace(
      /(?<![\w/[@])@([A-Za-z0-9][A-Za-z0-9-]*)/g,
      (_, user) => `[@${user}](https://github.com/${user})`,
    );
}

async function fetchReleases(sourceUrl: string): Promise<ChangelogRelease[]> {
  const repo = githubRepo(sourceUrl);
  if (!repo) return [];
  const releases: GitHubRelease[] = [];
  try {
    for (let page = 1; ; page++) {
      const response = await fetchWithRetry(
        `${GITHUB_API_URL}/repos/${repo}/releases?per_page=100&page=${page}`,
        3,
        { headers: GITHUB_HEADERS },
      );
      const batch = (await response.json()) as GitHubRelease[];
      releases.push(...batch);
      if (batch.length < 100) break;
    }
  } catch (error) {
    if (error instanceof NotFoundError) {
      warn(`GitHub repo not found: ${repo}`);
      return [];
    }
    throw error;
  }
  const published = releases
    .filter((release) => !release.draft)
    .sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? ""));
  const latest = published.find((release) => !release.prerelease);
  return published.map((release) => ({
    name: release.name || release.tag_name,
    publishedAt: release.published_at ?? "",
    url: release.html_url,
    body: linkifyReferences(release.body ?? "", repo),
    latest: release === latest,
  }));
}

async function main() {
  if (!process.env.GITHUB_TOKEN) {
    throw new Error(
      "GITHUB_TOKEN is not set. Set it (e.g. in .env.local) to fetch changelogs.",
    );
  }
  const index = await readJson<MarketIndex>(INDEX_FILE);
  if (!index) {
    throw new Error("products.json not found. Run `pnpm fetch-data` first.");
  }

  await rm(CHANGELOG_DIR, { recursive: true, force: true });
  await mkdir(CHANGELOG_DIR, { recursive: true });

  console.log(`Fetching changelogs for ${index.products.length} products…`);
  await mapLimit(index.products, 4, async (product) => {
    delete product.changelog;
    const meta = await readJson<{ sourceUrl?: string }>(
      path.join(ROOT, product.metaDir, "meta.json"),
    );
    if (!meta?.sourceUrl) return;
    const releases = await fetchReleases(meta.sourceUrl);
    if (releases.length === 0) return;
    const file = path.join(CHANGELOG_DIR, `${product.id}.json`);
    await writeFile(file, JSON.stringify(releases, null, 2));
    product.changelog = toPosix(path.relative(ROOT, file));
  });

  await writeFile(INDEX_FILE, JSON.stringify(index, null, 2));
  console.log(`Done: ${warnings.length} warnings.`);
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
