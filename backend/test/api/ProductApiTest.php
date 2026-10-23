<?php

namespace test\api;

use PHPUnit\Framework\TestCase;
use test\AppTester;

class ProductApiTest extends TestCase
{
  private string $fixtureDirectory;
  private string|false $previousIndexFile;
  private string|false $previousCacheDirectory;

  protected function setUp(): void
  {
    $this->previousIndexFile = getenv('MARKET_INDEX_FILE');
    $this->previousCacheDirectory = getenv('MARKET_CACHE_DIR');
    $this->fixtureDirectory = sys_get_temp_dir() . '/market-api-' . bin2hex(random_bytes(8));
    $cacheDirectory = $this->fixtureDirectory . '/cache';
    $installDirectory = $cacheDirectory . '/a-trust/a-trust-product/2.0.0';
    mkdir($installDirectory, 0777, true);
    file_put_contents($this->fixtureDirectory . '/products.json', json_encode([
      'products' => [[
        'id' => 'a-trust',
        'versions' => ['2.0.0', '1.0.0', '1.0.0-SNAPSHOT'],
        'artifacts' => [[
          'name' => 'A-Trust Connector',
          'groupId' => 'com.axonivy.connector.atrust',
          'artifactId' => 'a-trust-connector',
          'type' => 'iar',
          'isProduct' => false,
          'versions' => [
            ['version' => '2.0.0', 'url' => 'https://maven.example/a-trust-2.0.0.iar'],
            ['version' => '1.0.0', 'url' => 'https://maven.example/a-trust-1.0.0.iar'],
            ['version' => '1.0.0-SNAPSHOT', 'url' => 'https://maven.example/a-trust-1.0.0-SNAPSHOT.iar'],
          ],
        ]],
        'installable' => [[
          'version' => '2.0.0',
          'url' => '/market-cache/a-trust/a-trust-product/2.0.0/_product.json',
        ]],
      ]],
    ], JSON_THROW_ON_ERROR));
    file_put_contents($installDirectory . '/_product.json', '{"version":"2.0.0","installers":[]}');
    putenv('MARKET_INDEX_FILE=' . $this->fixtureDirectory . '/products.json');
    putenv('MARKET_CACHE_DIR=' . $cacheDirectory);
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
    $this->restoreEnvironmentVariable('MARKET_INDEX_FILE', $this->previousIndexFile);
    $this->restoreEnvironmentVariable('MARKET_CACHE_DIR', $this->previousCacheDirectory);
    parent::tearDown();
  }

  public function testSearchesProductsByTypeKeywordAndLanguage(): void
  {
    AppTester::assertThatGet(
      '/api/product?type=connectors&keyword=trust&language=en'
    )
      ->ok()
      ->contentType('application/json; charset=utf-8')
      ->bodyContains('"id":"a-trust"')
      ->bodyContains('"names":{"en":"A-Trust"}')
      ->bodyDoesNotContain('"id":"aspose-email-demo"');
  }

  public function testRejectsUnknownProductType(): void
  {
    AppTester::assertThatGet('/api/product?type=unknown')
      ->statusCode(400)
      ->bodyContains('Invalid product type');
  }

  public function testListsArtifactVersionsAndDownloadUrls(): void
  {
    AppTester::assertThatGet('/api/product/a-trust/versions?isShowDevVersion=true')
      ->ok()
      ->bodyContains('"version":"1.0.0-SNAPSHOT"')
      ->bodyContains('"downloadUrl":"https://maven.example/a-trust-2.0.0.iar"')
      ->bodyContains('"additionalVersion":true');
  }

  public function testDesignerVersionHidesSnapshotsReplacedByARelease(): void
  {
    AppTester::assertThatGet('/api/product/a-trust/versions?designerVersion=1.0.0')
      ->ok()
      ->bodyContains('"version":"1.0.0"')
      ->bodyDoesNotContain('"version":"1.0.0-SNAPSHOT"');
  }

  public function testReturnsCachedInstallJson(): void
  {
    AppTester::assertThatGet('/api/product/a-trust/install?productVersion=2.0.0')
      ->ok()
      ->contentType('application/json; charset=utf-8')
      ->bodyContains('"version":"2.0.0"')
      ->bodyContains('"installers":[]');
  }

  public function testReturnsBestMatchingVersion(): void
  {
    AppTester::assertThatGet('/api/product-details/a-trust/2.0.0/bestmatch?isShowDevVersion=true')
      ->ok()
      ->bodyContains('"version":"2.0.0"');
  }

  public function testReturnsNotFoundForUnknownProductVersionRequest(): void
  {
    AppTester::assertThatGet('/api/product/missing/versions')
      ->statusCode(404)
      ->bodyContains('Product not found');
  }

  public function testServesProductLogo(): void
  {
    AppTester::assertThatGet('/api/image/a-trust')
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

  private function restoreEnvironmentVariable(string $name, string|false $value): void
  {
    if ($value === false) {
      putenv($name);
      return;
    }
    putenv($name . '=' . $value);
  }
}