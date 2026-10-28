import type { ImageMetadata } from "astro";
import type { TFunction } from "i18next";
import type {
  IndexArtifact,
  IndexDependency,
  IndexInstallable,
} from "../../scripts/fetch-market";
import type { DisplayName, MarketMeta } from "../../scripts/generated/meta";

export const FILTER_VALUES = ["all", "connector", "utils", "demo"] as const;
export type Filter = (typeof FILTER_VALUES)[number];
export type ProductCategory = Exclude<Filter, "all">;

export const getFilters = (
  t: TFunction,
): { value: Filter; label: string }[] => [
  { value: "all", label: t("dashboard.viewOptions.filter.all") },
  { value: "connector", label: t("common.connectors") },
  { value: "utils", label: t("common.utilities") },
  { value: "demo", label: t("common.demos") },
];

export const typeLabel = (t: TFunction, type: ProductCategory): string =>
  ({
    connector: t("common.connector"),
    utils: t("common.util"),
    demo: t("common.demo"),
  })[type];

export type Localized = DisplayName;

export type ProductMeta = Omit<MarketMeta, "type"> & { type: ProductCategory };

export type ProductArtifact = IndexArtifact;
export type ProductInstallable = IndexInstallable;
export type ProductDependency = IndexDependency;

export const contactUrl = (productId: string) =>
  `https://www.axonivy.com/marketplace/contact/?market_solutions=${productId}`;

export function isDownloadable(artifact: ProductArtifact): boolean {
  return !artifact.isProduct && artifact.versions.length > 0;
}

export type Product = Omit<ProductMeta, "vendor" | "vendorUrl" | "cost"> & {
  vendor: string;
  vendorUrl: string;
  cost: string;
  logo: ImageMetadata;
  logoDark?: ImageMetadata;
  vendorImageFile?: ImageMetadata;
  vendorImageDarkModeFile?: ImageMetadata;
  versions: string[];
  featuredVersion?: string;
  readme?: { file: string; baseUrl: string };
  changelog?: string;
  dependency?: ProductDependency;
  mavenDropins?: boolean;
  artifacts: ProductArtifact[];
  mainArtifactId?: string;
  installable: ProductInstallable[];
};

export type ProductSummary = Pick<
  Product,
  "id" | "name" | "description" | "type"
> & {
  logo: string;
  logoDark?: string;
  featuredRank?: number;
  deprecated?: boolean;
};
