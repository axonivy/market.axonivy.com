<?php

namespace app\domain\market;

class Product
{
  private string $key;
  private string $name;
  private string $shortDesc;
  private bool $listed;
  private string $type;
  private array $tags;
  private string $vendor;
  private string $vendorUrl;
  private string $platformReview;
  private string $cost;
  private string $sourceUrl;
  private string $statusBadgeUrl;
  private string $language;
  private string $industry;
  private bool $validate;
  private bool $contactUs;

  public function __construct(
    string $key,
    string $name,
    string $shortDesc,
    bool $listed,
    string $type,
    array $tags,
    string $vendor,
    string $vendorUrl,
    string $platformReview,
    string $cost,
    string $sourceUrl,
    string $statusBadgeUrl,
    string $language,
    string $industry,
    bool $validate,
    bool $contactUs
  ) {
    $this->key = $key;
    $this->name = $name;
    $this->shortDesc = $shortDesc;
    $this->listed = $listed;
    $this->type = $type;
    $this->tags = $tags;
    $this->vendor = $vendor;
    $this->vendorUrl = $vendorUrl;
    $this->platformReview = $platformReview;
    $this->cost = $cost;
    $this->sourceUrl = $sourceUrl;
    $this->statusBadgeUrl = $statusBadgeUrl;
    $this->language = $language;
    $this->industry = $industry;
    $this->validate = $validate;
    $this->contactUs = $contactUs;
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

  public function getShortDescription(): string
  {
    return $this->shortDesc;
  }

  public function getVendor(): string
  {
    return $this->vendor;
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
    return '/' . $this->key . '/' . $version . '/doc';
  }

  public function getFirstTag(): string
  {
    return $this->tags[0] ?? '';
  }

  public function getUrl(): string
  {
    return '/product/' . $this->key;
  }
}
