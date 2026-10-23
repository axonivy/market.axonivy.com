<?php

namespace app\api;

use app\Config;
use app\domain\market\Market;
use app\domain\market\Product;

class ProductApi
{
  public function getProducts($request, $response, $args)
  {
    $query = $request->getQueryParams();
    $typeValue = $query['type'] ?? 'all';
    $type = is_string($typeValue) ? strtolower($typeValue) : '';
    $types = [
      'all' => null,
      'connectors' => ['connector'],
      'utilities' => ['utils', 'utility', 'utilities'],
      'demos' => ['demo', 'demos'],
    ];

    if (!array_key_exists($type, $types)) {
      return $this->json($response, ['message' => 'Invalid product type'], 400);
    }

    $keywordValue = $query['keyword'] ?? '';
    $keyword = is_string($keywordValue) ? trim($keywordValue) : '';
    $languageValue = $query['language'] ?? '';
    $language = is_string($languageValue) ? strtolower($languageValue) : '';
    $products = [];

    foreach (Market::listed() as $product) {
      $meta = $this->metadata($product);
      $productType = strtolower((string) ($meta['type'] ?? ''));
      if ($types[$type] !== null && !in_array($productType, $types[$type], true)) {
        continue;
      }

      $model = $this->productModel($product, $meta, $language);
      if ($keyword !== '' && !$this->matchesKeyword($model, $keyword)) {
        continue;
      }
      $products[] = $model;
    }

    return $this->json($response, $products);
  }

  private function metadata(Product $product): array
  {
    $path = Config::marketDirectory() . '/' . $product->getKey() . '/meta.json';
    $metadata = json_decode((string) file_get_contents($path), true);
    return is_array($metadata) ? $metadata : [];
  }

  private function productModel(Product $product, array $meta, string $language): array
  {
    $key = $product->getKey();
    $directory = Config::marketDirectory() . '/' . $key;
    $names = $this->localizedValues($meta['names'] ?? [], $meta['name'] ?? $key);
    $descriptions = $this->localizedValues(
      $meta['descriptions'] ?? [],
      $meta['description'] ?? ''
    );
    if ($language !== '') {
      $names = array_intersect_key($names, [$language => true]);
      $descriptions = array_intersect_key($descriptions, [$language => true]);
    }

    $model = [
      'id' => $key,
      'names' => $names,
      'shortDescriptions' => $descriptions,
      'type' => $meta['type'] ?? '',
      'tags' => $meta['tags'] ?? [],
      'marketDirectory' => 'market/' . ($meta['type'] ?? '') . '/' . $key . '/',
      'deprecated' => (bool) ($meta['deprecated'] ?? false),
      'internal' => (bool) ($meta['internal'] ?? false),
    ];

    if (is_file($directory . '/logo.png')) {
      $model['logoUrl'] = '/api/image/' . rawurlencode($key);
    }
    if (is_file($directory . '/logo-dark.png')) {
      $model['logoDarkUrl'] = '/api/image/' . rawurlencode($key . '-dark');
    }
    if (!empty($meta['statusBadgeUrl'])) {
      $model['badgeUrl'] = $meta['statusBadgeUrl'];
    }
    if (!empty($meta['statusBadgeDarkUrl'])) {
      $model['badgeDarkUrl'] = $meta['statusBadgeDarkUrl'];
    }

    return $model;
  }

  private function localizedValues(array $values, string $fallback): array
  {
    $localized = [];
    foreach ($values as $value) {
      if (isset($value['locale'], $value['value'])) {
        $localized[$value['locale']] = $value['value'];
      }
    }
    return $localized !== [] ? $localized : ['en' => $fallback];
  }

  private function matchesKeyword(array $product, string $keyword): bool
  {
    foreach (['names', 'shortDescriptions'] as $field) {
      foreach ($product[$field] as $value) {
        if (stripos($value, $keyword) !== false) {
          return true;
        }
      }
    }
    return false;
  }

  private function json($response, array $data, int $status = 200)
  {
    $response->getBody()->write(json_encode(
      $data,
      JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR
    ));
    return $response
      ->withStatus($status)
      ->withHeader('Content-Type', 'application/json; charset=utf-8');
  }
}