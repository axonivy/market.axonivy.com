import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { compile, type JSONSchema } from "json-schema-to-typescript";
import { fetchWithRetry, ROOT } from "./shared.ts";

const META_SCHEMA_URL =
  process.env.META_SCHEMA_URL ??
  "https://raw.githubusercontent.com/axonivy-market/market/refs/heads/master/schema/meta.json";
const OUT_FILE = path.join(ROOT, "scripts", "generated", "meta.ts");

async function main() {
  console.log(`Fetching ${META_SCHEMA_URL}`);
  const schema = (await (
    await fetchWithRetry(META_SCHEMA_URL)
  ).json()) as JSONSchema;

  const ts = await compile(schema, "MarketMeta", {
    bannerComment: `/**
 * Generated from ${META_SCHEMA_URL}
 * DO NOT MODIFY IT BY HAND. Run \`pnpm generate:meta\` to regenerate.
 */`,
    // Also emit $defs that the root doesn't reference directly.
    unreachableDefinitions: true,
  });

  await mkdir(path.dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, ts);
  console.log(`Types written to ${path.relative(ROOT, OUT_FILE)}`);
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
