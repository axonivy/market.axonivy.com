<?php

namespace app\domain\maven;

use app\domain\market\Product;
use app\domain\Version;

class MavenArtifact
{

  private $name;

  private string $repoUrl;

  private $groupId;

  private $artifactId;

  private $type;

  private $versionCache = null;

  private $makesSenseAsMavenDependency;

  private $isDocumentation;

  private $archivedArtifacts;

  function __construct($name, string $repoUrl, $groupId, $artifactId, $type, bool $makesSenseAsMavenDependency, bool $isDocumentation, array $archivedArtifacts)
  {
    $this->name = $name;
    $this->repoUrl = $repoUrl;
    $this->groupId = $groupId;
    $this->artifactId = $artifactId;
    $this->type = $type;
    $this->makesSenseAsMavenDependency = $makesSenseAsMavenDependency;
    $this->isDocumentation = $isDocumentation;
    $this->archivedArtifacts = $archivedArtifacts;
  }

  public static function create(): MavenArtifactBuilder
  {
    return new MavenArtifactBuilder();
  }


  public function getRepoUrl(): string
  {
    return $this->repoUrl;
  }

  public function getGroupId(): string
  {
    return $this->groupId;
  }

  public function getArtifactId(): string
  {
    return $this->artifactId;
  }

  public function isProduct(): bool
  {
    return str_ends_with($this->getArtifactId(), '-product');
  }

  public function getType(): string
  {
    return $this->type;
  }

  public function getName(): string
  {
    return $this->name;
  }

  public function getMakesSenseAsMavenDependency(): bool
  {
    return $this->makesSenseAsMavenDependency;
  }

  public function isDocumentation(): bool
  {
    return $this->isDocumentation;
  }

  public function getArchivedArtifacts(): array
  {
    return $this->archivedArtifacts;
  }

  public function getDocUrl(Product $product, string $version)
  {
    $artifactId = $this->getTargetArtifactIdFromVersion($version);
    return '/market-cache/' . $product->getKey() . '/' . $artifactId . '/' . $version;
  }

  public function getUrl($version)
  {
    $concretVersion = $this->getConcreteVersion($version);
    $baseUrl = $this->getBaseUrlFromVersion($version);
    $artifactId = $this->getTargetArtifactIdFromVersion($version);
    return $baseUrl . '/' . $version . '/' . $artifactId . '-' . $concretVersion . '.' . $this->type;
  }

  public function getTargetGroupIdFromVersion($version)
  {
    foreach ($this->archivedArtifacts as $artifact) {
      if (version_compare($artifact->getLastVersion(), $version, 'ge')) {
        return $artifact->getGroupId();
      }
    }
    return $this->groupId;
  }

  public function getTargetArtifactIdFromVersion($version)
  {
    foreach ($this->archivedArtifacts as $artifact) {
      if (version_compare($artifact->getLastVersion(), $version, 'ge')) {
        return $artifact->getArtifactId();
      }
    }
    return $this->artifactId;
  }

  public function getBaseUrlFromVersion($version)
  {
    $targetGroupId = $this->getTargetGroupIdFromVersion($version);
    $targetArtifactId = $this->getTargetArtifactIdFromVersion($version);
    return $this->getBaseUrlFromGroupIdAndArtifactId($targetGroupId, $targetArtifactId);
  }

  public function getConcreteVersion($version)
  {
    if (str_contains($version, 'SNAPSHOT')) {
      $baseUrl = $this->getBaseUrlFromVersion($version);
      $xml = HttpRequester::request("$baseUrl/$version/maven-metadata.xml");
      if (empty($xml)) {
        return "";
      }
      return self::parseVersionIdentifierFromXml($xml);
    }
    return $version;
  }

  public static function parseVersionIdentifierFromXml(string $xml): string
  {
    $element = new \SimpleXMLElement($xml);
    $result = $element->xpath('/metadata/versioning/snapshotVersions/snapshotVersion');
    return $result[0]->value;
  }

  private function getBaseUrl()
  {
    return $this->getBaseUrlFromGroupIdAndArtifactId($this->groupId, $this->artifactId);
  }

  private function getBaseUrlFromGroupIdAndArtifactId($targetGroupId, $artifactId)
  {
    $groupId = str_replace('.', '/', $targetGroupId);
    return $this->repoUrl . "$groupId/" . $artifactId;
  }

  public function getVersions(): array
  {
    if ($this->versionCache == null) {
      $this->updateVersionCacheFromArchivedArtifacts();
      $this->updateVersionCache($this->getBaseUrl());
    }
    return $this->versionCache;
  }

  private function updateVersionCacheFromArchivedArtifacts()
  {
    foreach ($this->archivedArtifacts as $archivedArtifact) {
      $archivedArtifactBaseUrl = $this->getBaseUrlFromGroupIdAndArtifactId($archivedArtifact->getGroupId(), $archivedArtifact->getArtifactId());
      $this->updateVersionCache($archivedArtifactBaseUrl);
    }
  }

  private function updateVersionCache(string $baseUrl)
  {
    $versions = $this->getVersionsByBaseUrl($baseUrl);
    $this->mergeWithVersionCache($versions);
  }

  private function getVersionsByBaseUrl(string $baseUrl): array
  {
    $v = [];
    $xml = HttpRequester::request("$baseUrl/maven-metadata.xml");
    if (!empty($xml)) {
      $v = self::parseVersions($xml);
      usort($v, 'version_compare');
      $v = array_reverse($v);
      $v = self::filterSnapshotsWhichAreReleased($v);
    }
    return $v;
  }

  private function mergeWithVersionCache(array $versions)
  {
    if ($this->versionCache != null) {
      $versions = array_merge($this->versionCache, $versions);
    }

    usort($versions, 'version_compare');
    $versions = array_reverse($versions);
    $this->versionCache = $versions;
  }

  public static function filterSnapshotsBetweenReleasedVersions(array $versions): array
  {
    return array_values(array_filter($versions, fn($version) => self::filterBetweenSnapshots($versions, $version)));
  }

  private static function filterBetweenSnapshots(array $versions, string $version): bool
  {
    $ver = new Version($version);
    if ($ver->isSnapshot()) {
      $bugfixVersion = $ver->getBugfixVersion();
      foreach ($versions as $v) {
        $relVer = new Version($v);
        if ($relVer->isOffical() && $relVer->getBugfixVersion() == $bugfixVersion) {
          return false;
        }
      }
    }
    return true;
  }

  public static function filterSnapshotsWhichAreReleased(array $versions): array
  {
    return array_values(array_filter($versions, fn ($version) => self::filterReleasedSnapshots($versions, $version)));
  }

  private static function filterReleasedSnapshots(array $versions, string $v): bool
  {
    $ver = new Version($v);
    if ($ver->isSnapshot() || $ver->isSprint()) {
      $releasedVersion = $ver->getBugfixVersion();
      foreach ($versions as $v) {
        $rel = new Version($v);
        if ($rel->isOffical() && $rel->getBugfixVersion() == $releasedVersion) {
          return false;
        }
      }
    }
    return true;
  }

  public static function parseVersions($xml)
  {
    $element = new \SimpleXMLElement($xml);
    $result = $element->xpath('/metadata/versioning/versions');
    $versions = get_object_vars($result[0]->version);
    return array_values($versions);
  }
}
