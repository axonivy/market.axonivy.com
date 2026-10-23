<?php

namespace app\domain\market;

use app\domain\maven\MavenArtifact;
use app\domain\Version;

class MavenProductInfo
{
  private Product $product;
  private ?MavenArtifact $productMavenArtifact;
  private array $additionalMavenArtifacts;

  public function __construct(Product $product, ?MavenArtifact $productMavenArtifact, array $additionalMavenArtifacts)
  {
    $this->product = $product;
    $this->productMavenArtifact = $productMavenArtifact;
    $this->additionalMavenArtifacts = $additionalMavenArtifacts;
  }

  public function getMavenArtifacts(string $version): array
  {
    $json = json_decode($this->product->getProductJsonContent($version));

    $artifacts = [];
    if (isset($json->installers)) {
      foreach ($json->installers as $installer) {
        $id = $installer->id ?? "";
        if ($id == 'maven-import') {
          $data = $installer->data ?? "";
          if (!empty($data)) {
            if (isset($data->projects)) {
              foreach ($data->projects as $project) {
                $artifacts[] = MavenArtifact::create($project->artifactId)
                  //->repoUrl($mavenArtifact->repoUrl ?? Config::MAVEN_ARTIFACTORY_URL)
                  ->groupId($project->groupId)
                  ->artifactId($project->artifactId)
                  ->type($project->type ?? 'iar')
                  ->makesSenseAsMavenDependency(false)
                  ->doc(false)
                  ->build();
              }
            }
          }
        }
        if ($id == 'maven-dependency') {
          $data = $installer->data ?? "";
          if (!empty($data)) {
            if (isset($data->dependencies)) {
              foreach ($data->dependencies as $dependency) {
                $artifacts[] = MavenArtifact::create($dependency->artifactId)
                  //->repoUrl($mavenArtifact->repoUrl ?? Config::MAVEN_ARTIFACTORY_URL)
                  ->groupId($dependency->groupId)
                  ->artifactId($dependency->artifactId)
                  ->type($dependency->type ?? 'iar')
                  ->makesSenseAsMavenDependency(true)
                  ->doc(false)
                  ->build();
              }
            }
          }
        }
      }
    }

    foreach ($this->additionalMavenArtifacts as $m) {
      $artifacts[] = $m;
    }
    return $artifacts;
  }

  public function getDocArtifacts(): array
  {
    $artifacts = [];
    foreach ($this->additionalMavenArtifacts as $mavenArtifact) {
      if ($mavenArtifact->isDocumentation()) {
        $artifacts[] = $mavenArtifact;
      }
    }
    return $artifacts;
  }

  public function getProductArtifact(): ?MavenArtifact
  {
    return $this->productMavenArtifact;
  }

  public function getVersions(): array
  {
    $versions = [];
    if ($this->productMavenArtifact != null) {
      $versions = $this->productMavenArtifact->getVersions();
    }
    foreach ($this->additionalMavenArtifacts as $m) {
      $vs = $m->getVersions();
      $versions = array_merge($versions, $vs);
    }
    $versions = array_values($versions);
    $versions = array_unique($versions);
    usort($versions, 'version_compare');
    $versions = array_reverse($versions);
    $versions = MavenArtifact::filterSnapshotsWhichAreReleased($versions);
    return $versions;
  }

  public function getNewestVersion(): ?string
  {
    $versions = $this->getVersions();
    return reset($versions);
  }

  public function getOldestVersion(): ?string
  {
    $versions = $this->getVersions();
    return end($versions);
  }

  public function hasVersion(string $v): bool
  {
    $versions = $this->getVersions();
    foreach ($versions as $version) {
      if ($version == $v) {
        return true;
      }
    }
    return false;
  }

  public function getVersionsReleased(): array
  {
    return $this->getVersionsToDisplay(false, null);
  }

  public function getVersionsToDisplay(bool $showDevVersions, ?string $designerVersion): array
  {
    $versions = $this->getVersions();
    if ($showDevVersions) {
      return $versions;
    }

    if (empty($designerVersion)) {
      $versions = array_filter($versions, fn(string $v) => !str_contains($v, '-SNAPSHOT') && !str_contains($v, "-m"));
      return array_values($versions);
    }

    if (Version::isValidVersionNumber($designerVersion)) {
      $designerVersion = (new Version($designerVersion))->getMinorVersion();
    }
    $versions = array_filter($versions, fn(string $v) => str_starts_with($v, $designerVersion) || (!str_contains($v, '-SNAPSHOT') && !str_contains($v, '-m')));
    $versions = MavenArtifact::filterSnapshotsBetweenReleasedVersions($versions);
    return array_values($versions);
  }

  public function getBestMatchVersion(bool $showDevVersions, ?string $designerVersion): ?string
  {
    $versions = $this->getVersionsToDisplay($showDevVersions, $designerVersion);
    if (empty($designerVersion)) {
      return reset($versions);
    }
    if (Version::isValidVersionNumber($designerVersion)) {

      // favor exact match
      foreach ($versions as $v) {
        if ($v == $designerVersion) {
          return $v;
        }
      }

      // use version before exact match. because the version in the market defines the minimum version of the product
      $designerMinorVersion = (new Version($designerVersion))->getMinorVersion();
      foreach ($versions as $v) {
        if (version_compare($v, $designerVersion) == -1) {
          if (str_starts_with($v, $designerMinorVersion)) {
            return $v;
          }
        }
      }
    }
    return reset($versions);
  }
}
