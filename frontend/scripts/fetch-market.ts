import { unzipSync } from "fflate";
import { existsSync } from "node:fs";
import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  compareVersions,
  isSnapshot,
  newestFirst,
} from "../src/data/versions.ts";
import type { MarketMeta, MavenArtifact } from "./generated/meta.ts";
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

const GITHUB_API_URL = process.env.GITHUB_API_URL ?? "https://api.github.com";
const MARKET_PACKAGE_REPO_URL =
  process.env.MARKET_PACKAGE_REPO_URL ??
  "https://maven.pkg.github.com/axonivy-market/market";
const META_CATALOG_DIR = path.join(ROOT, ".market", "meta-catalog");
const PRODUCTS_DIR = path.join(META_CATALOG_DIR, "products");
const MAVEN_PRODUCTS_DIR = path.join(ROOT, ".market", "maven-products");
const PUBLIC_MAVEN_PRODUCTS_URL = "/maven-products";

const DEFAULT_REPO_URL =
  process.env.MARKET_MAVEN_URL ?? "https://maven.axonivy.com";
const DEFAULT_TYPE = "iar";
const CONCURRENCY = 16;

const SLIM_FILES = new Set(["product.json"]);

// Types

type MetaArtifact = Omit<MavenArtifact, "type"> & { type?: string };

type Meta = Omit<MarketMeta, "mavenArtifacts"> & {
  mavenArtifacts?: MetaArtifact[];
};

const MARKET_PACKAGE: MetaArtifact = {
  name: "Market bundle",
  groupId: "com.axonivy.market",
  artifactId: "market-test",
  type: "zip",
  repoUrl: MARKET_PACKAGE_REPO_URL,
};

export type ArtifactVersion = { version: string; url: string };

export type IndexArtifact = {
  name: string;
  groupId: string;
  artifactId: string;
  type: string;
  doc: boolean;
  isProduct: boolean;
  // Newest first
  versions: ArtifactVersion[];
};

export type IndexInstallable = {
  version: string;
  // Absolute path of the _product.json, which is passed to the Designer's install(url).
  url: string;
  minimumIvyVersion?: string;
};

export type IndexDependency = {
  groupId: string;
  artifactId: string;
  type: string;
};

export type IndexProduct = {
  id: string;
  metaDir: string;
  versions: string[];
  featuredVersion?: string;
  readme?: { file: string; baseUrl: string };
  dependency?: IndexDependency;
  mavenDropins?: boolean;
  artifacts: IndexArtifact[];
  changelog?: string;
  // Newest first
  installable: IndexInstallable[];
};

export type MarketIndex = { generatedAt: string; products: IndexProduct[] };

type CacheMarker = { zipUrl: string; full: boolean; missing?: boolean };

// Helpers

const stats = { downloaded: 0, cached: 0, missing: 0 };

async function fetchText(url: string, init?: RequestInit) {
  return (await fetchWithRetry(url, 3, init)).text();
}

async function fetchBytes(url: string, init?: RequestInit) {
  return new Uint8Array(
    await (await fetchWithRetry(url, 3, init)).arrayBuffer(),
  );
}

function xmlValues(xml: string, tag: string): string[] {
  return [...xml.matchAll(new RegExp(`<${tag}>([^<]*)</${tag}>`, "g"))].map(
    (match) => match[1].trim(),
  );
}

// Maven

type Coordinates = {
  repoUrl: string;
  groupId: string;
  artifactId: string;
  type: string;
};

function artifactBaseUrl({ repoUrl, groupId, artifactId }: Coordinates) {
  return `${repoUrl.replace(/\/$/, "")}/${groupId.replaceAll(".", "/")}/${artifactId}`;
}

