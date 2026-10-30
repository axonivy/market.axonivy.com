<?php

namespace test\domain\market;

use PHPUnit\Framework\Assert;
use PHPUnit\Framework\TestCase;
use app\domain\market\Market;

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
    Assert::assertEquals('/product/visualvm-plugin', $product->getUrl());
  }

  public function test_vendor()
  {
    $product = Market::getProductByKey('visualvm-plugin');
    Assert::assertEquals('Axon Ivy AG', $product->getVendor());

    $product = Market::getProductByKey('jira-connector');
    Assert::assertEquals('FROX AG', $product->getVendor());
  }

  public function test_vendorUrl()
  {
    $product = Market::getProductByKey('visualvm-plugin');
    Assert::assertEquals('https://www.axonivy.com', $product->getVendorUrl());

    $product = Market::getProductByKey('jira-connector');
    Assert::assertEquals('https://www.frox.ch', $product->getVendorUrl());
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

  }

  private static function getMicrosoftTodoProduct()
  {
    return Market::getProductByKey('msgraph-todo');
  }
}
