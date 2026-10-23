<?php

namespace test\domain\maven;

use PHPUnit\Framework\Assert;
use PHPUnit\Framework\TestCase;
use app\domain\market\Market;
use app\domain\market\ProductMavenArtifactDownloader;
use app\domain\maven\MavenArtifact;

class MavenArtifactTest extends TestCase
{
  public function testFilterSnapshotsWhichAreReleased()
  {
    $versions = [
      '9.3.0', '9.2.0', '9.2.0-SNAPSHOT', '9.1.0'
    ];
    $result = MavenArtifact::filterSnapshotsWhichAreReleased($versions);
    
    Assert::assertCount(3, $result);
    Assert::assertEquals('9.3.0', $result[0]);
    Assert::assertEquals('9.2.0', $result[1]);
    Assert::assertEquals('9.1.0', $result[2]);
  }
  
  public function testFilterSprintsWhichAreReleased()
  {
    $versions = [
      '9.3.0', '9.2.0', '9.2.0-m461', '9.2.0-m461.1,', '9.1.0'
    ];
    $result = MavenArtifact::filterSnapshotsWhichAreReleased($versions);
    
    Assert::assertCount(3, $result);
    Assert::assertEquals('9.3.0', $result[0]);
    Assert::assertEquals('9.2.0', $result[1]);
    Assert::assertEquals('9.1.0', $result[2]);
  }

  public function testFilterSprintsWhichAreReleased_fourDigits()
  {
    $versions = [
      '9.3.0', '9.2.0.2', '9.2.0-m461', '9.2.0-m461.1,', '9.1.0'
    ];
    $result = MavenArtifact::filterSnapshotsWhichAreReleased($versions);
    
    Assert::assertCount(3, $result);
    Assert::assertEquals('9.3.0', $result[0]);
    Assert::assertEquals('9.2.0.2', $result[1]);
    Assert::assertEquals('9.1.0', $result[2]);
  }

  public function testFilterSnapshotsBetweenReleasedVersions()
  {
    $versions = [
      '10.0.0', '9.2.2-SNAPSHOT', '9.2.1', '9.2.0', '9.2.0-SNAPSHOT', '9.1.0'
    ];
    $result = MavenArtifact::filterSnapshotsBetweenReleasedVersions($versions);
    
    Assert::assertCount(5, $result);
    Assert::assertEquals('10.0.0', $result[0]);
    Assert::assertEquals('9.2.2-SNAPSHOT', $result[1]);
    Assert::assertEquals('9.2.1', $result[2]);
    Assert::assertEquals('9.2.0', $result[3]);
    Assert::assertEquals('9.1.0', $result[4]);
  }

  public function testGetMavenArtifact()
  {
    $artifact = Market::getProductByKey('workflow')->getMavenProductInfo()->getProductArtifact();
    $this->assertEquals('Workflow Demos Product', $artifact->getName());
  }

  public function testGetMavenArtifact_notExisting()
  {
    $artifact = self::getMavenArtifact('does not exist', '');
    $this->assertNull($artifact);
  }

  public function testGetWorkflowDemo()
  {
    $artifact = Market::getProductByKey('workflow')->getMavenProductInfo()->getProductArtifact();
    $this->assertEquals('Workflow Demos Product', $artifact->getName());
  }

  public function testMavenArtifact()
  {
    $artifact = Market::getProductByKey('connectivity')->getMavenProductInfo()->getProductArtifact();
    $this->assertEquals('Connectivity Demos Product', $artifact->getName());
    $this->assertEquals('com.axonivy.demo', $artifact->getGroupId());
    $this->assertEquals('connectivity-demos-product', $artifact->getArtifactId());
  }

  public function testParseLatestVersionFromXml()
  {
    $xml = file_get_contents(dirname(__FILE__) . '/maven-metadata.xml');
    $versions = MavenArtifact::parseVersions($xml);
    $this->assertEquals('7.2.0-SNAPSHOT', $versions[0]);
    $this->assertEquals('7.3.0-SNAPSHOT', $versions[1]);
  }

  public function testParseVersionIdentifierFromXml()
  {
    $xml = file_get_contents(dirname(__FILE__) . '/maven-metadata-specific.xml');
    $version = MavenArtifact::parseVersionIdentifierFromXml($xml);
    $this->assertEquals('7.3.0-20181115.013605-5', $version);
  }

  public function test_type()
  {
    $artifact = self::getMavenArtifact('visualvm-plugin', 'nbm');
    Assert::assertEquals('nbm', $artifact->getType());

    (new ProductMavenArtifactDownloader())->download(Market::getProductByKey('demos-app'), "10.0.0");
    $artifact = self::getMavenArtifact('ivy-demos-app', 'zip');
    Assert::assertEquals('zip', $artifact->getType());

    $artifact = Market::getProductByKey('workflow')->getMavenProductInfo()->getProductArtifact();
    Assert::assertEquals('zip', $artifact->getType());
  }

