import { strToU8, zipSync } from "fflate";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer, type IncomingHttpHeaders, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import type { MarketIndex } from "../../scripts/fetch-market.ts";
import type { MavenArtifact } from "../../scripts/generated/meta.ts";

const SCRIPT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../scripts/fetch-market.ts",
);
const CHANGELOG_SCRIPT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../scripts/fetch-changelog.ts",
);

type Files = Record<string, string | Uint8Array>;

export const GROUP_ID = "com.axonivy.test";
export const SNAPSHOT_BUILD = "20261001.120000-1";

export function zip(files: Files): Uint8Array {
  return zipSync(
    Object.fromEntries(
      Object.entries(files).map(([name, content]) => [
        name,
        typeof content === "string" ? strToU8(content) : content,
      ]),
    ),
  );
}

export function snapshotMetadata(
  ...entries: { extension: string; value: string; classifier?: string }[]
): string {
  const blocks = entries
    .map(
      ({ extension, value, classifier }) =>
        `<snapshotVersion>${classifier ? `<classifier>${classifier}</classifier>` : ""}<extension>${extension}</extension><value>${value}</value></snapshotVersion>`,
    )
    .join("");
  return `<metadata><versioning><snapshotVersions>${blocks}</snapshotVersions></versioning></metadata>`;
}

type ArtifactOptions = {
  groupId?: string;
  type?: string;
  // Timestamp and build number of SNAPSHOT files.
  build?: string;
};

// A static Maven repository served from memory. Unknown paths return 404.
export class FakeMaven {
  private files = new Map<string, string | Uint8Array>();
  private statuses = new Map<string, number[]>();
  private server?: Server;
  url = "";
  // Every requested path, in order.
  requests: string[] = [];
  headers: IncomingHttpHeaders[] = [];

  async start() {
    this.server = createServer((request, response) => {
      const url = request.url ?? "";
      this.requests.push(url);
      this.headers.push(request.headers);
      const status = this.statuses.get(url)?.shift();
      const file = this.files.get(url);
      if (status !== undefined) {
        response.statusCode = status;
        response.end();
      } else {
        response.statusCode = file === undefined ? 404 : 200;
        response.end(file);
      }
    });
    await new Promise<void>((resolve) =>
      this.server!.listen(0, "127.0.0.1", resolve),
    );
    this.url = `http://127.0.0.1:${(this.server.address() as AddressInfo).port}`;
  }

  async stop() {
    await new Promise((resolve) => this.server?.close(resolve));
  }

  path(artifactId: string, groupId = GROUP_ID) {
    return `/${groupId.replaceAll(".", "/")}/${artifactId}`;
  }

  set(path: string, content: string | Uint8Array) {
    this.files.set(path, content);
  }

  // Answers the next requests to `path` with these statuses, then serves it normally.
  respond(path: string, ...statuses: number[]) {
    this.statuses.set(path, statuses);
  }

  requestCount(path: string) {
    return this.requests.filter((request) => request === path).length;
  }

  // Publishes an artifact. SNAPSHOTs get a timestamped file name like on a real repo.
  // A version mapped to null is listed in maven-metadata.xml but has no file.
  artifact(
    artifactId: string,
    versions: Record<string, Files | null>,
    {
      groupId = GROUP_ID,
      type = "zip",
      build = SNAPSHOT_BUILD,
    }: ArtifactOptions = {},
  ) {
    const base = this.path(artifactId, groupId);
    const xmlVersions = Object.keys(versions)
      .map((version) => `<version>${version}</version>`)
      .join("");
    this.set(
      `${base}/maven-metadata.xml`,
      `<metadata><versioning><versions>${xmlVersions}</versions></versioning></metadata>`,
    );
    for (const [version, files] of Object.entries(versions)) {
      let fileVersion = version;
      if (version.endsWith("-SNAPSHOT")) {
        fileVersion = version.replace("SNAPSHOT", build);
        this.set(
          `${base}/${version}/maven-metadata.xml`,
          snapshotMetadata({ extension: type, value: fileVersion }),
        );
      }
      if (files) {
        this.set(
          `${base}/${version}/${artifactId}-${fileVersion}.${type}`,
          zip(files),
        );
      }
    }
  }
}

