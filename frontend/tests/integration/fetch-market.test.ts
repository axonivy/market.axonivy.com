import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { MarketIndex } from "../../scripts/fetch-market.ts";
import type { MavenArtifact } from "../../scripts/generated/meta.ts";
import {
  FakeMarket,
  FakeMaven,
  GROUP_ID,
  SNAPSHOT_BUILD,
  snapshotMetadata,
} from "./fake-market.ts";

const PRODUCT_JSON = JSON.stringify({ installers: [] });
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

function productArtifact(
  id: string,
  extra: Partial<MavenArtifact> = {},
): MavenArtifact {
  return {
    name: id,
    groupId: GROUP_ID,
    artifactId: `${id}-product`,
    type: "zip",
    ...extra,
  };
}

function libArtifact(
  artifactId: string,
  extra: Partial<MavenArtifact> = {},
): MavenArtifact {
  return { name: artifactId, groupId: GROUP_ID, artifactId, ...extra };
}

function productJson(installers: unknown[], extra = {}) {
  return JSON.stringify({ ...extra, installers });
}

function installer(id: string, artifactIds: string[]) {
  const key = id === "maven-dependency" ? "dependencies" : "projects";
  return {
    id,
    data: {
      [key]: artifactIds.map((artifactId) => ({
        groupId: GROUP_ID,
        artifactId,
        version: "${version}",
      })),
    },
  };
}

function find(index: MarketIndex, id: string) {
  const product = index.products.find((product) => product.id === id);
  if (!product) throw new Error(`Product ${id} not in product-index.json`);
  return product;
}

function artifactVersions(index: MarketIndex, id: string, artifactId: string) {
  return find(index, id).artifacts.find(
    (artifact) => artifact.artifactId === artifactId,
  )?.versions;
}

let maven: FakeMaven;
let market: FakeMarket;

beforeEach(async () => {
  maven = new FakeMaven();
  await maven.start();
  market = new FakeMarket();
  await market.create();
});

afterEach(async () => {
  await maven.stop();
  await market.remove();
});

async function listFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(dir, path.join(entry.parentPath, entry.name)))
    .sort();
}

it("downloads the latest market Maven SNAPSHOT using the GitHub package token", async () => {
  await market.product("demo");

  const index = await market.fetch(maven);

  expect(find(index, "demo").id).toBe("demo");
  expect(market.marketApiRequests).toEqual(["/user"]);
  expect(
    market.marketApiHeaders.every(
      ({ authorization }) => authorization === "Bearer market-test-token",
    ),
  ).toBe(true);
  const packageAuth = `Basic ${Buffer.from("market-user:market-test-token").toString("base64")}`;
  const packageHeaders = maven.headers.filter((_, index) =>
    maven.requests[index].startsWith("/com/axonivy/market/market-test/"),
  );
  expect(packageHeaders.length).toBeGreaterThan(0);
  expect(
    packageHeaders.every(({ authorization }) => authorization === packageAuth),
  ).toBe(true);
});

describe("README source", () => {
  it("takes the README from the newest version's zip, SNAPSHOT included", async () => {
    maven.artifact("demo-product", {
      "1.0.0": {
        "product.json": PRODUCT_JSON,
        "README.md": "# Demo\nREADME of 1.0.0",
        "img/old.png": PNG,
      },
      "2.0.0-SNAPSHOT": {
        "product.json": PRODUCT_JSON,
        "README.md": "# Demo\nREADME of 2.0.0-SNAPSHOT",
        "README_DE.md": "# Demo\nDeutsches README",
        "img/new.png": PNG,
      },
    });
    await market.product("demo", { files: { "README.md": "README from git" } });

    const [product] = (await market.fetch(maven)).products;

    expect(product.featuredVersion).toBe("2.0.0-SNAPSHOT");
    expect(product.readme?.baseUrl).toBe(
      "/market-cache/demo/demo-product/2.0.0-SNAPSHOT/",
    );
    const readmeFile = market.resolve(product.readme!.file);
    expect(await readFile(readmeFile, "utf8")).toContain(
      "README of 2.0.0-SNAPSHOT",
    );
    expect(
      await readFile(
        path.join(path.dirname(readmeFile), "README_DE.md"),
        "utf8",
      ),
    ).toContain("Deutsches README");
    expect(
      await listFiles(market.publicDir("demo/demo-product/2.0.0-SNAPSHOT")),
    ).toContain("img/new.png");
    expect(
      await listFiles(market.publicDir("demo/demo-product/1.0.0")),
    ).toEqual(["_product.json"]);
  });

  it("does not use a README that is not part of the uploaded artifact", async () => {
    maven.artifact("demo-product", {
      "1.0.0": { "product.json": PRODUCT_JSON },
    });
    await market.product("demo", { files: { "README.md": "Not uploaded" } });

    const [product] = (await market.fetch(maven)).products;

    expect(product.readme).toBeUndefined();
    expect(existsSync(market.publicDir("demo/_local"))).toBe(false);
  });

  it("has no README when the product zip has none", async () => {
    maven.artifact("demo-product", {
      "1.0.0": { "product.json": PRODUCT_JSON },
    });
    await market.product("demo");

    const [product] = (await market.fetch(maven)).products;

    expect(product.readme).toBeUndefined();
  });

  it("publishes only assets, not the READMEs, product.json or cache marker", async () => {
    maven.artifact("demo-product", {
      "1.0.0": {
        "product.json": PRODUCT_JSON,
        "README.md": "# Demo",
        "README_DE.md": "# Demo",
        "img/screen.png": PNG,
        "docs/guide.pdf": "pdf",
      },
    });
    await market.product("demo");

    await market.fetch(maven);

    // _product.json is the install descriptor generated by the script.
    expect(
      await listFiles(market.publicDir("demo/demo-product/1.0.0")),
    ).toEqual(["_product.json", "docs/guide.pdf", "img/screen.png"]);
  });
});