  public function test_makeSenseAsMavenDependency()
  {
    $artifact = self::getMavenArtifact('visualvm-plugin', 'nbm');
    Assert::assertFalse($artifact->getMakesSenseAsMavenDependency());

    (new ProductMavenArtifactDownloader())->download(Market::getProductByKey('doc-factory'), "10.0.0");
    $artifact = self::getMavenArtifact('doc-factory', 'iar');
    Assert::assertTrue($artifact->getMakesSenseAsMavenDependency());
  }
  
  public function test_repoUrl()
  {
    $artifact = self::getMavenArtifact('visualvm-plugin', 'nbm');
    Assert::assertEquals('https://maven.axonivy.com/', $artifact->getRepoUrl());
  }

  public function test_isDocumentation()
  {
    $artifact = self::getMavenArtifact('visualvm-plugin', 'nbm');
    Assert::assertFalse($artifact->isDocumentation());

    (new ProductMavenArtifactDownloader())->download(Market::getProductByKey('doc-factory'), "10.0.0");
    $artifact = self::getMavenArtifact('doc-factory-doc', 'zip');
    Assert::assertTrue($artifact->isDocumentation());
  }

  public function test_name()
  {
    (new ProductMavenArtifactDownloader())->download(Market::getProductByKey('visualvm-plugin'), "8.0.0");
    $artifact = self::getMavenArtifact('visualvm-plugin', 'nbm');
    Assert::assertEquals('Visual VM Plugin', $artifact->getName());

    (new ProductMavenArtifactDownloader())->download(Market::getProductByKey('doc-factory'), "10.0.0");
    $artifact = self::getMavenArtifact('doc-factory-doc', 'zip');
    Assert::assertEquals('DocFactory Documentation', $artifact->getName());
  }

  public function test_getTargetGroupIdFromVersion() {
    (new ProductMavenArtifactDownloader())->download(Market::getProductByKey('portal'), "10.0.0");
    $artifact = MavenArtifactTest::getMavenArtifact('portal-app', 'zip');
    Assert::assertEquals('ch.ivyteam.ivy.project.portal', $artifact->getTargetGroupIdFromVersion("10.0.0"));
    Assert::assertEquals('com.axonivy.portal', $artifact->getTargetGroupIdFromVersion("11.1.0"));
  }

  public function test_getTargetArtifactIdFromVersion() {
    (new ProductMavenArtifactDownloader())->download(Market::getProductByKey('portal'), "10.0.0");
    $artifact = MavenArtifactTest::getMavenArtifact('portal-app', 'zip');
    Assert::assertEquals('portal-app', $artifact->getTargetArtifactIdFromVersion("10.0.0"));
  }

  public function test_getBaseUrlFromVersion() {
    (new ProductMavenArtifactDownloader())->download(Market::getProductByKey('portal'), "10.0.0");
    $artifact = MavenArtifactTest::getMavenArtifact('portal-app', 'zip');
    Assert::assertEquals($artifact->getRepoUrl() . "ch/ivyteam/ivy/project/portal/portal-app", $artifact->getBaseUrlFromVersion("10.0.0"));
    Assert::assertEquals($artifact->getRepoUrl() . "ch/ivyteam/ivy/project/portal/portal-app", $artifact->getBaseUrlFromVersion("8.0.38"));
    Assert::assertEquals($artifact->getRepoUrl() . "com/axonivy/portal/portal-app", $artifact->getBaseUrlFromVersion("11.1.0"));
  }

  public function test_getVersions() {
    $artifact = MavenArtifactTest::getMavenArtifact('portal-app', 'zip');
    $oldVersion = "8.0.38";
    $newVersion = "11.1.0";
    Assert::assertContains($oldVersion, $artifact->getVersions(), "This artifact doesn't contains version $oldVersion");
    Assert::assertContains($newVersion, $artifact->getVersions(), "This artifact doesn't contains version $newVersion");
  }

  public static function getMavenArtifact(string $artifactId, string $type): ?MavenArtifact
  {
    $artifacts = self::getAll();
    foreach ($artifacts as $artifact) {
      if ($artifact->getArtifactId() == $artifactId && $artifact->getType() == $type) {        
        return $artifact;
      }
    }
    return null;
  }

  private static function getAll(): array
  {
    $all = [];
    foreach (Market::all() as $product) {
      $info = $product->getMavenProductInfo();
      if ($info != null) {
        $all = array_merge($all, $info->getMavenArtifacts("10.0.0"));
      }
    }
    return $all;
  }
}
