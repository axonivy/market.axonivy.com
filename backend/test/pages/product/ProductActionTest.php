<?php

namespace test\pages\product;

use PHPUnit\Framework\TestCase;
use PHPUnit\Framework\Attributes\RunInSeparateProcess;
use test\AppTester;
use app\domain\market\Market;
use app\domain\market\VersionResolver;
use PHPUnit\Framework\Assert;

class ProductActionTest extends TestCase
{

  public function testWorkflowDemos()
  {
    AppTester::assertThatGet('/workflow')
      ->ok()
      ->bodyContains('Workflow Demos');
  }

  public function testPortal()
  {
    AppTester::assertThatGet('/portal')
      ->ok()
      ->bodyContains('Portal');
  }

  public function test_minorVersion_redirectToLatestBugfixVersion()
  {
    $product = Market::getProductByKey('doc-factory');
    $version = VersionResolver::findNewestVersion($product->getMavenProductInfo(), "10.0");

    Assert::assertNotEquals("10.0", $version);
    AppTester::assertThatGet('/doc-factory/10.0')->redirect("/doc-factory/$version");
  }

  public function test_minorVersion_notFoundIfNoVersionExist()
  {
    AppTester::assertThatGet('/portal/1000.0')->notFound();
  }

  public function test_majorVersion_redirectToLatestBugfixVersion()
  {
    $product = Market::getProductByKey('doc-factory');
    $version = VersionResolver::findNewestVersion($product->getMavenProductInfo(), "10");

    Assert::assertNotEquals("10", $version);
    AppTester::assertThatGet('/doc-factory/10')->redirect("/doc-factory/$version");
  }

  public function test_majorVersion_notFoundIfNoVersionExist()
  {
    AppTester::assertThatGet('/portal/1000')->notFound();
  }

  public function test_bugfixVersion()
  {
    $product = Market::getProductByKey('doc-factory');
    $version = VersionResolver::findNewestVersion($product->getMavenProductInfo(), "10");

    Assert::assertNotEquals("10", $version);
    AppTester::assertThatGet("/doc-factory/$version")
      ->ok()
      ->bodyContains("DocFactory");
  }

  public function test_bugfixVersion_nonExisting()
  {
    AppTester::assertThatGet('/doc-factory/1000.0.0')->notFound();
  }

  public function test_devReleases()
  {
    $product = Market::getProductByKey('portal');
    $version = $product->getMavenProductInfo()->getNewestVersion();
    AppTester::assertThatGet('/portal/dev')->redirect("/portal/$version");
    AppTester::assertThatGet('/portal/sprint')->redirect("/portal/$version");
    AppTester::assertThatGet('/portal/nightly')->redirect("/portal/$version");
  }

  public function test_latest()
  {
    $v = reset(Market::getProductByKey('portal')->getMavenProductInfo()->getVersionsReleased());
    AppTester::assertThatGet('/portal/latest')->redirect('/portal/' . $v);
  }

  public function testSonatypeArtifact()
  {
    AppTester::assertThatGet('/web-tester')
      ->ok()
      ->bodyContains('Web Tester');
  }

  public function testInstallButton_canNotInstallInOfficalMarket()
  {
    AppTester::assertThatGet('/genderize-io-connector')
      ->ok()
      ->bodyContains("Please open the");
  }

  public function testInstallButton_canInstallInDesignerMarket()
  {
    AppTester::assertThatGetWithCookie('http://localhost/genderize-io-connector', ['ivy-viewer' => 'designer-market', 'ivy-version' => '9.2.0'])
      ->ok()
      ->bodyContains("http://localhost/market-cache/genderize-io-connector/genderize-io-connector-product/9.2.0/_product.json");
  }

  public function testInstallButton_byDefaultWithCurrentVersion()
  {
    $product = Market::getProductByKey('doc-factory');
    $version = reset($product->getMavenProductInfo()->getVersionsReleased());

    AppTester::assertThatGetWithCookie('http://localhost/doc-factory', ['ivy-version' => $version])
      ->ok()
      ->bodyContains("$version");
  }
  
  public function testInstallButton_byDefaulNoSnapshotVersions()
  {
    $product = Market::getProductByKey('doc-factory');
    AppTester::assertThatGet('http://localhost/doc-factory')
      ->ok()
      ->bodyContains("9.4.0")
      ->bodyDoesNotContain("SNAPSHOT");
  }

  public function testInstallButton_respectCookie_ltsMatchInstaller()
  {
    $product = Market::getProductByKey('doc-factory');
    $version = VersionResolver::get($product->getMavenProductInfo(), '9.4');
    AppTester::assertThatGetWithCookie('http://localhost/doc-factory', ['ivy-version' => '9.4.0'])
      ->ok()
      ->bodyContains($version);
  }

  public function testInstallButton_respectCookie_bestMatchInstaller()
  {
      AppTester::assertThatGetWithCookie('http://localhost/doc-factory', ['ivy-version' => '9.4.0'])
        ->ok()
        ->bodyContains("9.4.0");
  }
  
