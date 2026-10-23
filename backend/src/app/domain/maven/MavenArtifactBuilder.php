<?php

namespace app\domain\maven;

use app\Config;

class MavenArtifactBuilder
{
  private string $repoUrl = Config::MAVEN_ARTIFACTORY_URL;
  private $name = "";
  private $groupId;
  private $artifactId;
  private $type = 'iar';
  private $makesSenseAsMavenDependency = false;
  private $isDocumentation = false;
  private array $archivedArtifacts = [];

  public function __construct()
  {
  }

  public function repoUrl(string $repoUrl): MavenArtifactBuilder
  {
    if (!str_ends_with($repoUrl, '/')) {
      $repoUrl = $repoUrl . '/';
    }
    $this->repoUrl = $repoUrl;
    return $this;
  }

  public function name(string $name): MavenArtifactBuilder
  {
    $this->name = $name;
    return $this;
  }

  public function groupId(string $groupId): MavenArtifactBuilder
  {
    $this->groupId = $groupId;
    return $this;
  }

  public function artifactId(string $artifactId): MavenArtifactBuilder
  {
    $this->artifactId = $artifactId;
    return $this;
  }

  public function type(string $type): MavenArtifactBuilder
  {
    $this->type = $type;
    return $this;
  }

  public function makesSenseAsMavenDependency(bool $makesSenseAsMavenDependency): MavenArtifactBuilder
  {
    $this->makesSenseAsMavenDependency = $makesSenseAsMavenDependency;
    return $this;
  }

  public function doc(bool $doc): MavenArtifactBuilder
  {
    $this->isDocumentation = $doc;
    return $this;
  }

  public function archivedArtifacts(array $archivedArtifacts): MavenArtifactBuilder
  {
    $this->archivedArtifacts = $archivedArtifacts;
    return $this;
  }

  public function build(): MavenArtifact
  {
    if (empty($this->name)) {
      if (!empty($this->artifactId)) {
        $this->name = self::toName($this->artifactId);
      }
    }

    $this->archivedArtifacts = self::createArchivedArtifacts($this->archivedArtifacts);

    return new MavenArtifact(
      $this->name,
      $this->repoUrl,
      $this->groupId,
      $this->artifactId,
      $this->type,
      $this->makesSenseAsMavenDependency,
      $this->isDocumentation,
      $this->archivedArtifacts
    );
  }

  private static function createArchivedArtifacts($archivedArtifacts): array
  {
    if (!isset($archivedArtifacts)) {
      return [];
    }
    $a = [];
    foreach ($archivedArtifacts as $artifact) {
      $a[] = new ArchivedArtifact($artifact->lastVersion, $artifact->groupId, $artifact->artifactId);
    }
    usort($a, fn($artifactA, $artifactB) => version_compare($artifactA->getLastVersion(), $artifactB->getLastVersion()));
    return $a;
  }

  private static function toName(string $artifactId): string
  {
    $names = explode("-", $artifactId);
    $name = implode(" ", $names);
    $name = ucwords($name);
    return $name;
  }
}