describe("versions and Maven resolution", () => {
  it("resolves a SNAPSHOT to its timestamped zip, ignoring classifiers and other extensions", async () => {
    maven.artifact("demo-product", {
      "1.0.0-SNAPSHOT": { "product.json": PRODUCT_JSON },
    });
    const base = `${maven.path("demo-product")}/1.0.0-SNAPSHOT`;
    maven.set(
      `${base}/maven-metadata.xml`,
      snapshotMetadata(
        { extension: "pom", value: "1.0.0-20261001.120000-7" },
        {
          extension: "zip",
          classifier: "sources",
          value: "1.0.0-20261001.120000-8",
        },
        { extension: "zip", value: `1.0.0-${SNAPSHOT_BUILD}` },
      ),
    );
    await market.product("demo");

    const index = await market.fetch(maven);

    expect(artifactVersions(index, "demo", "demo-product")).toEqual([
      {
        version: "1.0.0-SNAPSHOT",
        url: `${maven.url}${base}/demo-product-1.0.0-${SNAPSHOT_BUILD}.zip`,
      },
    ]);
    expect(find(index, "demo").installable).toHaveLength(1);
  });

  it("resolves a SNAPSHOT to its newest build when every build is listed", async () => {
    maven.artifact("demo-product", {
      "1.0.0-SNAPSHOT": { "product.json": PRODUCT_JSON },
    });
    const base = `${maven.path("demo-product")}/1.0.0-SNAPSHOT`;
    maven.set(
      `${base}/maven-metadata.xml`,
      snapshotMetadata(
        { extension: "zip", value: "1.0.0-20261001.110000-1" },
        { extension: "zip", value: `1.0.0-${SNAPSHOT_BUILD}` },
      ),
    );
    await market.product("demo");

    const index = await market.fetch(maven);

    expect(artifactVersions(index, "demo", "demo-product")).toEqual([
      {
        version: "1.0.0-SNAPSHOT",
        url: `${maven.url}${base}/demo-product-1.0.0-${SNAPSHOT_BUILD}.zip`,
      },
    ]);
  });

  it("skips a SNAPSHOT without a file of the artifact's type", async () => {
    maven.artifact("demo-product", {
      "1.0.0": { "product.json": PRODUCT_JSON },
      "2.0.0-SNAPSHOT": null,
    });
    maven.set(
      `${maven.path("demo-product")}/2.0.0-SNAPSHOT/maven-metadata.xml`,
      snapshotMetadata({ extension: "pom", value: `2.0.0-${SNAPSHOT_BUILD}` }),
    );
    await market.product("demo");

    const index = await market.fetch(maven);

    expect(find(index, "demo").versions).toEqual(["1.0.0"]);
    expect(market.log).toContain(
      "No .zip in SNAPSHOT demo-product:2.0.0-SNAPSHOT",
    );
  });

  it("adds archived artifact versions up to lastVersion, preferring the current artifact", async () => {
    maven.artifact("demo-product", {
      "2.0.0": { "product.json": PRODUCT_JSON },
      "4.0.0": { "product.json": PRODUCT_JSON },
    });
    maven.artifact(
      "old-demo-product",
      {
        "1.0.0": { "product.json": PRODUCT_JSON },
        "2.0.0": { "product.json": PRODUCT_JSON },
        "3.0.0": { "product.json": PRODUCT_JSON },
      },
      { groupId: "com.axonivy.old" },
    );
    await market.product("demo", {
      artifacts: [
        productArtifact("demo", {
          archivedArtifacts: [
            {
              groupId: "com.axonivy.old",
              artifactId: "old-demo-product",
              lastVersion: "2.0.0",
            },
          ],
        }),
      ],
    });

    const index = await market.fetch(maven);

    const current = maven.path("demo-product");
    const archived = maven.path("old-demo-product", "com.axonivy.old");
    expect(artifactVersions(index, "demo", "demo-product")).toEqual([
      {
        version: "4.0.0",
        url: `${maven.url}${current}/4.0.0/demo-product-4.0.0.zip`,
      },
      {
        version: "2.0.0",
        url: `${maven.url}${current}/2.0.0/demo-product-2.0.0.zip`,
      },
      {
        version: "1.0.0",
        url: `${maven.url}${archived}/1.0.0/old-demo-product-1.0.0.zip`,
      },
    ]);
  });

  it("sorts versions newest first and removes duplicates", async () => {
    const versions = [
      "1.0.0",
      "10.0.0-m297",
      "10.0.0",
      "10.0.0-rc1",
      "10.0.0-SNAPSHOT",
      "9.0.0",
      "10.0.1-SNAPSHOT",
    ];
    maven.artifact(
      "demo-product",
      Object.fromEntries(
        versions.map((version) => [version, { "product.json": PRODUCT_JSON }]),
      ),
    );
    const metadata = `${maven.path("demo-product")}/maven-metadata.xml`;
    maven.set(
      metadata,
      `<metadata><versioning><versions>${[...versions, "1.0.0"]
        .map((version) => `<version>${version}</version>`)
        .join("")}</versions></versioning></metadata>`,
    );
    await market.product("demo");

    const product = find(await market.fetch(maven), "demo");

    expect(product.versions).toEqual([
      "10.0.1-SNAPSHOT",
      "10.0.0",
      "10.0.0-SNAPSHOT",
      "10.0.0-rc1",
      "10.0.0-m297",
      "9.0.0",
      "1.0.0",
    ]);
    expect(product.featuredVersion).toBe("10.0.1-SNAPSHOT");
    expect(product.installable.map(({ version }) => version)).toEqual(
      product.versions,
    );
  });

  it("only warns when a third-party repository is down or lacks the artifact", async () => {
    const thirdParty = new FakeMaven();
    await thirdParty.start();
    try {
      maven.artifact("demo-product", {
        "1.0.0": { "product.json": PRODUCT_JSON },
      });
      await market.product("demo", {
        artifacts: [
          productArtifact("demo"),
          libArtifact("down-lib", { repoUrl: "http://127.0.0.1:1" }),
          libArtifact("missing-lib", { repoUrl: thirdParty.url }),
        ],
      });

      const index = await market.fetch(maven);

      expect(find(index, "demo").versions).toEqual(["1.0.0"]);
      expect(artifactVersions(index, "demo", "down-lib")).toEqual([]);
      expect(artifactVersions(index, "demo", "missing-lib")).toEqual([]);
      expect(market.log).toContain("Unreachable repo http://127.0.0.1:1");
      expect(market.log).toContain(
        `No maven-metadata.xml for ${GROUP_ID}:missing-lib`,
      );
    } finally {
      await thirdParty.stop();
    }
  });

  it("fails when the main Maven repository is down", async () => {
    const metadata = `${maven.path("demo-product")}/maven-metadata.xml`;
    maven.artifact("demo-product", {
      "1.0.0": { "product.json": PRODUCT_JSON },
    });
    maven.respond(metadata, 503, 503, 503);
    await market.product("demo");

    await expect(market.fetch(maven)).rejects.toThrow();
    expect(market.log).toContain(`503 ${maven.url}${metadata}`);
    expect(maven.requestCount(metadata)).toBe(3);
  });

  it("retries a failed request, but not a 404", async () => {
    const metadata = `${maven.path("demo-product")}/maven-metadata.xml`;
    maven.artifact("demo-product", {
      "1.0.0": { "product.json": PRODUCT_JSON },
    });
    maven.respond(metadata, 500);
    await market.product("demo", {
      artifacts: [productArtifact("demo"), libArtifact("missing-lib")],
    });

    const index = await market.fetch(maven);

    expect(find(index, "demo").versions).toEqual(["1.0.0"]);
    expect(maven.requestCount(metadata)).toBe(2);
    expect(
      maven.requestCount(`${maven.path("missing-lib")}/maven-metadata.xml`),
    ).toBe(1);
  });
});

