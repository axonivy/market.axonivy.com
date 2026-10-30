<?php

namespace test\api;

use PHPUnit\Framework\TestCase;
use test\AppTester;

class CorsApiTest extends TestCase
{
  public function testAllowsAnyOrigin(): void
  {
    AppTester::assertThatRequest('GET', '/stable/api/status', [
      'Origin' => 'https://neo.example.org',
    ])
      ->ok()
      ->header('Access-Control-Allow-Origin', '*');
  }

  public function testHandlesPreflightFromAnyOrigin(): void
  {
    AppTester::assertThatRequest('OPTIONS', '/stable/api/product', [
      'Origin' => 'https://neo.example.org',
      'Access-Control-Request-Method' => 'GET',
      'Access-Control-Request-Headers' => 'content-type',
    ])
      ->statusCode(204)
      ->header('Access-Control-Allow-Origin', '*')
      ->header('Access-Control-Allow-Methods', 'GET, OPTIONS')
      ->header('Access-Control-Allow-Headers', 'content-type');
  }
}