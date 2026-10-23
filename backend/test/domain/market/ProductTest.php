<?php

namespace test\domain\market;

use PHPUnit\Framework\Assert;
use PHPUnit\Framework\TestCase;
use app\Config;
use app\domain\market\Market;
use app\domain\market\MarketInstallCounter;
use app\domain\market\ProductFactory;

class ProductTest extends TestCase
{

  public function test_listed()
  {
    $product = Market::getProductByKey('visualvm-plugin');
    Assert::assertTrue($product->isListed());

    $product = Market::getProductByKey('basic-workflow-ui');
    Assert::assertFalse($product->isListed());
  }

  public function test_name()
  {
    $product = Market::getProductByKey('visualvm-plugin');
    Assert::assertEquals('VisualVM Plugin', $product->getName());
  }

  public function test_url()
  {
    $product = Market::getProductByKey('visualvm-plugin');
    Assert::assertEquals('/visualvm-plugin', $product->getUrl());
  }

  public function test_vendor()
  {
    $product = Market::getProductByKey('visualvm-plugin');
    Assert::assertEquals('Axon Ivy AG', $product->getVendor());

    $product = Market::getProductByKey('jira');
    Assert::assertEquals('FROX AG', $product->getVendor());
  }

  public function test_vendorImage()
  {
    $product = Market::getProductByKey('visualvm-plugin');
    Assert::assertEquals('/images/misc/axonivy-logo-black.svg', $product->getVendorImage());

    $product = Market::getProductByKey('jira');
    Assert::assertEquals('/_market/jira/frox.png', $product->getVendorImage());
  }

  public function test_vendorUrl()
  {
    $product = Market::getProductByKey('visualvm-plugin');
    Assert::assertEquals('https://www.axonivy.com', $product->getVendorUrl());

    $product = Market::getProductByKey('jira');
    Assert::assertEquals('https://www.frox.ch', $product->getVendorUrl());
  }

  public function test_productJsonUrl()
  {
    $product = Market::getProductByKey('genderize-io-connector');
    Assert::assertEquals('/market-cache/genderize-io-connector/genderize-io-connector-product/9.1.0/_product.json', $product->getProductJsonUrl('9.1.0'));
  }

  public function test_installable()
  {
    $product = Market::getProductByKey('visualvm-plugin');
    Assert::assertFalse($product->isInstallable($product->getVersion()[0]));
  }

  public function test_compatibility()
  {
    $product = Market::getProductByKey('visualvm-plugin');
    Assert::assertEquals('7.0+', $product->getCompatibility());

    $product = Market::getProductByKey('genderize-io-connector');
    Assert::assertEquals('9.2+', $product->getCompatibility());
  }

  public function test_contactUs()
  {
    $product = Market::getProductByKey('visualvm-plugin');
    Assert::assertFalse($product->isContactUs());

    $product = Market::getProductByKey('employee-onboarding');
    Assert::assertTrue($product->isContactUs());
  }

  public function test_getInTouchLInk()
  {
    $product = Market::getProductByKey('employee-onboarding');
    Assert::assertEquals('https://www.axonivy.com/marketplace/contact/?market_solutions=employee-onboarding', $product->getInTouchLink());
  }

  public function test_type()
  {
    $product = Market::getProductByKey('visualvm-plugin');
    Assert::assertEquals('utils', $product->getType());

    $product = Market::getProductByKey('demos-app');
    Assert::assertEquals('demo', $product->getType());

    $product = self::getMicrosoftTodoProduct();
    Assert::assertEquals('connector', $product->getType());
  }

  public function test_tags()
  {
    $product = Market::getProductByKey('visualvm-plugin');
    Assert::assertEquals(['monitoring'], $product->getTags());

    $product = self::getMicrosoftTodoProduct();
    Assert::assertEquals(['office'], $product->getTags());

    $product = Market::getProductByKey('demos-app');
    Assert::assertEquals(['demo'], $product->getTags());
  }

  public function test_firstTag()
  {
    $product = Market::getProductByKey('visualvm-plugin');
    Assert::assertEquals('monitoring', $product->getFirstTag());
  }

  public function test_meta()
  {
    $product = self::getMicrosoftTodoProduct();
    Assert::assertEquals('Axon Ivy AG', $product->getVendor());
    Assert::assertEquals('Free', $product->getCost());
    Assert::assertEquals('https://github.com/axonivy-market/msgraph-connector', $product->getSourceUrl());
    Assert::assertEquals('github.com', $product->getSourceUrlDomain());
    Assert::assertEquals('English', $product->getLanguage());
    Assert::assertEquals('Cross-Industry', $product->getIndustry());
    Assert::assertEquals('4.5', $product->getPlatformReview());

    $info = $product->getMavenProductInfo();
    $v = $info->getNewestVersion();
    Assert::assertEquals($v, $product->getVersion());
  }

  public function test_load_version_from_maven()
  {
    $product = Market::getProductByKey('a-trust');
    Assert::assertNotEquals('1.0', $product->getVersion());
    Assert::assertNotEmpty($product->getVersion());
  }

  public function test_load_compatibilty_from_maven()
  {
    $product = Market::getProductByKey('a-trust');
    Assert::assertNotEquals('1.0', $product->getCompatibility());
    Assert::assertNotEmpty($product->getCompatibility());
  }

  public function test_installationCount()
  {
    $product = self::getMicrosoftTodoProduct();
    $count = $product->getInstallationCount();
    Assert::assertIsInt($count);
    Assert::assertGreaterThanOrEqual(20, $count);
    Assert::assertLessThanOrEqual(1000, $count);
    MarketInstallCounter::incrementInstallCount('msgraph-todo');
    //cached value
    Assert::assertEquals($count, $product->getInstallationCount());
    //reload with incremented value
    $product = self::getMicrosoftTodoProduct();
    Assert::assertEquals($count + 1, $product->getInstallationCount());
  }

  private static function getMicrosoftTodoProduct()
  {
    return ProductFactory::create('msgraph-todo', Config::marketDirectory() . '/microsoft365/toDo/meta.json');
  }
}
