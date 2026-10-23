<?php

namespace app\domain\market;

use app\domain\maven\MavenArtifact;
use app\Config;

class ProductFactory
{
  public static function create(string $key, string $pathMetaFile): Product
  {
    $content = file_get_contents($pathMetaFile);
    $json = json_decode($content);

    $listed = $json->listed ?? true;
    $type = $json->type ?? [];
    $tags = $json->tags ?? [];
    $version = $json->version ?? '';
    $shortDesc = $json->description ?? '';

    $vendor = $json->vendor ?? 'Axon Ivy AG';
    $vendorImage = $json->vendorImage ?? '/images/misc/axonivy-logo-black.svg';
    $vendorUrl = $json->vendorUrl ?? 'https://www.axonivy.com';

    $platformReview = $json->platformReview ?? '4.0';
    $cost = $json->cost ?? 'Free';
    $sourceUrl = $json->sourceUrl ?? '';
    $statusBadgeUrl = $json->statusBadgeUrl ?? '';
    $language = $json->language ?? '';
    $industry = $json->industry ?? '';
    $compatibility = $json->compatibility ?? '';
    $validate = $json->validate ?? false;
    $contactUs = $json->contactUs ?? false;

    $mavenArtifact = self::createMavenArtifact($json);
    $additionalArtifacts = self::createMavenArtifacts($json);

    return new Product($key, $json->name, $version, $shortDesc, $listed, $type, $tags,
      $vendor, $vendorImage, $vendorUrl, $platformReview, $cost, $sourceUrl, $statusBadgeUrl, $language, $industry, $compatibility, $validate, $contactUs, $mavenArtifact, $additionalArtifacts);
  }

  private static function createMavenArtifact($json): ?MavenArtifact
  {
    if (!isset($json->mavenArtifacts)) {
      return null;
    }
    foreach ($json->mavenArtifacts as $mavenArtifact) {
      if (str_ends_with($mavenArtifact->artifactId, "-product")) {
        return MavenArtifact::create($mavenArtifact->key ?? $mavenArtifact->artifactId)
          ->name($mavenArtifact->name)
          ->repoUrl($mavenArtifact->repoUrl ?? Config::MAVEN_ARTIFACTORY_URL)
          ->groupId($mavenArtifact->groupId)
          ->artifactId($mavenArtifact->artifactId)
          ->type($mavenArtifact->type ?? 'iar')
          ->makesSenseAsMavenDependency($mavenArtifact->makesSenseAsMavenDependency ?? false)
          ->doc($mavenArtifact->doc ?? false)
          ->archivedArtifacts($mavenArtifact->archivedArtifacts ?? [])
          ->build();
      }
    }
    return null;
  }

  private static function createMavenArtifacts($json): array
  {
    if (!isset($json->mavenArtifacts)) {
      return [];
    }
    $a = [];
    foreach ($json->mavenArtifacts as $mavenArtifact) {
      if (!str_ends_with($mavenArtifact->artifactId, "-product")) {
        $a[] = MavenArtifact::create($mavenArtifact->key ?? $mavenArtifact->artifactId)
          ->name($mavenArtifact->name)
          ->repoUrl($mavenArtifact->repoUrl ?? Config::MAVEN_ARTIFACTORY_URL)
          ->groupId($mavenArtifact->groupId)
          ->artifactId($mavenArtifact->artifactId)
          ->type($mavenArtifact->type ?? 'iar')
          ->makesSenseAsMavenDependency($mavenArtifact->makesSenseAsMavenDependency ?? false)
          ->doc($mavenArtifact->doc ?? false)
          ->archivedArtifacts($mavenArtifact->archivedArtifacts ?? [])
          ->build();
      }
    }
    return $a;
  }
}
