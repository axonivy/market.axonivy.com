<?php

namespace app\domain\market;

class ProductFactory
{
  public static function create(string $key, string $pathMetaFile): Product
  {
    $content = file_get_contents($pathMetaFile);
    $json = json_decode($content);

    $listed = $json->listed ?? true;
    $type = $json->type ?? '';
    $tags = $json->tags ?? [];
    $shortDesc = $json->description ?? '';

    $vendor = $json->vendor ?? 'Axon Ivy AG';
    $vendorUrl = $json->vendorUrl ?? 'https://www.axonivy.com';

    $platformReview = $json->platformReview ?? '4.0';
    $cost = $json->cost ?? 'Free';
    $sourceUrl = $json->sourceUrl ?? '';
    $statusBadgeUrl = $json->statusBadgeUrl ?? '';
    $language = $json->language ?? '';
    $industry = $json->industry ?? '';
    $validate = $json->validate ?? false;
    $contactUs = $json->contactUs ?? false;

    return new Product($key, $json->name, $shortDesc, $listed, $type, $tags,
      $vendor, $vendorUrl, $platformReview, $cost, $sourceUrl, $statusBadgeUrl, $language, $industry, $validate, $contactUs);
  }
}