async function fetchVersions(
  coordinates: Coordinates,
  init?: RequestInit,
): Promise<string[]> {
  try {
    const xml = await fetchText(
      `${artifactBaseUrl(coordinates)}/maven-metadata.xml`,
      init,
    );
    return xmlValues(xml, "version");
  } catch (error) {
    if (error instanceof NotFoundError) {
      warn(
        `No maven-metadata.xml for ${coordinates.groupId}:${coordinates.artifactId}`,
      );
      return [];
    }
    if (coordinates.repoUrl !== DEFAULT_REPO_URL) {
      warn(`Unreachable repo ${coordinates.repoUrl}: ${error}`);
      return [];
    }
    throw error;
  }
}

async function resolveUrl(
  coordinates: Coordinates,
  version: string,
  init?: RequestInit,
): Promise<string | undefined> {
  const base = `${artifactBaseUrl(coordinates)}/${version}`;
  const { artifactId, type } = coordinates;
  if (!isSnapshot(version)) {
    return `${base}/${artifactId}-${version}.${type}`;
  }
  try {
    const xml = await fetchText(`${base}/maven-metadata.xml`, init);
    // GitHub Packages lists every build, so take the newest (values are <base>-<yyyyMMdd.HHmmss>-<build>)
    const value = [
      ...xml.matchAll(/<snapshotVersion>([\s\S]*?)<\/snapshotVersion>/g),
    ]
      .map((match) => match[1])
      .filter(
        (block) =>
          xmlValues(block, "extension")[0] === type &&
          xmlValues(block, "classifier").length === 0,
      )
      .map((block) => xmlValues(block, "value")[0])
      .filter(Boolean)
      .sort()
      .at(-1);
    if (!value) {
      warn(`No .${type} in SNAPSHOT ${artifactId}:${version}`);
      return undefined;
    }
    return `${base}/${artifactId}-${value}.${type}`;
  } catch (error) {
    if (error instanceof NotFoundError) {
      warn(`No maven-metadata.xml for SNAPSHOT ${artifactId}:${version}`);
      return undefined;
    }
    throw error;
  }
}

async function resolveArtifactVersions(
  artifact: MetaArtifact,
  init?: RequestInit,
): Promise<ArtifactVersion[]> {
  const repoUrl = artifact.repoUrl ?? DEFAULT_REPO_URL;
  const type = artifact.type ?? DEFAULT_TYPE;
  const current: Coordinates = {
    repoUrl,
    type,
    groupId: artifact.groupId,
    artifactId: artifact.artifactId,
  };

  const candidates = new Map<string, Coordinates>();
  for (const version of await fetchVersions(current, init)) {
    candidates.set(version, current);
  }
  for (const archived of artifact.archivedArtifacts ?? []) {
    const coordinates: Coordinates = {
      repoUrl,
      type,
      groupId: archived.groupId,
      artifactId: archived.artifactId,
    };
    for (const version of await fetchVersions(coordinates, init)) {
      if (
        !candidates.has(version) &&
        compareVersions(version, archived.lastVersion) <= 0
      ) {
        candidates.set(version, coordinates);
      }
    }
  }

  const resolved = await mapLimit(
    [...candidates],
    CONCURRENCY,
    async ([version, coordinates]) => {
      const url = await resolveUrl(coordinates, version, init);
      return url ? { version, url } : undefined;
    },
  );
  return resolved
    .filter((entry): entry is ArtifactVersion => entry !== undefined)
    .sort((a, b) => newestFirst(a.version, b.version));
}

async function githubPackageAuth(): Promise<RequestInit> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error(
      "GITHUB_TOKEN is not set. A classic PAT with read:packages is required to download the market Maven package.",
    );
  }

  const userResponse = await fetchWithRetry(`${GITHUB_API_URL}/user`, 3, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const { login } = (await userResponse.json()) as { login?: string };
  if (!login) {
    throw new Error("Could not determine the GitHub username for GITHUB_TOKEN");
  }
  return {
    headers: {
      Authorization: `Basic ${Buffer.from(`${login}:${token}`).toString("base64")}`,
    },
  };
}

