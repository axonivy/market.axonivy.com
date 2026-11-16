<?php

namespace test\domain\market;

use app\domain\market\Version;
use PHPUnit\Framework\TestCase;

class VersionTest extends TestCase
{
  public function testParsesMajorAndMinorFromDesignerBuildVersion(): void
  {
    $version = Version::parseMajorMinor('14.0.34243.abc');

    self::assertNotNull($version);
    self::assertSame(14, $version->getMajor());
    self::assertSame(0, $version->getMinor());
  }

  public function testParsesMajorAndMinorFromDevVersion(): void
  {
    $version = Version::parseMajorMinor('15.1-dev');

    self::assertNotNull($version);
    self::assertSame(15, $version->getMajor());
    self::assertSame(1, $version->getMinor());
  }

  public function testRejectsVersionWithoutMajorAndMinor(): void
  {
    self::assertNull(Version::parseMajorMinor('14'));
    self::assertNull(Version::parseMajorMinor('invalid'));
  }

  public function testComparesMajorAndMinorComponentsOnly(): void
  {
    $older = Version::parseMajorMinor('13.1');
    $designer = Version::parseMajorMinor('14.0.34243.abc');
    $sameMajorMinor = Version::parseMajorMinor('14.0.1');

    self::assertNotNull($older);
    self::assertNotNull($designer);
    self::assertNotNull($sameMajorMinor);
    self::assertTrue($older->isOlderThan($designer));
    self::assertFalse($sameMajorMinor->isOlderThan($designer));
  }
}
