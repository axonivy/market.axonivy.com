<?php

namespace test\pages\market;

use PHPUnit\Framework\TestCase;
use test\AppTester;

class SitemapActionTest extends TestCase
{

  public function testSitemap()
  {
    AppTester::assertThatGet('/sitemap.xml')
      ->ok()
      ->bodyContains('/doc-factory');
  }
}
