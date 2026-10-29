import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(
  process.env.MARKET_ROOT ??
    path.join(path.dirname(fileURLToPath(import.meta.url)), ".."),
);
export const INDEX_FILE = path.join(ROOT, ".market", "product-index.json");

export const warnings: string[] = [];

export function warn(message: string) {
  warnings.push(message);
  console.warn(` ${message}`);
}

export class NotFoundError extends Error {}

export async function fetchWithRetry(
  url: string,
  retries = 3,
  init?: RequestInit,
): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(url, init);
      if (response.status === 404) {
        throw new NotFoundError(`404 ${url}`);
      }
      if (!response.ok) {
        throw new Error(`${response.status} ${url}`);
      }
      return response;
    } catch (error) {
      if (error instanceof NotFoundError || attempt >= retries) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
    }
  }
}

export async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await fn(items[index]);
      }
    },
  );
  await Promise.all(workers);
  return results;
}

export async function readJson<T>(file: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch {
    return undefined;
  }
}

export function toPosix(file: string) {
  return file.split(path.sep).join("/");
}
