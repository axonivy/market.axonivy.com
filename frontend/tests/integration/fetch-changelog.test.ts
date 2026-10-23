import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { afterEach, beforeEach, expect, it } from "vitest";
import type { MarketIndex } from "../../scripts/fetch-market";
import { FakeGitHub, FakeMarket, FakeMaven } from "./fake-market";

const PRODUCT_JSON = JSON.stringify({ installers: [] });
const REPO = "axonivy-market/demo-connector";
const SOURCE_URL = `https://github.com/${REPO}`;
const TOKEN = "test-token";
let github: FakeGitHub;

function find(index: MarketIndex, id: string) {
  const product = index.products.find((product) => product.id === id);
  if (!product) throw new Error(`Product ${id} not in products.json`);
  return product;
}

let maven: FakeMaven;
let market: FakeMarket;

beforeEach(async () => {
  maven = new FakeMaven();
  await maven.start();
  market = new FakeMarket();
  await market.create();
  github = new FakeGitHub();
  await github.start();
});

afterEach(async () => {
  await maven.stop();
  await market.remove();
  await github.stop();
});

function release(name: string, extra: Record<string, unknown> = {}) {
  return {
    name,
    tag_name: `v${name}`,
    published_at: "2026-10-01T12:00:00Z",
    html_url: `${SOURCE_URL}/releases/tag/v${name}`,
    body: `Changes in ${name}`,
    draft: false,
    prerelease: false,
    ...extra,
  };
}

async function readChangelog(file: string) {
  return JSON.parse(await readFile(market.resolve(file), "utf-8"));
}

it("requires a token before requesting GitHub", async () => {
  github.releases(REPO, [release("1.0.0")]);
  await market.product("demo", { withMaven: false, sourceUrl: SOURCE_URL });
  await expect(market.fetch(maven, { github })).rejects.toThrow();
  expect(github.requests).toEqual([]);
  expect(market.log).toContain("GITHUB_TOKEN is not set");
});

it("sends the changelog token only to GitHub", async () => {
  github.releases(REPO, [release("1.0.0")]);
  maven.artifact("demo-product", { "1.0.0": { "product.json": PRODUCT_JSON } });
  await market.product("demo", { sourceUrl: SOURCE_URL });
  await market.fetch(maven, { github, token: "test-token" });

  expect(github.headers.map((headers) => headers.authorization)).toEqual([
    "Bearer test-token",
  ]);
  expect(
    maven.headers.every(
      ({ authorization }) => authorization !== `Bearer ${TOKEN}`,
    ),
  ).toBe(true);
});

it("only asks GitHub for products with a GitHub source URL", async () => {
  await market.product("no-source", { withMaven: false });
  await market.product("gitlab", {
    withMaven: false,
    sourceUrl: "https://gitlab.com/axonivy/demo",
  });

  const index = await market.fetch(maven, { github, token: TOKEN });

  expect(find(index, "no-source").changelog).toBeUndefined();
  expect(find(index, "gitlab").changelog).toBeUndefined();
  expect(github.requests).toEqual([]);
});

it("takes the repo from a source URL with .git or a subfolder", async () => {
  github.releases(REPO, [release("1.0.0")]);
  await market.product("git", {
    withMaven: false,
    sourceUrl: `${SOURCE_URL}.git`,
  });
  await market.product("subfolder", {
    withMaven: false,
    sourceUrl: `${SOURCE_URL}/tree/master/demo`,
  });

  const index = await market.fetch(maven, { github, token: TOKEN });
  expect(find(index, "git").changelog).toBeDefined();
  expect(find(index, "subfolder").changelog).toBeDefined();
});

it("reads all pages of releases", async () => {
  const firstPage = Array.from({ length: 100 }, (_, i) =>
    release(`1.0.${100 - i}`),
  );
  github.releases(REPO, firstPage, 1);
  github.releases(REPO, [release("1.0.0")], 2);
  await market.product("demo", { withMaven: false, sourceUrl: SOURCE_URL });

  const product = find(
    await market.fetch(maven, { github, token: TOKEN }),
    "demo",
  );
  const changelog = await readChangelog(product.changelog!);
  expect(changelog).toHaveLength(101);
  expect(changelog.at(-1).name).toBe("1.0.0");
  expect(github.requestCount(github.releasesPath(REPO, 3))).toBe(0);
});

