import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const distDirectory = fileURLToPath(new URL("../dist/", import.meta.url));

async function relativizeHtml(directory = distDirectory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await relativizeHtml(filePath);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".html")) continue;

    const source = await readFile(filePath, "utf8");
    const pageDirectory = path
      .relative(distDirectory, path.dirname(filePath))
      .split(path.sep)
      .join("/");
    const output = source.replace(
      /(\s(?:href|src|poster|action)\s*=\s*)(["'])(\/(?!\/)[^"']*)\2/gi,
      (_match, attribute, quote, value) =>
        `${attribute}${quote}${relativeUrl(pageDirectory, value)}${quote}`,
    );

    if (output !== source) await writeFile(filePath, output);
  }
}

function relativeUrl(pageDirectory, value) {
  const suffixIndex = value.search(/[?#]/);
  const targetPath = suffixIndex === -1 ? value : value.slice(0, suffixIndex);
  const suffix = suffixIndex === -1 ? "" : value.slice(suffixIndex);
  const relative =
    path.posix.relative(pageDirectory || ".", targetPath.slice(1)) || ".";
  const trailingSlash = targetPath.endsWith("/") && !relative.endsWith("/");

  return `${relative}${trailingSlash ? "/" : ""}${suffix}`;
}

await relativizeHtml();