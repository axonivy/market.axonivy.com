import type { ImageMetadata } from "astro";
import type {
  IndexArtifact,
  IndexDependency,
  IndexInstallable,
} from "../../scripts/fetch-market";
import type { ParseKeys } from "i18next";

export const FILTER_VALUES = ["all", "connector", "utils", "demo"] as const;
export type Filter = (typeof FILTER_VALUES)[number];
export type ProductCategory = Exclude<Filter, "all">;

export const FILTERS: { value: Filter; label: ParseKeys }[] = [
  { value: "all", label: "dashboard.viewOptions.filter.all" },
  { value: "connector", label: "common.connectors" },
  { value: "utils", label: "common.utilities" },
  { value: "demo", label: "common.demos" },
];

export const TYPE_LABELS: Record<ProductCategory, ParseKeys> = {
  connector: "common.connector",
  utils: "common.util",
  demo: "common.demo",
};

type Localized = { locale: string; value: string };

export type ProductMeta = {
  id: string;
  name: string;
  names?: Localized[];
  description: string;
  descriptions?: Localized[];
  type: ProductCategory;
  listed?: boolean;
  deprecated?: boolean;
  validate?: boolean;
  platformReview?: string;
  sourceUrl?: string;
  statusBadgeUrl?: string;
  language?: string;
  industry?: string;
  tags?: string[];
  cost?: string;
  contactUs?: boolean;
  version?: string;
  compatibility?: string;
  versionDisplay?: string;
  installMatcher?: string;
  vendor?: string;
  vendorUrl?: string;
  vendorImage?: string;
  vendorImageDarkMode?: string;
  vendorLogo?: string;
  vendorLogoDarkMode?: string;
};

export type ProductArtifact = IndexArtifact;
export type ProductInstallable = IndexInstallable;
export type ProductDependency = IndexDependency;

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
