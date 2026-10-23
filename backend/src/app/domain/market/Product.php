<?php

namespace app\domain\market;

use app\Config;
use app\domain\maven\MavenArtifact;
use app\domain\Version;

class Product
{
  private string $key;

  private string $name;
  private string $version;
  private string $shortDesc;
  private bool $listed;
  private string $type;
  private array $tags;
  private string $vendor;
  private string $vendorImage;
  private string $vendorUrl;
  private string $platformReview;
  private string $cost;
  private string $sourceUrl;
  private string $statusBadgeUrl;
  private string $language;
  private string $industry;
  private string $compatibility;
  private bool $validate;
  private bool $contactUs;

  private int $installationCount;

  private ProductFileResolver $fileResolver;
  private ?MavenArtifact $mavenArtifact;
  private array $additionalArtifacts;

  public function __construct(string $key, string $name, string $version, string $shortDesc, bool $listed, 
    string $type, array $tags, string $vendor, string $vendorImage, string $vendorUrl, string $platformReview, string $cost, string $sourceUrl, string $statusBadgeUrl, string $language, string $industry,
    string $compatibility, bool $validate, bool $contactUs, ?MavenArtifact $mavenArtifact, array $additionalArtifacts)
  {
    $this->key = $key;
    $this->name = $name;
    $this->version = $version;
    $this->shortDesc = $shortDesc;
    $this->listed = $listed;
    $this->type = $type;
    $this->tags = $tags;
    $this->vendor = $vendor;
    $this->vendorImage = $vendorImage;
    $this->vendorUrl = $vendorUrl;
    $this->platformReview = $platformReview;
    $this->cost = $cost;
    $this->sourceUrl = $sourceUrl;
    $this->statusBadgeUrl = $statusBadgeUrl;
    $this->language = $language;
    $this->industry = $industry;
    $this->compatibility = $compatibility;
    $this->validate = $validate;
    $this->contactUs = $contactUs;
    $this->fileResolver = new ProductFileResolver($this);
    $this->mavenArtifact = $mavenArtifact;
    $this->additionalArtifacts = $additionalArtifacts;
  }

  public function getKey(): string
  {
    return $this->key;
  }

  public function isListed(): bool
  {
    return $this->listed;
  }

  public function toValidate(): bool
  {
    return $this->validate;
  }

  public function getName(): string
  {
    return $this->name;
  }
  
  public function isContactUs(): bool
  {
    return $this->contactUs;
  }

  public function getInTouchLink(): string
  {
    return 'https://www.axonivy.com/marketplace/contact/?market_solutions=' . $this->key;
  }

  public function getVersion(): string
  {
    if (empty($this->version)) {
      if ($this->getMavenProductInfo() != null) {
        $this->version = $this->getMavenProductInfo()->getNewestVersion() ?? '';
      }
    }
    return $this->version;
  }

  public function getShortDescription(): string
  {
    return $this->shortDesc;
  }

  public function isInstallable(string $version): bool
  {
    $productJson = $this->fileResolver->file_productJson($version);
    return file_exists($productJson);
  }

  public function getVendor(): string
  {
    return $this->vendor;
  }

  public function getVendorImage(): string
  {
    if (str_starts_with($this->vendorImage, "/")) {
      return $this->vendorImage;
    }
    return $this->fileResolver->assetBaseUrl_unversionized() . '/' . $this->vendorImage;
  }

  public function getVendorUrl(): string
  {
    return $this->vendorUrl;
  }

  public function getPlatformReview(): string
  {
    return $this->platformReview;
  }

  public function getStarCount(): int
  {
    return (int) $this->platformReview;
  }

  public function getHalfStar(): bool
  {
    return (float) $this->platformReview != (float) $this->getStarCount();
  }

  public function getCost(): string
  {
    return $this->cost;
  }

  public function getSourceUrl(): string
  {
    return $this->sourceUrl;
  }

  public function getStatusBadgeUrl(): string
  {
    return $this->statusBadgeUrl;
  }

  public function getSourceUrlDomain(): string
  {
    return parse_url($this->sourceUrl)['host'] ?? '';
  }

  public function getLanguage(): string
  {
    return $this->language;
  }

  public function getIndustry(): string
  {
    return $this->industry;
  }

  public function getMinimumIvyVersion(string $version): ?string
  {
    $productJson = $this->getProductJsonContent($version);
    if (empty($productJson)) {
      return "";
    }
    return json_decode($productJson)->minimumIvyVersion ?? '';
  }

