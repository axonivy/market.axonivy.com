<?php

namespace test\permalink;

use app\domain\market\Market;
use app\domain\market\VersionResolver;
use PHPUnit\Framework\Assert;
use PHPUnit\Framework\TestCase;
use test\AppTester;

class DocPermalinkActionTest extends TestCase
{
  public function testDoc()
  {
    $product = Market::getProductByKey('doc-factory');
    $version = VersionResolver::findNewestVersion($product->getMavenProductInfo(), "10.0");
    AppTester::assertThatGet('/doc-factory/10.0.0/doc')->redirect('/market-cache/doc-factory/doc-factory-doc/10.0.0');
    AppTester::assertThatGet('/doc-factory/10.0/doc')->redirect("/market-cache/doc-factory/doc-factory-doc/$version");
  }

  public function testDocWithDocument()
  {
    $product = Market::getProductByKey('doc-factory');
    $version = VersionResolver::findNewestVersion($product->getMavenProductInfo(), "10.0");
    AppTester::assertThatGet('/doc-factory/10.0.0/doc/test.html')->redirect('/market-cache/doc-factory/doc-factory-doc/10.0.0/test.html');
    AppTester::assertThatGet('/doc-factory/10.0/doc/test.html')->redirect("/market-cache/doc-factory/doc-factory-doc/$version/test.html");
  }

  public function testDocWithDocumentInSubfolder()
  {
    $product = Market::getProductByKey('doc-factory');
    $version = VersionResolver::findNewestVersion($product->getMavenProductInfo(), "10.0");
    AppTester::assertThatGet('/doc-factory/10.0.0/doc/subfolder/test.html')->redirect('/market-cache/doc-factory/doc-factory-doc/10.0.0/subfolder/test.html');
    AppTester::assertThatGet('/doc-factory/10.0/doc/subfolder/test.html')->redirect("/market-cache/doc-factory/doc-factory-doc/$version/subfolder/test.html");
  }
}
