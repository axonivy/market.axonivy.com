<?php

namespace app\pages\product;

use app\domain\market\Product;
use app\domain\market\MavenProductInfo;
use app\domain\market\ProductDescription;
use app\domain\maven\MavenArtifact;
use app\domain\market\OpenAPIProvider;

class ProductView
{
  private Product $product;
  private ProductDescription $description;
  private string $openApiUrl;
  private bool $showDevVersions;
  private string $version;
  private string $designerVersion;
  private ?MavenProductInfo $mavenProductInfo;
  private bool $installNow;
  private $request;

  function __construct($request, Product $product, $version, string $designerVersion, bool $showDevVersions, ?MavenProductInfo $mavenProductInfo)
  {
    $this->product = $product;
    $this->description = ProductDescription::create($product, $version);
    $this->openApiUrl = (new OpenAPIProvider($product))->getOpenApiUrl($version);
    $this->showDevVersions = $showDevVersions;
    $this->version = $version;
    $this->designerVersion = $designerVersion;
    $this->mavenProductInfo = $mavenProductInfo;
    $this->installNow = isset($request->getQueryParams()['installNow']);
    $this->request = $request;
  }

  public function isInstallNow(): bool
  {
    return $this->installNow;
  }

  public function getDescription(): ProductDescription
  {
    return $this->description;
  }

  public function getDocUrl(): string
  {
    if ($this->mavenProductInfo == null) {
      return "";
    }
    $docArtifacts = $this->mavenProductInfo->getDocArtifacts();
    if (empty($docArtifacts)) {
      return "";
    }
    foreach ($docArtifacts as $docArtifact) {
      if (in_array($this->version, $docArtifact->getVersions())) {
        return $this->product->getDocUrl($this->version);
      }  
    }
    return "";
  }

  public function getOpenApiUrl(): string
  {
    return $this->openApiUrl;
  }

  public function getShowDevVersionsLink(): string
  {
    $key = $this->product->getKey();
    if ($this->showDevVersions) {
      return "/$key?showDevVersions=false#download";
    }
    return "/$key?showDevVersions=true#download";
  }

  public function getShowDevVersionsText(): string
  {
    if ($this->showDevVersions) {
      return "hide development versions";
    }
    return "show development versions";
  }

  public function getSelectedVersion(): string
  {
    return $this->version;
  }

  public function getProductVersion(): string
  {
    // if the version is not driven by maven, then the 
    // version is may in the meta.json
    if (empty($this->version)) {
      return $this->product->getVersion();
    }
    return $this->version;
  }

  public function getMavenArtifactsAsDependency(): array
  {
    if ($this->mavenProductInfo == null) {
      return [];
    }
    $mavenArtifacts = $this->mavenProductInfo->getMavenArtifacts($this->version);
    return array_filter($mavenArtifacts, fn(MavenArtifact $artifact) => $artifact->getMakesSenseAsMavenDependency());
  }

  public function getMavenArtifacts(): array
  {
    if ($this->mavenProductInfo == null) {
      return [];
    }
    $mavenArtifacts = $this->mavenProductInfo->getMavenArtifacts($this->version);
    return array_filter($mavenArtifacts, fn(MavenArtifact $a) => !$a->isProduct());;
  }

  public function getShowMinimumIvyVersionBanner(): bool
  {
    $v = $this->getMinimumIvyVersion();
    if (empty($v)) {
      return true;
    }
    return version_compare($this->designerVersion, $v) != -1;
  }

  public function getMinimumIvyVersion(): string
  {
    return $this->product->getMinimumIvyVersion($this->version);
  }

  public function getDesignerVersion(): string
  {
    return $this->designerVersion;
  }

  public function getVersionsToDisplay(): array
  {
    if ($this->mavenProductInfo == null) {
      return [];
    }
    $versions = $this->mavenProductInfo->getVersionsToDisplay($this->showDevVersions, $this->designerVersion);
    if (!empty($versions)) {
      return $versions;
    }
    return $this->mavenProductInfo->getVersions();
  }

  public function isInstallable(): bool
  {
    if ($this->mavenProductInfo == null) {
      return false;
    }
    return $this->mavenProductInfo->getProductArtifact() != null;
  }

  public function isVersionInstallable(): bool
  {
    return $this->product->isInstallable($this->version);    
  }

  public function getProductJsonUrl(string $version): string
  {
    $uri = $this->request->getUri();
    $baseUrl = $uri->getScheme() . '://' . $uri->getHost();
    return $baseUrl . $this->product->getProductJsonUrl($version);
  }
}
