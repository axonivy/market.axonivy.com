import { compatibilityRange } from "@/data/versions";
import type { Lang } from "@/translation/ui";
import type { ImageMetadata } from "astro";
import type { IndexProduct, MarketIndex } from "../../scripts/fetch-market";
import {
  isDownloadable,
  type Localized,
  type Product,
  type ProductMeta,
  type ProductSummary,
} from "./product-types";

export * from "./product-types";

const DEFAULT_VENDOR = "Axon Ivy AG";
const DEFAULT_VENDOR_URL = "https://www.axonivy.com";
const DEFAULT_COST = "Free";

const indexFiles = import.meta.glob<MarketIndex>("/.market/products.json", {
  eager: true,
  import: "default",
});

const metaFiles = import.meta.glob<ProductMeta>(
  "/.market/meta-catalog/products/*/meta.json",
  { eager: true, import: "default" },
);

const imageFiles = import.meta.glob<ImageMetadata>(
  "/.market/meta-catalog/products/*/*.png",
  { eager: true, import: "default" },
);

export function localize(
  values: Localized[] | undefined,
  lang: Lang,
  fallback: string,
): string {
  return values?.find((v) => v.locale === lang)?.value ?? fallback;
}

function loadIndex(): Map<string, IndexProduct> {
  const index = indexFiles["/.market/products.json"];
  if (!index) {
    throw new Error(
      "Market data not found (.market/products.json). Run `pnpm fetch-data` first.",
    );
  }
  return new Map(index.products.map((product) => [product.id, product]));
}

function loadProducts(): Product[] {
  const index = loadIndex();
  const image = (dir: string, file?: string) =>
    file ? imageFiles[`${dir}/${file}`] : undefined;

  return Object.entries(metaFiles)
    .map(([path, meta]): Product | undefined => {
      const dir = path.slice(0, -"/meta.json".length);
      const logo = image(dir, "logo.png");
      if (!logo) return undefined;
      const data = index.get(meta.id);
      const deprecated =
        meta.sunset?.deprecated === true || meta.deprecated === true;
      return {
        ...meta,
        deprecated,
        vendor: meta.vendor ?? DEFAULT_VENDOR,
        vendorUrl: meta.vendorUrl ?? DEFAULT_VENDOR_URL,
        cost: capitalize(meta.cost ?? DEFAULT_COST),
        tags: meta.tags?.map(capitalize),
        compatibility: compatibilityRange(data?.versions ?? [], deprecated),
        logo,
        logoDark: image(dir, "logo-dark.png"),
        vendorImageFile: image(dir, meta.vendorImage),
        vendorImageDarkModeFile: image(dir, meta.vendorImageDarkMode),
        versions: data?.versions ?? [],
        featuredVersion: data?.featuredVersion,
        readme: data?.readme,
        changelog: data?.changelog,
        dependency: data?.dependency,
        mavenDropins: data?.mavenDropins,
        artifacts: data?.artifacts ?? [],
        mainArtifactId: findMainArtifactId(data),
        installable: data?.installable ?? [],
      };
    })
    .filter(
      (product): product is Product =>
        product !== undefined &&
        product.listed !== false &&
        !isMissingOnMaven(product),
    )
    .sort((a, b) => a.name.localeCompare(b.name));
}

function findMainArtifactId(data?: IndexProduct): string | undefined {
  const downloadable = (data?.artifacts ?? []).filter(isDownloadable);
  const productArtifactId = data?.artifacts
    .find((artifact) => artifact.isProduct)
    ?.artifactId.replace(/-product$/, "");
  return (
    [productArtifactId, data?.dependency?.artifactId].find((id) =>
      downloadable.some((artifact) => artifact.artifactId === id),
    ) ?? downloadable[0]?.artifactId
  );
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function isMissingOnMaven(product: Product): boolean {
  return (
    product.artifacts.length > 0 &&
    product.artifacts.every((artifact) => artifact.versions.length === 0)
  );
}

let products: Product[] | undefined;

export function getAllProducts(): Product[] {
  products ??= loadProducts();
  return products;
}

export function getProductById(id: string): Product | undefined {
  return getAllProducts().find((product) => product.id === id);
}

export function getProductSummaries(lang: Lang): ProductSummary[] {
  return getAllProducts().map(
    ({
      id,
      name,
      names,
      description,
      descriptions,
      type,
      logo,
      logoDark,
      featured,
      listPriority,
      deprecated,
    }) => ({
      id,
      name: localize(names, lang, name),
      description: localize(descriptions, lang, description),
      type,
      logo: logo.src,
      logoDark: logoDark?.src,
      featured,
      listPriority,
      deprecated,
    }),
  );
}
