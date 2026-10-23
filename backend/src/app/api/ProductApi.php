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
    if ($language !== '' && !in_array($language, ['en', 'de'], true)) {
      return $this->json($response, ['message' => 'Invalid language'], 400);
    }
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

  public function getVersions($request, $response, array $args)
  {
    $index = $this->marketIndex();
    if ($index === null) {
      return $this->json($response, ['message' => 'Market index is not available'], 503);
    }
    $product = $this->indexedProduct($index, $args['id'] ?? '');
    if ($product === null) {
      return $this->json($response, ['message' => 'Product not found'], 404);
    }

    $query = $request->getQueryParams();
    $showDevVersions = $this->booleanQuery($query['isShowDevVersion'] ?? false);
    $designerVersion = $query['designerVersion'] ?? '';
    $designerVersion = is_string($designerVersion) ? $designerVersion : '';
    $versions = $this->displayVersions(
      $product['versions'] ?? [],
      $showDevVersions,
      $designerVersion
    );
    $result = [];

    foreach ($versions as $version) {
      $artifacts = [];
      foreach ($product['artifacts'] ?? [] as $artifact) {
        foreach ($artifact['versions'] ?? [] as $artifactVersion) {
          if (($artifactVersion['version'] ?? null) !== $version) {
            continue;
          }
          $artifactId = $artifact['artifactId'] ?? '';
          $extension = $artifact['type'] ?? 'iar';
          $artifactName = $artifact['name'] ?? $artifactId;
          $artifacts[] = [
            'id' => [
              'artifactId' => $artifactId,
              'productVersion' => $version,
              'additionalVersion' => !($artifact['isProduct'] ?? false),
            ],
            'name' => $artifactName . ' (.' . $extension . ')',
            'downloadUrl' => $artifactVersion['url'] ?? '',
            'groupId' => $artifact['groupId'] ?? '',
            'productId' => $product['id'],
            'invalidArtifact' => false,
          ];
        }
      }
      $result[] = ['version' => $version, 'artifactsByVersion' => $artifacts];
    }

    return $this->json($response, $result);
  }

  public function getInstall($request, $response, array $args)
  {
    $index = $this->marketIndex();
    if ($index === null) {
      return $this->json($response, ['message' => 'Market index is not available'], 503);
    }
    $product = $this->indexedProduct($index, $args['id'] ?? '');
    if ($product === null) {
      return $this->json($response, ['message' => 'Product not found'], 404);
    }

    $query = $request->getQueryParams();
    $requestedVersion = $query['productVersion'] ?? '';
    $requestedVersion = is_string($requestedVersion) ? $requestedVersion : '';
    $installables = $product['installable'] ?? [];
    $installable = null;
    foreach ($installables as $candidate) {
      if ($requestedVersion === '' || ($candidate['version'] ?? '') === $requestedVersion) {
        $installable = $candidate;
        break;
      }
    }
    if ($installable === null) {
      return $this->json($response, ['message' => 'Installable version not found'], 404);
    }

    $url = $installable['url'] ?? '';
    $prefix = '/market-cache/';
    if (!is_string($url) || !str_starts_with($url, $prefix)) {
      return $this->json($response, ['message' => 'Install artifact not found'], 404);
    }
    $cacheDirectory = realpath(Config::marketCacheDirectory());
    $installFile = $cacheDirectory === false
      ? false
      : realpath($cacheDirectory . '/' . substr($url, strlen($prefix)));
    if (
      $installFile === false ||
      !str_starts_with($installFile, $cacheDirectory . DIRECTORY_SEPARATOR) ||
      !is_file($installFile)
    ) {
      return $this->json($response, ['message' => 'Install artifact not found'], 404);
    }

    $content = json_decode((string) file_get_contents($installFile), true);
    if (!is_array($content)) {
      return $this->json($response, ['message' => 'Install artifact is invalid'], 502);
    }
    return $this->json($response, $content);
  }

  public function getBestMatch($request, $response, array $args)
  {
    $index = $this->marketIndex();
    if ($index === null) {
      return $this->json($response, ['message' => 'Market index is not available'], 503);
    }
    $product = $this->indexedProduct($index, $args['id'] ?? '');
    if ($product === null) {
      return $this->json($response, ['message' => 'Product not found'], 404);
    }

    $query = $request->getQueryParams();
    $versions = $this->displayVersions(
      $product['versions'] ?? [],
      $this->booleanQuery($query['isShowDevVersion'] ?? false),
      ''
    );
    if ($versions === []) {
      return $this->json($response, ['message' => 'No matching version found'], 404);
    }

    $requestedVersion = (string) ($args['version'] ?? '');
    if (in_array($requestedVersion, $versions, true)) {
      return $this->json($response, ['version' => $requestedVersion]);
    }
    $prefix = $this->minorVersionPrefix($requestedVersion);
    if ($prefix !== '') {
      foreach ($versions as $version) {
        if (
          str_starts_with($version, $prefix) &&
          version_compare($version, $requestedVersion, '<')
        ) {
          return $this->json($response, ['version' => $version]);
        }
      }
    }
    return $this->json($response, ['version' => $versions[0]]);
  }

  public function getImage($request, $response, array $args)
  {
    $imageId = (string) ($args['id'] ?? '');
    $dark = str_ends_with($imageId, '-dark');
    $key = $dark ? substr($imageId, 0, -5) : $imageId;
    if ($key === '' || Market::getProductByKey($key) === null) {
      return $this->json($response, ['message' => 'Image not found'], 404);
    }

    $imagePath = Config::marketDirectory() . '/' . $key . ($dark ? '/logo-dark.png' : '/logo.png');
    if (!is_file($imagePath)) {
      return $this->json($response, ['message' => 'Image not found'], 404);
    }
    $response->getBody()->write((string) file_get_contents($imagePath));
    return $response
      ->withHeader('Content-Type', mime_content_type($imagePath) ?: 'image/png')
      ->withHeader('Cache-Control', 'public, max-age=86400');
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

  private function marketIndex(): ?array
  {
    $indexFile = Config::marketIndexFile();
    if ($indexFile === '' || !is_file($indexFile)) {
      return null;
    }
    $index = json_decode((string) file_get_contents($indexFile), true);
    return is_array($index) && is_array($index['products'] ?? null) ? $index : null;
  }

  private function indexedProduct(array $index, string $id): ?array
  {
    foreach ($index['products'] as $product) {
      if (($product['id'] ?? null) === $id) {
        return $product;
      }
    }
    return null;
  }

  private function displayVersions(array $versions, bool $showDevVersions, string $designerVersion): array
  {
    if ($showDevVersions) {
      return array_values($versions);
    }
    $prefix = $this->minorVersionPrefix($designerVersion);
    $displayable = array_values(array_filter(
      $versions,
      fn($version) => !$this->isDevVersion($version) || ($prefix !== '' && str_starts_with($version, $prefix))
    ));
    if ($prefix === '') {
      return $displayable;
    }

    $releasedBugfixes = [];
    foreach ($displayable as $version) {
      if (!$this->isDevVersion($version)) {
        $releasedBugfixes[] = $this->bugfixVersion($version);
      }
    }
    return array_values(array_filter(
      $displayable,
      fn($version) => !$this->isDevVersion($version) || !in_array($this->bugfixVersion($version), $releasedBugfixes, true)
    ));
  }

  private function isDevVersion(string $version): bool
  {
    return str_contains($version, '-SNAPSHOT') || str_contains($version, '-m');
  }

  private function minorVersionPrefix(string $version): string
  {
    if (!preg_match('/^(\d+\.\d+)/', $version, $matches)) {
      return '';
    }
    return $matches[1];
  }

  private function bugfixVersion(string $version): string
  {
    $baseVersion = explode('-', $version, 2)[0];
    return implode('.', array_slice(explode('.', $baseVersion), 0, 3));
  }

  private function booleanQuery($value): bool
  {
    return is_string($value) && filter_var($value, FILTER_VALIDATE_BOOLEAN);
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