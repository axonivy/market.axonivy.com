<?php

namespace test\api;

use app\Config;
use PHPUnit\Framework\TestCase;
use test\AppTester;

class ProductApiTest extends TestCase
{
  private string $fixtureDirectory;
  private string|false $previousMarketDir;

  protected function setUp(): void
  {
    $this->previousMarketDir = getenv('MARKET_DIR');
    $this->fixtureDirectory = sys_get_temp_dir() . '/market-api-' . bin2hex(random_bytes(8));
    $marketRoot = $this->fixtureDirectory . '/market';
    $productsDirectory = $marketRoot . '/meta-catalog/products';
    $cacheDirectory = $marketRoot . '/maven-products';
    mkdir($productsDirectory . '/a-trust', 0777, true);
    mkdir($productsDirectory . '/sample-solution', 0777, true);
    mkdir($productsDirectory . '/sample-utility', 0777, true);
    mkdir($productsDirectory . '/sample-utils', 0777, true);
    mkdir($cacheDirectory . '/a-trust/a-trust-product/2.0.0', 0777, true);
    file_put_contents($productsDirectory . '/a-trust/meta.json', json_encode([
      'name' => 'A-Trust',
      'names' => [['locale' => 'en', 'value' => 'A-Trust']],
      'descriptions' => [['locale' => 'en', 'value' => 'Test connector']],
      'type' => 'connector',
      'listed' => true,
    ], JSON_THROW_ON_ERROR));
    file_put_contents($productsDirectory . '/sample-solution/meta.json', json_encode([
      'name' => 'Sample Solution',
      'names' => [['locale' => 'en', 'value' => 'Sample Solution']],
      'descriptions' => [['locale' => 'en', 'value' => 'Test solution']],
      'type' => 'solution',
      'listed' => true,
    ], JSON_THROW_ON_ERROR));
    foreach (['sample-utility' => 'util', 'sample-utils' => 'utils'] as $id => $type) {
      file_put_contents($productsDirectory . '/' . $id . '/meta.json', json_encode([
        'name' => $id,
        'type' => $type,
        'listed' => true,
      ], JSON_THROW_ON_ERROR));
    }
    $logoFixture = dirname(__DIR__, 2) . '/src/web/favicon.png';
    copy($logoFixture, $productsDirectory . '/a-trust/logo.png');
    copy($logoFixture, $productsDirectory . '/a-trust/logo-dark.png');
    file_put_contents($marketRoot . '/product-index.json', json_encode([
      'products' => [[
        'id' => 'a-trust',
        'versions' => ['2.9.0', '2.0.0', '1.0.0', '1.0.0-SNAPSHOT', '3.0.0-SNAPSHOT'],
        'artifacts' => [[
          'name' => 'A-Trust Connector',
          'groupId' => 'com.axonivy.connector.atrust',
          'artifactId' => 'a-trust-connector',
          'type' => 'iar',
          'isProduct' => false,
          'versions' => [
            ['version' => '2.9.0', 'url' => 'https://maven.example/a-trust-2.9.0.iar'],
            ['version' => '2.0.0', 'url' => 'https://maven.example/a-trust-2.0.0.iar'],
            ['version' => '1.0.0', 'url' => 'https://maven.example/a-trust-1.0.0.iar'],
            ['version' => '1.0.0-SNAPSHOT', 'url' => 'https://maven.example/a-trust-1.0.0-SNAPSHOT.iar'],
            ['version' => '3.0.0-SNAPSHOT', 'url' => 'https://maven.example/a-trust-3.0.0-SNAPSHOT.iar'],
          ],
        ]],
        'installable' => [[
          'version' => '2.0.0',
          'url' => '/maven-products/a-trust/a-trust-product/2.0.0/_product.json',
        ]],
      ], [
        'id' => 'snapshot-only',
        'versions' => ['0.9.0-SNAPSHOT'],
        'artifacts' => [[
          'name' => 'Snapshot Only Product',
          'groupId' => 'com.axonivy.demo',
          'artifactId' => 'snapshot-only-product',
          'type' => 'zip',
          'isProduct' => true,
          'versions' => [[
            'version' => '0.9.0-SNAPSHOT',
            'url' => 'https://maven.example/snapshot-only-0.9.0-SNAPSHOT.zip',
          ]],
        ]],
        'installable' => [],
      ]],
    ], JSON_THROW_ON_ERROR));
    file_put_contents($cacheDirectory . '/a-trust/a-trust-product/2.0.0/_product.json', '{"version":"2.0.0","installers":[]}');
    putenv('MARKET_DIR=' . $marketRoot);
  }

  protected function tearDown(): void
  {
    $iterator = new \RecursiveIteratorIterator(
      new \RecursiveDirectoryIterator($this->fixtureDirectory, \FilesystemIterator::SKIP_DOTS),
      \RecursiveIteratorIterator::CHILD_FIRST
    );
    foreach ($iterator as $entry) {
      $entry->isDir() ? rmdir($entry->getPathname()) : unlink($entry->getPathname());
    }
    rmdir($this->fixtureDirectory);
    $this->restoreEnvironmentVariable('MARKET_DIR', $this->previousMarketDir);
    parent::tearDown();
  }

  public function testSearchesProductsByTypeKeywordAndLanguage(): void
  {
    AppTester::assertThatGet(
      'https://market.example/stable/api/product?type=connectors&keyword=trust&language=en'
    )
      ->ok()
      ->contentType('application/json; charset=utf-8')
      ->bodyContains('"id":"a-trust"')
      ->bodyContains('"names":{"en":"A-Trust"}')
      ->bodyContains('"logoUrl":"https://market.example/stable/api/image/a-trust"')
      ->bodyContains('"logoDarkUrl":"https://market.example/stable/api/image/a-trust-dark"')
      ->bodyDoesNotContain('"id":"aspose-email-demo"');
  }