export class FakeGitHub extends FakeMaven {
  releasesPath(repo: string, page = 1) {
    return `/repos/${repo}/releases?per_page=100&page=${page}`;
  }

  releases(repo: string, releases: unknown[], page = 1) {
    this.set(this.releasesPath(repo, page), JSON.stringify(releases));
  }
}

type MetaArtifact = Partial<MavenArtifact>;

const LOGO_PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

export class FakeMarket {
  root = "";
  // stdout and stderr of the last fetch.
  log = "";
  marketApiRequests: string[] = [];
  marketApiHeaders: IncomingHttpHeaders[] = [];
  private products = new Map<string, Files>();

  async create() {
    this.root = await mkdtemp(path.join(tmpdir(), "fetch-market-"));
  }

  async remove() {
    await rm(this.root, { recursive: true, force: true });
  }

  // Adds product files to the artifact served by the fake Actions API.
  async product(
    id: string,
    {
      withMaven = true,
      artifacts = undefined as MetaArtifact[] | undefined,
      files = {} as Files,
      sourceUrl = undefined as string | undefined,
    } = {},
  ) {
    const meta = {
      id,
      name: id,
      type: "connector",
      ...(sourceUrl && { sourceUrl }),
      mavenArtifacts:
        artifacts ??
        (withMaven
          ? [
              {
                name: id,
                groupId: GROUP_ID,
                artifactId: `${id}-product`,
                type: "zip",
              },
            ]
          : []),
    };
    this.products.set(id, {
      "logo.png": LOGO_PNG,
      ...files,
      "meta.json": JSON.stringify(meta),
    });
  }

  // Runs the real script (as a separate process, like `pnpm fetch-data`).
  // Rejects if the script exits with an error.
  async fetch(
    maven: FakeMaven,
    { github, token }: { github?: FakeGitHub; token?: string } = {},
  ): Promise<MarketIndex> {
    this.log = "";
    const marketApi = new FakeGitHub();
    await marketApi.start();
    try {
      const artifactFiles = Object.fromEntries(
        [...this.products].flatMap(([id, files]) =>
          Object.entries(files)
            .filter(
              ([name]) =>
                !name.includes("/") &&
                (name.endsWith(".json") || /^logo.*\.png$/.test(name)),
            )
            .map(([name, content]) => [`products/${id}/${name}`, content]),
        ),
      );
      maven.artifact(
        "market-test",
        { "0.0.1-SNAPSHOT": artifactFiles },
        { groupId: "com.axonivy.market", type: "zip" },
      );
      marketApi.set("/user", JSON.stringify({ login: "market-user" }));
      await this.runScript(SCRIPT, {
        MARKET_MAVEN_URL: maven.url,
        MARKET_PACKAGE_REPO_URL: maven.url,
        GITHUB_API_URL: marketApi.url,
        GITHUB_TOKEN: "market-test-token",
      });
    } finally {
      this.marketApiRequests = [...marketApi.requests];
      this.marketApiHeaders = [...marketApi.headers];
      await marketApi.stop();
    }
    if (github) {
      await this.runScript(CHANGELOG_SCRIPT, {
        GITHUB_API_URL: github.url,
        GITHUB_TOKEN: token ?? "",
      });
    }
    return JSON.parse(
      await readFile(path.join(this.root, ".market/products.json"), "utf8"),
    );
  }

  private async runScript(script: string, variables: NodeJS.ProcessEnv) {
    try {
      const { stdout, stderr } = await promisify(execFile)("node", [script], {
        env: { ...process.env, MARKET_ROOT: this.root, ...variables },
      });
      this.log += stdout + stderr;
    } catch (error) {
      const { stdout = "", stderr = "" } = error as {
        stdout?: string;
        stderr?: string;
      };
      this.log += stdout + stderr;
      throw error;
    }
  }

  // Resolves a path from products.json (relative to MARKET_ROOT).
  resolve(file: string) {
    return path.join(this.root, file);
  }

  cacheDir(...parts: string[]) {
    return path.join(this.root, ".market/cache", ...parts);
  }

  publicDir(...parts: string[]) {
    return path.join(this.root, "public/market-cache", ...parts);
  }
}