  public function getCompatibility(): string
  {
    if (empty($this->compatibility)) {
      if ($this->getMavenProductInfo() != null) {
        $this->compatibility = $this->getMavenProductInfo()->getOldestVersion() ?? '';
        $this->compatibility = str_replace('-SNAPSHOT', '', $this->compatibility);
        if (Version::isValidVersionNumber($this->compatibility)) {
          $version = new Version($this->compatibility);
          $this->compatibility = $version->getMinorVersion() . '+';
        }
      }
    }
    return $this->compatibility;
  }

  public function getType(): string
  {
    return $this->type;
  }

  public function getTypeIcon(): string
  {
    foreach (Type::all() as $type) {
      if ($type->getFilter() == $this->type) {
        return $type->getIcon();
      }
    }
    return 'si-types';
  }

  public function getTags(): array
  {
    return $this->tags;
  }

  public function getDocUrl(string $version): string
  {
    $key = $this->key;
    return "/$key/$version/doc";
  }
  
  public function getFirstTag(): string
  {
    if (empty($this->tags)) {
      return '';
    }
    return $this->tags[0];
  }

  public function getImgSrc()
  {
    return $this->fileResolver->assetBaseUrl_unversionized() . '/logo.png';
  }
  
  public function getUrl(): string
  {
    return '/' . $this->key;
  }

  public function getInstallationCount(): int
  {
    if (empty($this->installationCount)) {
      $this->installationCount = MarketInstallCounter::getInstallCount($this->key);
    }
    return $this->installationCount;
  }

  public function getProductJsonUrl(string $version): string
  {
    return $this->fileResolver->productJsonUrl($version);
  }
  
  public function getProductJsonContent(string $version): string
  {
    $path = $this->fileResolver->file_productJson($version);
    if (file_exists($path)) {
      return file_get_contents($path);
    }
    return '';
  }
  
  public function assetBaseUrl($version)
  {
    return $this->fileResolver->assetBaseUrl($version);
  }

  public function getProductFile(string $version, string $file): string
  {
    return $this->fileResolver->productFilePath($version, $file);
  }
  
  public function getProductArtifactId(): string {
    if ($this->mavenArtifact == null) {
      return "";
    }
    return $this->mavenArtifact->getArtifactId();
  }

  public function getMavenProductInfo(): ?MavenProductInfo
  {
    return new MavenProductInfo($this, $this->mavenArtifact, $this->additionalArtifacts);
  }
}

class ProductFileResolver
{
  private Product $product;

  public function __construct(Product $product)
  {
    $this->product = $product;
  }
  
  public function productJsonUrl(string $version): string
  {
    return $this->assetBaseUrl_versionized($version) . '/_product.json';
  }

  public function assetBaseUrl(string $version): string
  {
    if ($this->existsFile_versionized($version, "README.md")) {
      return $this->assetBaseUrl_versionized($version);
    }
    return $this->assetBaseUrl_unversionized();
  }
  
  private function existsFile_versionized(string $version, string $file): bool
  {
    $artifactId = $this->product->getProductArtifactId();
    if (empty($artifactId)) {
      return false;
    }
    $versionizedFile = $this->folder_versionized($version) . "/$file";
    return !empty(glob($versionizedFile));
  }
  
  public function assetBaseUrl_unversionized(): string
  {
    return '/_market/' . $this->product->getKey();
  }
  
  public function productFilePath(string $version, string $file): string
  {
    if ($this->existsFile_versionized($version, $file)) {
      return $this->folder_versionized($version) . '/' . $file;
    }
    return $this->folder_unversionized() . '/' . $file;
  }
  
  private function assetBaseUrl_versionized(string $version): string
  {
    $key = $this->product->getKey();
    $artifactId = $this->product->getProductArtifactId();
    return "/market-cache/$key/$artifactId/$version";
  }
  
  public function file_productJson(string $version): string
  {
    return $this->productFilePath($version, 'product.json');
  }
  
  private function folder_versionized(string $version): string
  {
    $key = $this->product->getKey();
    $artifactId = $this->product->getProductArtifactId();
    return Config::marketCacheDirectory() . "/$key/$artifactId/$version";
  }
  
  public function folder_unversionized(): string
  {
    $key = $this->product->getKey();
    return Config::marketDirectory() . "/$key";
  }
}