it("writes the releases without drafts and marks the newest non-prerelease as latest", async () => {
  github.releases(REPO, [
    release("3.0.0", { prerelease: true }),
    release("2.1.0", { draft: true }),
    release("2.0.0"),
    release("1.0.0", { name: null, body: null }),
  ]);
  await market.product("demo", { withMaven: false, sourceUrl: SOURCE_URL });
  const product = find(
    await market.fetch(maven, { github, token: TOKEN }),
    "demo",
  );

  expect(product.changelog).toBe(".market/changelogs/demo.json");
  expect(await readChangelog(product.changelog!)).toEqual([
    {
      name: "3.0.0",
      publishedAt: "2026-10-01T12:00:00Z",
      url: `${SOURCE_URL}/releases/tag/v3.0.0`,
      body: "Changes in 3.0.0",
      latest: false,
    },
    {
      name: "2.0.0",
      publishedAt: "2026-10-01T12:00:00Z",
      url: `${SOURCE_URL}/releases/tag/v2.0.0`,
      body: "Changes in 2.0.0",
      latest: true,
    },
    {
      name: "v1.0.0",
      publishedAt: "2026-10-01T12:00:00Z",
      url: `${SOURCE_URL}/releases/tag/v1.0.0`,
      body: "",
      latest: false,
    },
  ]);
});

it("links pull requests and users without changing existing markdown links", async () => {
  github.releases(REPO, [
    release("1.0.0", {
      body: "Fixes #42 by @dev-user and [IVY-7](https://jira.example/IVY-7).",
    }),
  ]);
  await market.product("demo", { withMaven: false, sourceUrl: SOURCE_URL });

  const product = find(
    await market.fetch(maven, { github, token: TOKEN }),
    "demo",
  );
  const [changelogRelease] = await readChangelog(product.changelog!);

  expect(changelogRelease.body).toBe(
    "Fixes [#42](https://github.com/axonivy-market/demo-connector/pull/42) " +
      "by [@dev-user](https://github.com/dev-user) and " +
      "[IVY-7](https://jira.example/IVY-7).",
  );
});

it("removes the changelog of a repo that no longer has releases", async () => {
  github.releases(REPO, [release("1.0.0")]);
  await market.product("demo", { withMaven: false, sourceUrl: SOURCE_URL });
  const first = find(
    await market.fetch(maven, { github, token: TOKEN }),
    "demo",
  );
  expect(existsSync(market.resolve(first.changelog!))).toBe(true);

  github.releases(REPO, []);
  const second = find(
    await market.fetch(maven, { github, token: TOKEN }),
    "demo",
  );
  expect(second.changelog).toBeUndefined();
  expect(existsSync(market.resolve(first.changelog!))).toBe(false);
});

it("has no changelog when the repo has no releases or doesn't exist", async () => {
  github.releases("axonivy-market/empty", []);
  await market.product("empty", {
    withMaven: false,
    sourceUrl: "https://github.com/axonivy-market/empty",
  });
  await market.product("gone", {
    withMaven: false,
    sourceUrl: "https://github.com/axonivy-market/gone",
  });

  const index = await market.fetch(maven, { github, token: TOKEN });
  expect(find(index, "empty").changelog).toBeUndefined();
  expect(find(index, "gone").changelog).toBeUndefined();
  expect(market.log).toContain("GitHub repo not found: axonivy-market/gone");
});

it("fails when GitHub is down", async () => {
  github.respond(github.releasesPath(REPO), 503, 503, 503);
  await market.product("demo", { withMaven: false, sourceUrl: SOURCE_URL });
  await expect(market.fetch(maven, { github, token: TOKEN })).rejects.toThrow();
  expect(github.requestCount(github.releasesPath(REPO))).toBe(3);
});
