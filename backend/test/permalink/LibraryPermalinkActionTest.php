<?php

namespace test\permalink;

use app\domain\market\Market;
use PHPUnit\Framework\TestCase;
use test\AppTester;
use app\domain\maven\MavenArtifact;
use test\domain\maven\MavenArtifactTest;

class LibraryPermalinkActionTest extends TestCase
{
  public function testPermalink_dev()
  {
    $artifact = self::demosApp();

    $version = $artifact->getVersions()[0];
    $concretVersion = $artifact->getConcreteVersion($version);

    AppTester::assertThatGet('/demos-app/dev/lib/ivy-demos-app.zip')
      ->redirect("https://maven.axonivy.com/com/axonivy/demo/ivy-demos-app/$version/ivy-demos-app-$concretVersion.zip");
  }

  public function testPermalink_nightly()
  {
    $artifact = self::demosApp();

    $version = $artifact->getVersions()[0];
    $concretVersion = $artifact->getConcreteVersion($version);

    AppTester::assertThatGet('/demos-app/nightly/lib/ivy-demos-app.zip')
      ->redirect("https://maven.axonivy.com/com/axonivy/demo/ivy-demos-app/$version/ivy-demos-app-$concretVersion.zip");
  }

  public function testPermalink_sprint()
  {
    $artifact = self::demosApp();

    $version = $artifact->getVersions()[0];
    $concretVersion = $artifact->getConcreteVersion($version);

    AppTester::assertThatGet('/demos-app/sprint/lib/ivy-demos-app.zip')
      ->redirect("https://maven.axonivy.com/com/axonivy/demo/ivy-demos-app/$version/ivy-demos-app-$concretVersion.zip");
  }

  public function testPermalink_latest()
  {
    $info = Market::getProductByKey('demos-app')->getMavenProductInfo();
    $artifact = self::demosApp();
    $version = reset($info->getVersionsReleased());
    $concretVersion = $artifact->getConcreteVersion($version);

    AppTester::assertThatGet('/demos-app/latest/lib/ivy-demos-app.zip')
      ->redirect("https://maven.axonivy.com/com/axonivy/demo/ivy-demos-app/$version/ivy-demos-app-$concretVersion.zip");
  }

  public function testPermalink_specificVersion()
  {
    $artifact = self::demosApp();

    $version = '9.4.0-SNAPSHOT';
    $concretVersion = $artifact->getConcreteVersion($version);

    AppTester::assertThatGet('/demos-app/9.4.0-SNAPSHOT/lib/ivy-demos-app.zip')
      ->redirect("https://maven.axonivy.com/com/axonivy/demo/ivy-demos-app/$version/ivy-demos-app-$concretVersion.zip");
  }

  public function testPermalink_minorVersion()
  {
    $artifact = self::demosApp();

    $version = '8.0.5';
    $concretVersion = $artifact->getConcreteVersion($version);

    AppTester::assertThatGet('/demos-app/8.0/lib/ivy-demos-app.zip')
      ->redirect("https://maven.axonivy.com/com/axonivy/demo/ivy-demos-app/$version/ivy-demos-app-$concretVersion.zip");
  }

  private static function demosApp(): MavenArtifact
  {
    return MavenArtifactTest::getMavenArtifact('ivy-demos-app', 'zip');
  }
}