describe("product.json and installers", () => {
  it("publishes a _product.json per version with the version and product name filled in", async () => {
    const json = productJson(
      [
        {
          id: "maven-import",
          data: {
            projects: [
              {
                groupId: GROUP_ID,
                artifactId: "demo-demo",
                version: "${version}",
              },
            ],
          },
        },
      ],
      { name: "Name from zip", minimumIvyVersion: "12.0.0" },
    );
    maven.artifact("demo-product", {
      "0.9.0": null,
      "1.0.0": { "product.json": json },
      "2.0.0-SNAPSHOT": { "product.json": json },
    });
    maven.artifact("demo-demo", { "1.0.0": {} }, { type: "iar" });
    await market.product("demo");

    const product = find(await market.fetch(maven), "demo");

    // 0.9.0 has no zip on Maven, so it can't be installed.
    expect(product.installable).toEqual([
      {
        version: "2.0.0-SNAPSHOT",
        url: "/market-cache/demo/demo-product/2.0.0-SNAPSHOT/_product.json",
        minimumIvyVersion: "12.0.0",
      },
      {
        version: "1.0.0",
        url: "/market-cache/demo/demo-product/1.0.0/_product.json",
        minimumIvyVersion: "12.0.0",
      },
    ]);
    for (const { version } of product.installable) {
      const published = JSON.parse(
        await readFile(
          market.publicDir(`demo/demo-product/${version}/_product.json`),
          "utf8",
        ),
      );
      expect(published.name).toBe("demo");
      expect(published.installers[0].data.projects[0].version).toBe(version);
    }
  });

  it("adds artifacts from installers once, skipping known ones and ones not on Maven", async () => {
    maven.artifact("demo-product", {
      "1.0.0": {
        "product.json": productJson([
          installer("maven-import", ["demo-demo", "demo-lib"]),
          installer("maven-dependency", ["demo-connector", "not-on-maven"]),
        ]),
      },
      "2.0.0": {
        "product.json": productJson([
          installer("maven-import", ["demo-demo", "not-on-maven"]),
          installer("maven-dropins", ["demo-dropin"]),
        ]),
      },
    });
    maven.artifact("demo-lib", { "1.0.0": {} }, { type: "iar" });
    maven.artifact("demo-demo", { "1.0.0": {} }, { type: "iar" });
    maven.artifact("demo-connector", { "1.0.0": {} }, { type: "iar" });
    maven.artifact("demo-dropin", { "1.0.0": {} }, { type: "jar" });
    await market.product("demo", {
      artifacts: [productArtifact("demo"), libArtifact("demo-lib")],
    });

    const { artifacts } = find(await market.fetch(maven), "demo");

    expect(
      artifacts.map(({ artifactId, name }) => `${artifactId}: ${name}`).sort(),
    ).toEqual([
      "demo-connector: Demo Connector",
      "demo-demo: Demo Demo",
      "demo-dropin: Demo Dropin",
      "demo-lib: demo-lib",
      "demo-product: demo",
    ]);
    for (const artifactId of ["demo-lib", "demo-demo", "not-on-maven"]) {
      expect(
        maven.requestCount(`${maven.path(artifactId)}/maven-metadata.xml`),
      ).toBe(1);
    }
  });

  it("takes the Maven dependency from the newest version", async () => {
    maven.artifact("demo-product", {
      "1.0.0": {
        "product.json": productJson([
          installer("maven-dependency", ["demo-old"]),
        ]),
      },
      "2.0.0": {
        "product.json": productJson([
          installer("maven-dependency", ["demo-new"]),
        ]),
      },
    });
    await market.product("demo");

    const product = find(await market.fetch(maven), "demo");

    expect(product.dependency).toEqual({
      groupId: GROUP_ID,
      artifactId: "demo-new",
      type: "iar",
    });
    expect(product.mavenDropins).toBe(false);
  });

  it("marks products as maven-dropins only if that is their only artifact installer", async () => {
    maven.artifact("dropins-product", {
      "1.0.0": {
        "product.json": productJson([installer("maven-dropins", ["x"])]),
      },
    });
    maven.artifact("mixed-product", {
      "1.0.0": {
        "product.json": productJson([
          installer("maven-dropins", ["x"]),
          installer("maven-import", ["y"]),
        ]),
      },
    });
    await market.product("dropins");
    await market.product("mixed");

    const index = await market.fetch(maven);

    expect(find(index, "dropins").mavenDropins).toBe(true);
    expect(find(index, "mixed").mavenDropins).toBe(false);
  });
});

