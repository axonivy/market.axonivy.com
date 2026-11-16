<?php

namespace test\api;

use app\Config;
use PHPUnit\Framework\TestCase;
use test\AppTester;

class ProductApiSizeTest extends TestCase
{
  public function testProductListJsonResponseFitsClientLimit(): void
  {
    $catalog = glob(Config::metaCatalog() . '/*/meta.json');
    if ($catalog === false || $catalog === []) {
      self::markTestSkipped('The local product catalog is required for this integration test.');
    }

    $body = AppTester::assertThatGet('/stable/api/product')
      ->ok()
      ->contentType('application/json; charset=utf-8')
      ->getBody();
    $products = json_decode($body, true, flags: JSON_THROW_ON_ERROR);
    self::assertIsArray($products);
    $jsonLength = preg_match_all('/./us', $body);
    if ($jsonLength === false) {
      self::fail('Could not measure the product list JSON response length.');
    }

    $maxClientFetchSize = 60_000;
    fwrite(STDOUT, sprintf(
      "Product API response: %d characters across %d products (limit: %d)\n",
      $jsonLength,
      count($products),
      $maxClientFetchSize
    ));

    self::assertLessThanOrEqual(
      $maxClientFetchSize,
      $jsonLength,
      "Product list JSON response size ({$jsonLength} characters) exceeds the client fetch limit of {$maxClientFetchSize}."
    );
  }
}
