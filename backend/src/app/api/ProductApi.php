<?php

namespace app\api;

use app\Config;
use app\domain\market\Market;
use app\domain\market\Product;
use OpenApi\Attributes as OA;
use Psr\Http\Message\UriInterface;

class ProductApi
{
  #[OA\Get(
    path: '/api/product',
    operationId: 'findProducts',
    summary: 'Search products by type, keyword, and language',
    tags: ['Product Controller'],
    parameters: [
      new OA\Parameter(
        name: 'type',
        in: 'query',
        required: false,
        schema: new OA\Schema(type: 'string', enum: ['all', 'connectors', 'utilities', 'solutions', 'demos'], default: 'all')
      ),
      new OA\Parameter(name: 'keyword', in: 'query', required: false, schema: new OA\Schema(type: 'string')),
      new OA\Parameter(
        name: 'language',
        in: 'query',
        required: false,
        schema: new OA\Schema(type: 'string', enum: ['en', 'de'])
      ),
    ],
    responses: [
      new OA\Response(
        response: 200,
        description: 'Matching products',
        content: new OA\JsonContent(type: 'array', items: new OA\Items(ref: '#/components/schemas/ProductModel'))
      ),
      new OA\Response(response: 400, description: 'Invalid filter', content: new OA\JsonContent(ref: '#/components/schemas/ErrorResponse')),
    ]
  )]
  public function getProducts($request, $response, $args)
  {
    $query = $request->getQueryParams();
    $typeValue = $query['type'] ?? 'all';
    $type = is_string($typeValue) ? strtolower($typeValue) : '';
    $types = [
      'all' => null,
      'connectors' => ['connector'],
      'utilities' => ['util', 'utils', 'utility', 'utilities'],
      'solutions' => ['solution'],
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

      $model = $this->productModel($product, $meta, $language, $request->getUri());
      if ($keyword !== '' && !$this->matchesKeyword($model, $keyword)) {
        continue;
      }
      $products[] = $model;
    }

    return $this->json($response, $products);
  }

  #[OA\Get(
    path: '/api/product/{id}/versions',
    operationId: 'findProductVersionsById',
    summary: 'Get product versions and artifact download URLs',
    tags: ['Product Controller'],
    parameters: [
      new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'string')),
      new OA\Parameter(name: 'isShowDevVersion', in: 'query', required: false, schema: new OA\Schema(type: 'boolean', default: false)),
      new OA\Parameter(
        name: 'designerVersion',
        in: 'query',
        required: false,
        description: 'Accepted for compatibility; currently does not change the returned versions.',
        schema: new OA\Schema(type: 'string')
      ),
    ],
    responses: [
      new OA\Response(
        response: 200,
        description: 'Product versions and artifacts',
        content: new OA\JsonContent(type: 'array', items: new OA\Items(ref: '#/components/schemas/MavenArtifactVersionModel'))
      ),
      new OA\Response(response: 404, description: 'Product not found', content: new OA\JsonContent(ref: '#/components/schemas/ErrorResponse')),
      new OA\Response(response: 503, description: 'Market index is unavailable', content: new OA\JsonContent(ref: '#/components/schemas/ErrorResponse')),
    ]
  )]
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
    $versions = $this->displayVersions(
      $product['versions'] ?? [],
      $showDevVersions,
      true
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

  #[OA\Get(
    path: '/api/product/{id}/install',
    operationId: 'findProductJsonContent',
    summary: 'Get product JSON content for installation',
    tags: ['Product Controller'],
    parameters: [
      new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'string')),
      new OA\Parameter(
        name: 'productVersion',
        in: 'query',
        required: false,
        description: 'The version is required for a successful response; omitting it returns 404.',
        schema: new OA\Schema(type: 'string')
      ),
    ],
    responses: [
      new OA\Response(
        response: 200,
        description: 'Install descriptor',
        content: new OA\JsonContent(ref: '#/components/schemas/InstallContent')
      ),
      new OA\Response(response: 404, description: 'Product, version, or install descriptor not found', content: new OA\JsonContent(ref: '#/components/schemas/ErrorResponse')),
      new OA\Response(response: 503, description: 'Market index is unavailable', content: new OA\JsonContent(ref: '#/components/schemas/ErrorResponse')),
    ]
  )]
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
    if ($requestedVersion === '') {
      return $this->json($response, ['message' => 'Product version is required'], 404);
    }
    $installables = $product['installable'] ?? [];
    $installable = null;
    foreach ($installables as $candidate) {
      if (($candidate['version'] ?? '') === $requestedVersion) {
        $installable = $candidate;
        break;
      }
    }
    if ($installable === null) {
      return $this->json($response, ['message' => 'Installable version not found'], 404);
    }

    $url = $installable['url'] ?? '';
    $prefix = '/maven-products/';
    if (!is_string($url) || !str_starts_with($url, $prefix)) {
      return $this->json($response, ['message' => 'Install artifact not found'], 404);
    }
    $cacheDirectory = realpath(Config::mavenProductInstallers());
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

  #[OA\Get(
    path: '/api/product-details/{id}/{version}/bestmatch',
    operationId: 'findBestMatchProductDetailsByVersion',
    summary: 'Find the first available version in the requested major line',
    tags: ['Product Details Controller'],
    parameters: [
      new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'string')),
      new OA\Parameter(name: 'version', in: 'path', required: true, schema: new OA\Schema(type: 'string')),
      new OA\Parameter(name: 'isShowDevVersion', in: 'query', required: false, schema: new OA\Schema(type: 'boolean', default: false)),
    ],
    responses: [
      new OA\Response(
        response: 200,
        description: 'Best matching version',
        content: new OA\JsonContent(ref: '#/components/schemas/BestMatchVersion')
      ),
      new OA\Response(response: 404, description: 'Product or matching version not found', content: new OA\JsonContent(ref: '#/components/schemas/ErrorResponse')),
      new OA\Response(response: 503, description: 'Market index is unavailable', content: new OA\JsonContent(ref: '#/components/schemas/ErrorResponse')),
    ]
  )]
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
      $this->booleanQuery($query['isShowDevVersion'] ?? false)
    );
    if ($versions === []) {
      return $this->json($response, ['message' => 'No matching version found'], 404);
    }

    $requestedVersion = (string) ($args['version'] ?? '');
    $targetMajor = explode('.', $requestedVersion, 2)[0];
    foreach ($versions as $version) {
      if (explode('.', $version, 2)[0] === $targetMajor) {
        return $this->json($response, ['version' => $version]);
      }
    }
    return $this->json($response, ['message' => "Cannot find version: $requestedVersion"], 404);
  }

  #[OA\Get(
    path: '/api/image/{id}',
    operationId: 'findImageById',
    summary: 'Get product logo image',
    tags: ['Image Controller'],
    parameters: [
      new OA\Parameter(
        name: 'id',
        in: 'path',
        required: true,
        description: 'Product id, optionally suffixed with -dark for the dark logo.',
        schema: new OA\Schema(type: 'string')
      ),
    ],
    responses: [
      new OA\Response(response: 200, description: 'PNG logo', content: new OA\MediaType(mediaType: 'image/png', schema: new OA\Schema(type: 'string', format: 'binary'))),
      new OA\Response(response: 404, description: 'Logo not found', content: new OA\JsonContent(ref: '#/components/schemas/ErrorResponse')),
    ]
  )]
  public function getImage($request, $response, array $args)
  {
    $imageId = (string) ($args['id'] ?? '');
    $dark = str_ends_with($imageId, '-dark');
    $key = $dark ? substr($imageId, 0, -5) : $imageId;
    if ($key === '' || Market::getProductByKey($key) === null) {
      return $this->json($response, ['message' => 'Image not found'], 404);
    }

    $imagePath = Config::metaCatalog() . '/' . $key . ($dark ? '/logo-dark.png' : '/logo.png');
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
    $path = Config::metaCatalog() . '/' . $product->getKey() . '/meta.json';
    $metadata = json_decode((string) file_get_contents($path), true);
    return is_array($metadata) ? $metadata : [];
  }

  private function productModel(Product $product, array $meta, string $language, UriInterface $requestUri): array
  {
    $key = $product->getKey();
    $directory = Config::metaCatalog() . '/' . $key;
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
      $model['logoUrl'] = (string) $requestUri
        ->withPath('/stable/api/image/' . rawurlencode($key))
        ->withQuery('')
        ->withFragment('');
    }
    if (is_file($directory . '/logo-dark.png')) {
      $model['logoDarkUrl'] = (string) $requestUri
        ->withPath('/stable/api/image/' . rawurlencode($key . '-dark'))
        ->withQuery('')
        ->withFragment('');
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

  private function displayVersions(
    array $versions,
    bool $showDevVersions,
    bool $fallbackToDevVersions = false
  ): array
  {
    $releasedBugfixes = [];
    foreach ($versions as $version) {
      if ($this->isReleasedVersion($version)) {
        $releasedBugfixes[] = $this->bugfixVersion($version);
      }
    }
    $displayable = array_values(array_filter(
      array_unique($versions),
      fn($version) => $this->isReleasedVersion($version) || (
        $showDevVersions &&
        $this->isValidDevVersion($version) &&
        !in_array($this->bugfixVersion($version), $releasedBugfixes, true)
      )
    ));
    if (!$showDevVersions && $fallbackToDevVersions && $displayable === []) {
      return $this->displayVersions($versions, true);
    }
    return $displayable;
  }

  private function isDevVersion(string $version): bool
  {
    return str_contains($version, '-');
  }

  private function isReleasedVersion(string $version): bool
  {
    return !$this->isDevVersion($version) && preg_match('/^\d+(?:\.\d+)*$/', $version) === 1;
  }

  private function isValidDevVersion(string $version): bool
  {
    $baseVersion = explode('-', $version, 2)[0];
    return $this->isDevVersion($version) && preg_match('/^\d+(?:\.\d+)*$/', $baseVersion) === 1;
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