async function fetchMarketBundle(): Promise<Uint8Array> {
  const auth = await githubPackageAuth();
  const [latest] = await resolveArtifactVersions(MARKET_PACKAGE, auth);
  if (!latest) {
    throw new Error("Market Maven SNAPSHOT not found");
  }
  console.log(`Fetching ${latest.url}`);
  return fetchBytes(latest.url, auth);
}

// Product zips

async function extractZip(
  bytes: Uint8Array,
  dir: string,
  filter?: Set<string>,
) {
  const files = unzipSync(bytes, {
    filter: (file) => !filter || filter.has(file.name),
  });
  for (const [name, content] of Object.entries(files)) {
    if (name.endsWith("/")) continue;
    const target = path.resolve(dir, name);
    if (!target.startsWith(dir + path.sep)) {
      warn(`Skipped unsafe zip entry ${name}`);
      continue;
    }
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content);
  }
}

// Ensures the zip of a version is extracted in the cache and returns its folder.
// `full` extracts everything (README, images), otherwise only product.json.
// Returns undefined if the zip doesn't exist on Maven.
async function ensureCached(
  artifactId: string,
  { version, url }: ArtifactVersion,
  full: boolean,
): Promise<string | undefined> {
  const dir = path.join(MAVEN_PRODUCTS_DIR, artifactId, version);
  const markerFile = path.join(dir, ".cache.json");
  const marker = await readJson<CacheMarker>(markerFile);

  if (marker?.zipUrl === url && (marker.full || !full || marker.missing)) {
    stats.cached++;
    return marker.missing ? undefined : dir;
  }

  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  try {
    const bytes = await fetchBytes(url);
    await extractZip(bytes, dir, full ? undefined : SLIM_FILES);
    await writeFile(
      markerFile,
      JSON.stringify({ zipUrl: url, full } satisfies CacheMarker),
    );
    stats.downloaded++;
    return dir;
  } catch (error) {
    if (error instanceof NotFoundError) {
      warn(`Zip not found: ${url}`);
      await writeFile(
        markerFile,
        JSON.stringify({
          zipUrl: url,
          full,
          missing: true,
        } satisfies CacheMarker),
      );
      stats.missing++;
      return undefined;
    }
    throw error;
  }
}

async function writeProductJson(
  cacheDir: string,
  publicDir: string,
  version: string,
  name: string,
) {
  const raw = await readFile(path.join(cacheDir, "product.json"), "utf8");
  const productJson = JSON.parse(raw.replaceAll("${version}", version));
  productJson.name = name;
  await mkdir(publicDir, { recursive: true });
  await writeFile(
    path.join(publicDir, "_product.json"),
    JSON.stringify(productJson, null, 2),
  );
  return productJson as ProductJson;
}

type ProductJson = {
  minimumIvyVersion?: string;
  installers?: {
    id: string;
    data?: {
      projects?: Partial<IndexDependency>[];
      dependencies?: Partial<IndexDependency>[];
      repositories?: { url?: string }[];
    };
  }[];
};

const ARTIFACT_INSTALLERS = new Set([
  "maven-import",
  "maven-dependency",
  "maven-dropins",
]);

function findInstallerArtifacts(productJson: ProductJson): MetaArtifact[] {
  const artifacts: MetaArtifact[] = [];
  for (const { id, data } of productJson.installers ?? []) {
    if (!ARTIFACT_INSTALLERS.has(id)) continue;
    const { projects = [], dependencies = [], repositories } = data ?? {};
    for (const { groupId, artifactId, type } of [
      ...projects,
      ...dependencies,
    ]) {
      if (!groupId || !artifactId) continue;
      artifacts.push({
        name: artifactIdToName(artifactId),
        groupId,
        artifactId,
        type,
        repoUrl: repositories?.[0]?.url,
      });
    }
  }
  return artifacts;
}