  public function testInstallButton_respectCookie_bestMatchInstaller_showSnapshotIfNoMatch()
  {
      AppTester::assertThatGetWithCookie('http://localhost/doc-factory', ['ivy-version' => '9.4.1'])
        ->ok()
        ->bodyContains("9.4.1-SNAPSHOT");
  }

  public function testInstallButton_respectCookie_bestMatchInstaller_showSnapshotIfNoMatch_bugFixReleaseAware()
  {
      AppTester::assertThatGetWithCookie('http://localhost/doc-factory', ['ivy-version' => '9.4.2'])
        ->ok()
        ->bodyContains("9.4.1-SNAPSHOT");
  }

  public function testInstallButton_respectCookie_bestMatchInstaller_dontShowSnapshotIfNoNeeded()
  {
      AppTester::assertThatGetWithCookie('http://localhost/doc-factory', ['ivy-version' => '9.4.0'])
        ->ok()
        ->bodyContains("9.4.0")
        ->bodyDoesNotContain("9.3.1-SNAPSHOT");
  }

  public function testInstallButton_respectCookie_bestMatchInstaller_ifNotExistUseLast()
  {
    $product = Market::getProductByKey('portal');  
    $version = VersionResolver::get($product->getMavenProductInfo(), '9.2');
    AppTester::assertThatGetWithCookie('http://localhost/portal', ['ivy-version' => '9.2.99'])
      ->ok()
      ->bodyContains($version);
  }

  public function testInstallButton_useSpecificVersion()
  {
    AppTester::assertThatGetWithCookie('http://localhost/doc-factory/8.0.8', ['ivy-version' => '9.2.0'])
      ->ok()
      ->bodyContains("8.0.8");
  }

  public function testNotFoundWhenVersionDoesNotExistOfMavenBackedArtifact()
  {
    AppTester::assertThatGet('/workflow')->ok();
    AppTester::assertThatGet('/workflow/444')->notFound();
  }

  public function testNotFoundWhenVersionDoesNotExistOfNonMavenArtifact()
  {
    AppTester::assertThatGet('/genderize-io-connector')->ok();
    AppTester::assertThatGet('/genderize-io-connector/444')->notFound();
  }

  public function testAPIBrowserButton_exists()
  {
    AppTester::assertThatGet('/genderize-io-connector')
      ->ok()
      ->bodyContains("/api-browser?url=/market-cache/genderize-io-connector/genderize-io-connector-product/")
      ->bodyContains("/openapi.json");
  }

  //public function testAPIBrowserButton_existsForYaml()
  //{
  //  AppTester::assertThatGet('/amazon-lex')
  //    ->ok()
  //    ->bodyContains("/api-browser?url=/market-cache/amazon-lex/amazon-lex-connector-product/")
  //    ->bodyContains("/openapi.yaml");
  //}

  public function testAPIBrowserButton_existsNot()
  {
    AppTester::assertThatGet('/employee-onboarding')
      ->ok()
      ->bodyDoesNotContain("/api-browser?url");
  }

  public function testGetInTouchLink()
  {
    AppTester::assertThatGet('/employee-onboarding')
      ->ok()
      ->bodyContains('a class="button special install" href="https://www.axonivy.com/marketplace/contact/?market_solutions=employee-onboarding');
  }
  
  public function testDontShowInstallCountForUninstallableProducts() 
  {
    AppTester::assertThatGet('/employee-onboarding')
      ->ok()
      ->bodyDoesNotContain('Installations');
  }

  public function testDontDisplaySnapshotInVersionDropdown() 
  {
    AppTester::assertThatGet('/doc-factory')
      ->ok()
      ->bodyDoesNotContain('-SNAPSHOT</option>');
  }
  
  #[RunInSeparateProcess]
  public function testDontDisplaySnapshotInVersionDropdownWhenEnabled() 
  {
    AppTester::assertThatGet('/doc-factory?showDevVersions=true')
      ->ok()
      ->bodyContains('-SNAPSHOT</option>');
  }

  #[RunInSeparateProcess]
  public function testDontDisplaySnapshotInVersionDropdownWhenHiding() 
  {
    AppTester::assertThatGet('/doc-factory?showDevVersions=false')
      ->ok()
      ->bodyDoesNotContain('-SNAPSHOT</option>');
  }

  public function testShowBuildStatusBadge() 
  {
    AppTester::assertThatGet('/excel-utils')
      ->ok()
      ->bodyContains('<img src="https://github.com/axonivy-market/excel-connector/actions/workflows/ci.yml/badge.svg" />');
  }

  public function testExternalVendor() 
  {
    AppTester::assertThatGet('/jira')
      ->ok()
      ->bodyContains('src="/_market/jira/frox.png"')
      ->bodyContains('alt="FROX AG"')
      ->bodyContains('href="https://www.frox.ch"');

  }

  public function testVendor() 
  {
    AppTester::assertThatGet('/visualvm-plugin')
      ->ok()
      ->bodyContains('src="/images/misc/axonivy-logo-black.svg"')
      ->bodyContains('alt="Axon Ivy AG"')      
      ->bodyContains('href="https://www.axonivy.com"');
  }
}
