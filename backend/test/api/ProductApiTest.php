<?php

namespace test\api;

use PHPUnit\Framework\TestCase;
use test\AppTester;

class ProductApiTest extends TestCase
{
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
}