function artifactIdToName(artifactId: string): string {
  return artifactId
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

async function resolveInstallerArtifacts(
  meta: Meta,
  productJsons: ProductJson[],
): Promise<IndexArtifact[]> {
  const known = new Set(
    (meta.mavenArtifacts ?? []).flatMap((artifact) =>
      [artifact, ...(artifact.archivedArtifacts ?? [])].map(
        ({ groupId, artifactId }) => `${groupId}:${artifactId}`,
      ),
    ),
  );
  const tried = new Set<string>();
  const artifacts: IndexArtifact[] = [];
  for (const artifact of productJsons.flatMap(findInstallerArtifacts)) {
    const key = `${artifact.groupId}:${artifact.artifactId}`;
    const attempt = `${artifact.repoUrl ?? DEFAULT_REPO_URL} ${key}`;
    if (known.has(key) || tried.has(attempt)) continue;
    tried.add(attempt);
    const versions = await resolveArtifactVersions(artifact);
    if (versions.length === 0) continue;
    known.add(key);
    artifacts.push(toIndexArtifact(artifact, versions));
  }
  return artifacts;
}

function toIndexArtifact(
  artifact: MetaArtifact,
  versions: ArtifactVersion[],
): IndexArtifact {
  return {
    name: artifact.name,
    groupId: artifact.groupId,
    artifactId: artifact.artifactId,
    type: artifact.type ?? DEFAULT_TYPE,
    doc: artifact.doc ?? false,
    isProduct: artifact.artifactId.endsWith("-product"),
    versions,
  };
}

function findMavenDependency(
  productJson: ProductJson,
): IndexDependency | undefined {
  const dependency = productJson.installers?.find(
    (installer) => installer.id === "maven-dependency",
  )?.data?.dependencies?.[0];
  if (!dependency?.groupId || !dependency.artifactId) return undefined;
  return {
    groupId: dependency.groupId,
    artifactId: dependency.artifactId,
    type: dependency.type ?? DEFAULT_TYPE,
  };
}

function isMavenDropinsOnly(productJson: ProductJson): boolean {
  const ids = (productJson.installers ?? []).map((installer) => installer.id);
  return (
    ids.includes("maven-dropins") &&
    !ids.includes("maven-import") &&
    !ids.includes("maven-dependency")
  );
}

// Products

async function processProduct(metaFile: string): Promise<IndexProduct> {
  const meta = (await readJson<Meta>(metaFile))!;
  const metaDir = path.dirname(metaFile);
  console.log(`• ${meta.id}`);

  const artifacts: IndexArtifact[] = [];
  for (const artifact of meta.mavenArtifacts ?? []) {
    artifacts.push(
      toIndexArtifact(artifact, await resolveArtifactVersions(artifact)),
    );
  }

  const product: IndexProduct = {
    id: meta.id,
    metaDir: toPosix(path.relative(ROOT, metaDir)),
    versions: [],
    artifacts,
    installable: [],
  };

  const productArtifact = artifacts.find((artifact) => artifact.isProduct);
  const productJsons: ProductJson[] = [];
  if (productArtifact) {
    product.versions = productArtifact.versions.map(({ version }) => version);
    product.featuredVersion = product.versions[0];

    const results = await mapLimit(
      productArtifact.versions,
      CONCURRENCY,
      async (artifactVersion) => {
        const featured = artifactVersion.version === product.featuredVersion;
        const cacheDir = await ensureCached(
          productArtifact.artifactId,
          artifactVersion,
          featured,
        );
        if (!cacheDir) return undefined;

        const relativeDir = `${meta.id}/${productArtifact.artifactId}/${artifactVersion.version}`;
        const publicDir = path.join(MAVEN_PRODUCTS_DIR, relativeDir);

        if (featured && existsSync(path.join(cacheDir, "README.md"))) {
          await cp(cacheDir, publicDir, {
            recursive: true,
            filter: (source) =>
              !/(README.*\.md|\.cache\.json|[/\\]product\.json)$/.test(source),
          });
          product.readme = {
            file: toPosix(
              path.relative(ROOT, path.join(cacheDir, "README.md")),
            ),
            baseUrl: `${PUBLIC_MAVEN_PRODUCTS_URL}/${relativeDir}/`,
          };
        }

        if (!existsSync(path.join(cacheDir, "product.json"))) return undefined;
        const productJson = await writeProductJson(
          cacheDir,
          publicDir,
          artifactVersion.version,
          meta.name,
        );
        if (featured) {
          product.dependency = findMavenDependency(productJson);
          product.mavenDropins = isMavenDropinsOnly(productJson);
        }
        return {
          productJson,
          installable: {
            version: artifactVersion.version,
            url: `${PUBLIC_MAVEN_PRODUCTS_URL}/${relativeDir}/_product.json`,
            minimumIvyVersion: productJson.minimumIvyVersion,
          } satisfies IndexInstallable,
        };
      },
    );
    for (const result of results) {
      if (!result) continue;
      product.installable.push(result.installable);
      productJsons.push(result.productJson);
    }
  }
  artifacts.push(...(await resolveInstallerArtifacts(meta, productJsons)));

  return product;
}


async function findMetaFiles(): Promise<string[]> {
  const files: string[] = [];
  for (const product of await readdir(PRODUCTS_DIR, { withFileTypes: true })) {
    if (!product.isDirectory()) continue;
    const file = path.join(PRODUCTS_DIR, product.name, "meta.json");
    if (existsSync(file)) {
      files.push(file);
    }
  }
  return files.sort();
}

async function fetchMetaCatalog(): Promise<string[]> {
  const bundle = await fetchMarketBundle();
  await rm(META_CATALOG_DIR, { recursive: true, force: true });
  await mkdir(META_CATALOG_DIR, { recursive: true });
  await extractZip(bundle, META_CATALOG_DIR);
  
  const metaFiles = await findMetaFiles();
  if (metaFiles.length === 0) {
    throw new Error(
      "Market artifact contains no products/<id>/meta.json files",
    );
  }
  console.log(`Processing ${metaFiles.length} products…`);
  return metaFiles;
}

async function fetchMavenProducts(metaFiles: string[]): Promise<IndexProduct[]> {
  // Don't clear MAVEN_PRODUCTS_DIR - preserve cache markers
  // Individual cache entries are managed by ensureCached()
  await mkdir(MAVEN_PRODUCTS_DIR, { recursive: true });
  return await mapLimit(metaFiles, 4, processProduct);
}

async function generateProductIndex(
  products: IndexProduct[],
): Promise<void> {
  const previous = await readJson<MarketIndex>(INDEX_FILE);
  
  // Keep changelogs from the last fetch-changelog run
  for (const product of products) {
    const changelog = previous?.products.find(
      ({ id }) => id === product.id,
    )?.changelog;
    if (changelog && existsSync(path.join(ROOT, changelog))) {
      product.changelog = changelog;
    }
  }

  const index: MarketIndex = {
    generatedAt: new Date().toISOString(),
    products,
  };
  await writeFile(INDEX_FILE, JSON.stringify(index, null, 2));
}

async function main() {
  const start = Date.now();

  const metaFiles = await fetchMetaCatalog();
  const products = await fetchMavenProducts(metaFiles);
  await generateProductIndex(products);

  const seconds = ((Date.now() - start) / 1000).toFixed(1);
  console.log(
    `\nDone in ${seconds}s: ${products.length} products, ` +
      `${stats.downloaded} zips downloaded, ${stats.cached} cached, ${stats.missing} missing, ` +
      `${warnings.length} warnings.`,
  );
  console.log(`Index written to ${path.relative(ROOT, INDEX_FILE)}`);
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