  public function testFiltersSolutionProducts(): void
  {
    AppTester::assertThatGet('/stable/api/product?type=solutions')
      ->ok()
      ->bodyContains('"id":"sample-solution"')
      ->bodyDoesNotContain('"id":"a-trust"');
  }

  public function testFiltersUtilitiesUsingV2AndV3MetadataTypes(): void
  {
    AppTester::assertThatGet('/stable/api/product?type=utilities')
      ->ok()
      ->bodyContains('"id":"sample-utility"')
      ->bodyContains('"id":"sample-utils"')
      ->bodyDoesNotContain('"id":"sample-solution"');
  }

  public function testRejectsUnknownProductType(): void
  {
    AppTester::assertThatGet('/stable/api/product?type=unknown')
      ->statusCode(400)
      ->bodyContains('Invalid product type');
  }

  public function testListsArtifactVersionsAndDownloadUrls(): void
  {
    AppTester::assertThatGet('/stable/api/product/a-trust/versions?isShowDevVersion=true')
      ->ok()
      ->bodyContains('"version":"3.0.0-SNAPSHOT"')
      ->bodyDoesNotContain('"version":"1.0.0-SNAPSHOT"')
      ->bodyContains('"downloadUrl":"https://maven.example/a-trust-2.0.0.iar"')
      ->bodyContains('"additionalVersion":true');
  }

  public function testDesignerVersionDoesNotChangeDevVersionFiltering(): void
  {
    AppTester::assertThatGet('/stable/api/product/a-trust/versions?designerVersion=1.0.0&isShowDevVersion=true')
      ->ok()
      ->bodyContains('"version":"3.0.0-SNAPSHOT"')
      ->bodyDoesNotContain('"version":"1.0.0-SNAPSHOT"');
  }

  public function testShowsDevVersionsByDefaultWhenNoReleaseExists(): void
  {
    AppTester::assertThatGet('/stable/api/product/snapshot-only/versions')
      ->ok()
      ->bodyContains('"version":"0.9.0-SNAPSHOT"')
      ->bodyContains('"downloadUrl":"https://maven.example/snapshot-only-0.9.0-SNAPSHOT.zip"');
  }

  public function testReturnsCachedInstallJson(): void
  {
    AppTester::assertThatGet('/stable/api/product/a-trust/install?productVersion=2.0.0')
      ->ok()
      ->contentType('application/json; charset=utf-8')
      ->bodyContains('"version":"2.0.0"')
      ->bodyContains('"installers":[]');
  }

  public function testInstallRequiresAProductVersion(): void
  {
    AppTester::assertThatGet('/stable/api/product/a-trust/install')
      ->statusCode(404)
      ->bodyContains('Product version is required');
  }

  public function testReturnsBestMatchingVersion(): void
  {
    AppTester::assertThatGet('/stable/api/product-details/a-trust/2.0.0/bestmatch?isShowDevVersion=true')
      ->ok()
      ->bodyContains('"version":"2.9.0"');
  }

  public function testBestMatchReturnsNotFoundWithoutSameMajorVersion(): void
  {
    AppTester::assertThatGet('/stable/api/product-details/a-trust/4.0.0/bestmatch')
      ->statusCode(404)
      ->bodyContains('Cannot find version: 4.0.0');
  }

  public function testBestMatchDoesNotFallBackToDevVersionsWhenNoReleaseExists(): void
  {
    AppTester::assertThatGet('/stable/api/product-details/snapshot-only/0.9.0/bestmatch')
      ->statusCode(404)
      ->bodyContains('No matching version found');
  }

  public function testReturnsNotFoundForUnknownProductVersionRequest(): void
  {
    AppTester::assertThatGet('/stable/api/product/missing/versions')
      ->statusCode(404)
      ->bodyContains('Product not found');
  }

  public function testServesProductLogo(): void
  {
    AppTester::assertThatGet('/stable/api/image/a-trust')
      ->ok()
      ->contentType('image/png');
  }

  public function testUnknownRouteReturnsJsonNotFound(): void
  {
    AppTester::assertThatGet('/')
      ->notFound()
      ->contentType('application/json; charset=utf-8')
      ->bodyContains('Not found.');
  }

  public function testServesOpenApiContractForAllStableApiRoutes(): void
  {
    $body = AppTester::assertThatGet('/stable/openapi.json')
      ->ok()
      ->contentType('application/json; charset=utf-8')
      ->getBody();
    $contract = json_decode($body, true, flags: JSON_THROW_ON_ERROR);

    self::assertSame('3.1.0', $contract['openapi']);
    self::assertSame('/stable', $contract['servers'][0]['url']);
    self::assertArrayHasKey('/api/product', $contract['paths']);
    self::assertArrayHasKey('/api/product/{id}/versions', $contract['paths']);
    self::assertArrayHasKey('/api/product/{id}/install', $contract['paths']);
    self::assertArrayHasKey('/api/product-details/{id}/{version}/bestmatch', $contract['paths']);
    self::assertArrayHasKey('/api/image/{id}', $contract['paths']);

  }

  private function restoreEnvironmentVariable(string $name, string|false $value): void
  {
    if ($value === false) {
      putenv($name);
      return;
    }
    putenv($name . '=' . $value);
  }
}