describe("robustness and cache", () => {
  it("never writes zip entries outside the cache folder", async () => {
    maven.artifact("demo-product", {
      "1.0.0": {
        "product.json": PRODUCT_JSON,
        "README.md": "# Demo",
        "../../evil.txt": "evil",
        "../../../../evil.txt": "evil",
      },
    });
    await market.product("demo");

    await market.fetch(maven);

    expect(existsSync(market.cacheDir("evil.txt"))).toBe(false);
    expect(existsSync(market.resolve("evil.txt"))).toBe(false);
    expect(market.log).toContain("Skipped unsafe zip entry ../../evil.txt");
  });

  it("remembers missing zips and doesn't request them again", async () => {
    maven.artifact("demo-product", {
      "1.0.0": null,
      "2.0.0": { "product.json": PRODUCT_JSON },
    });
    await market.product("demo");
    const zipPath = `${maven.path("demo-product")}/1.0.0/demo-product-1.0.0.zip`;

    await market.fetch(maven);
    expect(market.log).toContain(`Zip not found: ${maven.url}${zipPath}`);
    expect(market.log).toContain("1 missing");
    await market.fetch(maven);

    expect(maven.requestCount(zipPath)).toBe(1);
  });

  it("doesn't request a missing zip again when its version becomes the newest", async () => {
    maven.artifact("demo-product", {
      "1.0.0": null,
      "2.0.0-SNAPSHOT": { "product.json": PRODUCT_JSON },
    });
    await market.product("demo");
    const zipPath = `${maven.path("demo-product")}/1.0.0/demo-product-1.0.0.zip`;
    await market.fetch(maven);

    maven.artifact("demo-product", { "1.0.0": null });
    const product = find(await market.fetch(maven), "demo");

    expect(product.featuredVersion).toBe("1.0.0");
    expect(product.installable).toEqual([]);
    expect(maven.requestCount(zipPath)).toBe(1);
  });

  it("downloads nothing on a second run", async () => {
    maven.artifact("demo-product", {
      "1.0.0": { "product.json": PRODUCT_JSON },
      "2.0.0": { "product.json": PRODUCT_JSON, "README.md": "# Demo" },
    });
    await market.product("demo");

    await market.fetch(maven);
    expect(market.log).toContain("2 zips downloaded, 0 cached");
    const product = find(await market.fetch(maven), "demo");

    expect(market.log).toContain("0 zips downloaded, 2 cached");
    expect(product.readme).toBeDefined();
    expect(
      await listFiles(market.publicDir("demo/demo-product/2.0.0")),
    ).toEqual(["_product.json"]);
  });

  it("extracts the full zip when an older, slim-cached version becomes the newest", async () => {
    maven.artifact("demo-product", {
      "1.0.0": {
        "product.json": PRODUCT_JSON,
        "README.md": "# Demo\nREADME of 1.0.0",
      },
      "2.0.0-SNAPSHOT": {
        "product.json": PRODUCT_JSON,
        "README.md": "# Demo\nREADME of 2.0.0-SNAPSHOT",
      },
    });
    await market.product("demo");
    await market.fetch(maven);
    expect(await listFiles(market.cacheDir("demo-product/1.0.0"))).toEqual([
      ".cache.json",
      "product.json",
    ]);

    maven.artifact("demo-product", {
      "1.0.0": {
        "product.json": PRODUCT_JSON,
        "README.md": "# Demo\nREADME of 1.0.0",
      },
    });
    const product = find(await market.fetch(maven), "demo");

    expect(product.featuredVersion).toBe("1.0.0");
    expect(
      await readFile(market.resolve(product.readme!.file), "utf8"),
    ).toContain("README of 1.0.0");
  });

  it("downloads a SNAPSHOT again when a new build is published", async () => {
    maven.artifact("demo-product", {
      "1.0.0-SNAPSHOT": {
        "product.json": PRODUCT_JSON,
        "README.md": "# Demo\nFirst build",
      },
    });
    await market.product("demo");
    await market.fetch(maven);

    maven.artifact(
      "demo-product",
      {
        "1.0.0-SNAPSHOT": {
          "product.json": PRODUCT_JSON,
          "README.md": "# Demo\nSecond build",
        },
      },
      { build: "20261002.080000-2" },
    );
    const product = find(await market.fetch(maven), "demo");

    expect(market.log).toContain("1 zips downloaded");
    expect(
      await readFile(market.resolve(product.readme!.file), "utf8"),
    ).toContain("Second build");
  });
});
