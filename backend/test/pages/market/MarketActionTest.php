<?php

namespace test\pages\market;

use PHPUnit\Framework\TestCase;
use test\AppTester;

class MarketActionTest extends TestCase
{

  public function testMarketPage()
  {
    AppTester::assertThatGet('/')
      ->ok()
      ->bodyContains('Portal')
      ->bodyContains('VisualVM Plugin')
      ->bodyDoesNotContain('Basic Workflow'); // not listed
  }

  public function testMarketPageSearch()
  {
    AppTester::assertThatGet('/?search=portal')
      ->ok()
      ->bodyContains('Portal')
      ->bodyDoesNotContain('No products found')
      ->bodyDoesNotContain('VisualVM Plugin')
      ->bodyDoesNotContain('Basic Workflow'); // not listed
  }

  public function testMarketPageSearchNothingFound()
  {
    AppTester::assertThatGet('/?search=doesnotexist')
      ->ok()
      ->bodyContains('Nothing found')
      ->bodyDoesNotContain('Portal')
      ->bodyDoesNotContain('VisualVM Plugin')
      ->bodyDoesNotContain('Basic Workflow'); // not listed
  }

  public function testMarketPage_querySearch()
  {
    AppTester::assertThatGet('/?type=CONNECTOR&search=uipath')
      ->ok()
      ->bodyContains('ui-path')
      ->bodyContains('id="main"');
  }

  public function testMarketPage_querySearchOnly()
  {
    AppTester::assertThatGet('/?resultsOnly&type=CONNECTOR&search=uipath') // stable URI since Designer 9.2!
      ->ok()
      ->bodyContains('ui-path')
      ->bodyDoesNotContain('id="main"'); // no search input!
  }
}
