/**
 * Generated from https://raw.githubusercontent.com/axonivy-market/market/refs/heads/master/schema/meta.json
 * DO NOT MODIFY IT BY HAND. Run `pnpm generate:meta` to regenerate.
 */

/**
 * This interface was referenced by `MarketMeta`'s JSON-Schema
 * via the `definition` "Cost".
 */
export type Cost = "free" | "paid";
/**
 * This interface was referenced by `MarketMeta`'s JSON-Schema
 * via the `definition` "ArtifactType".
 */
export type ArtifactType = "zip" | "nbm" | "jar";
/**
 * This interface was referenced by `MarketMeta`'s JSON-Schema
 * via the `definition` "Type".
 */
export type Type = "connector" | "demo" | "utils" | "solution";

export interface MarketMeta {
  $schema?: string;
  compatibility?: string;
  /**
   * shows the link to contact axonivy
   */
  contactUs?: boolean;
  cost?: Cost;
  deprecated?: boolean;
  description: string;
  descriptions?: DisplayDescription[];
  /**
   * public accessible URI pointing to the documentation of the market item
   */
  documentationUrl?: string;
  /**
   * marks the market item as featured project, that is populary listed on the market front page
   */
  featured?: boolean;
  id: string;
  industry?: string;
  installMatcher?: string;
  language?: string;
  /**
   * priority of the market item in product list; lower values are displayed first. Stick to positive numbers.
   */
  listPriority?: number;
  listed?: boolean;
  mavenArtifacts?: MavenArtifact[];
  name: string;
  names?: DisplayName[];
  platformReview?: string;
  sourceUrl?: string;
  statusBadgeUrl?: string;
  sunset?: Deprecation;
  tags?: string[];
  type: Type;
  validate?: boolean;
  vendor?: string;
  /**
   * relative path to a logo of the vendor, e.g. 'acme.png'
   */
  vendorImage?: string;
  /**
   * relative path to a logo of the vendor dark mode, e.g. 'acme-dark-mode.png'
   */
  vendorImageDarkMode?: string;
  /**
   * relative path to a badge of the vendor, e.g. 'bagde.png'
   */
  vendorLogo?: string;
  /**
   * relative path to a badge of the vendor dark mode, e.g. 'bagde-dark.png'
   */
  vendorLogoDarkMode?: string;
  /**
   * public accessible URI representating the vendor
   */
  vendorUrl?: string;
  version?: string;
  versionDisplay?: string;
}
/**
 * This interface was referenced by `MarketMeta`'s JSON-Schema
 * via the `definition` "DisplayDescription".
 */
export interface DisplayDescription {
  locale: string;
  value: string;
}
/**
 * This interface was referenced by `MarketMeta`'s JSON-Schema
 * via the `definition` "MavenArtifact".
 */
export interface MavenArtifact {
  /**
   * archived artifacts using old (legacy) group ID and artifact ID with the last version they were being used.
   */
  archivedArtifacts?: ArchivedArtifact[];
  artifactId: string;
  doc?: boolean;
  groupId: string;
  key?: string;
  makesSenseAsMavenDependency?: boolean;
  name: string;
  repoUrl?: string;
  type?: ArtifactType;
}
/**
 * This interface was referenced by `MarketMeta`'s JSON-Schema
 * via the `definition` "ArchivedArtifact".
 */
export interface ArchivedArtifact {
  artifactId: string;
  groupId: string;
  /**
   * this is the 'max version' selector. All versions which are lower than or equal the defined value, will be treated as legacy artifact.
   * Therefore supplying 'legacy' group-/artifact-id for download.
   *
   */
  lastVersion: string;
}
/**
 * This interface was referenced by `MarketMeta`'s JSON-Schema
 * via the `definition` "DisplayName".
 */
export interface DisplayName {
  locale: string;
  value: string;
}
/**
 * This interface was referenced by `MarketMeta`'s JSON-Schema
 * via the `definition` "Deprecation".
 */
export interface Deprecation {
  deprecated?: boolean;
  finalVersion?: string;
  successor?: Successor;
}
/**
 * This interface was referenced by `MarketMeta`'s JSON-Schema
 * via the `definition` "Successor".
 */
export interface Successor {
  description?: string;
  id?: string;
  url?: string;
}
