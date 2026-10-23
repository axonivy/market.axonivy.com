<?php

namespace test\pages\internal;

use PHPUnit\Framework\TestCase;
use test\AppTester;

class MarketRCPTTTest extends TestCase
{
  public function testRender()
  {
    AppTester::assertThatGet('https://fakehost/internal/market-rcptt?designerVersion=9.2.0')
      ->ok()
      ->bodyContains('runTest "https://fakehost/market-cache/error-handling')
      ->bodyDoesNotContain('https://fakehost/market-cache/a-trust/a-trust-connector-product');
  }

  public function notFound()
  {
    AppTester::assertThatGet('/internal/market-rcptt')->notFound();
  }
}
