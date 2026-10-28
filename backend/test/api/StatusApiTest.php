<?php

namespace test\api;

use PHPUnit\Framework\TestCase;
use test\AppTester;

class StatusApiTest extends TestCase
{
  public function testStatus()
  {
    AppTester::assertThatGet('/stable/api/status')
      ->statusCode(200)
      ->bodyContains('phpVersion')
      ->bodyContains('market')
      ->bodyContains('DocFactory');
  }
}
