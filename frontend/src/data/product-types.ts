import type { ImageMetadata } from "astro";
import type {
  IndexArtifact,
  IndexDependency,
  IndexInstallable,
} from "../../scripts/fetch-market";

export const FILTER_VALUES = ["all", "connector", "utils", "demo"] as const;
export type Filter = (typeof FILTER_VALUES)[number];
export type ProductCategory = Exclude<Filter, "all">;

export const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "connector", label: "Connectors" },
  { value: "utils", label: "Utilities" },
  { value: "demo", label: "Demos" },
];

export const TYPE_LABELS: Record<ProductCategory, string> = {
  connector: "Connector",
  utils: "Util",
  demo: "Demo",
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
  artifacts: ProductArtifact[];
  mainArtifactId?: string;
  installable: ProductInstallable[];
};

export type ProductSummary = Pick<
  Product,
  "id" | "name" | "description" | "type"
> & { logo: string; featuredRank?: number };
