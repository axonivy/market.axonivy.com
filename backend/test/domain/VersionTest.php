<?php

namespace test\domain;

use PHPUnit\Framework\Assert;
use PHPUnit\Framework\TestCase;
use app\domain\Version;

class VersionTest extends TestCase
{

  public function test_getMajorVersion()
  {
    Assert::assertEquals('7', (new Version('7.1.0'))->getMajorVersion());
    Assert::assertEquals('7', (new Version('7.1'))->getMajorVersion());
    Assert::assertEquals('7', (new Version('7'))->getMajorVersion());

    Assert::assertEquals('10', (new Version('10.1.0'))->getMajorVersion());
    Assert::assertEquals('10', (new Version('10.1.0-SNAPSHOT'))->getMajorVersion());
    Assert::assertEquals('10', (new Version('10.1.0-m251'))->getMajorVersion());
    Assert::assertEquals('10', (new Version('10.1.0-m251.1'))->getMajorVersion());
  }

  public function test_getMinorVersion()
  {
    Assert::assertEquals('7.1', (new Version('7.1.0'))->getMinorVersion());
    Assert::assertEquals('7.1', (new Version('7.1'))->getMinorVersion());
    Assert::assertEquals('7', (new Version('7'))->getMinorVersion());

    Assert::assertEquals('10.1', (new Version('10.1.0'))->getMinorVersion());
    Assert::assertEquals('10.1', (new Version('10.1.0-SNAPSHOT'))->getMinorVersion());
    Assert::assertEquals('10.1', (new Version('10.1.0-m251'))->getMinorVersion());
    Assert::assertEquals('10.1.0', (new Version('10.1.0-m251.1'))->getBugfixVersion());
  }

  public function test_getBugfixVersion()
  {
    Assert::assertEquals('7.1.0', (new Version('7.1.0'))->getBugfixVersion());
    Assert::assertEquals('7.1', (new Version('7.1'))->getBugfixVersion());
    Assert::assertEquals('7', (new Version('7'))->getBugfixVersion());

    Assert::assertEquals('10.1.0', (new Version('10.1.0'))->getBugfixVersion());
    Assert::assertEquals('10.1.0', (new Version('10.1.0-SNAPSHOT'))->getBugfixVersion());
    Assert::assertEquals('10.1.0', (new Version('10.1.0-m251'))->getBugfixVersion());
    Assert::assertEquals('10.1.0', (new Version('10.1.0-m251.1'))->getBugfixVersion());
  }

  public function test_getMinorNumber()
  {
    Assert::assertEquals('1', (new Version('7.1.0'))->getMinorNumber());
    Assert::assertEquals('1', (new Version('7.1'))->getMinorNumber());
    Assert::assertEquals('', (new Version('7'))->getMinorNumber());

    Assert::assertEquals('0', (new Version('7.0.0'))->getMinorNumber());

    Assert::assertEquals('10', (new Version('7.10.0'))->getMinorNumber());
    Assert::assertEquals('10', (new Version('7.10.0-SNAPSHOT'))->getMinorNumber());
    Assert::assertEquals('10', (new Version('7.10.0-m251'))->getMinorNumber());
    Assert::assertEquals('10', (new Version('7.10.0-m251.1'))->getMinorNumber());
  }

  public function test_getBugfixNumber()
  {
    Assert::assertEquals('5', (new Version('7.1.5'))->getBugfixNumber());
    Assert::assertEquals('', (new Version('7.1'))->getBugfixNumber());
    Assert::assertEquals('', (new Version('7'))->getBugfixNumber());

    Assert::assertEquals('0', (new Version('7.0.0'))->getBugfixNumber());

    Assert::assertEquals('5', (new Version('7.10.5'))->getBugfixNumber());
    Assert::assertEquals('5', (new Version('7.10.5-SNAPSHOT'))->getBugfixNumber());
    Assert::assertEquals('5', (new Version('7.10.5-m251'))->getBugfixNumber());
    Assert::assertEquals('5', (new Version('7.10.5-m251.1'))->getBugfixNumber());
  }

  public function test_isMajor()
  {
    Assert::assertFalse((new Version('7.1.0'))->isMajor());
    Assert::assertFalse((new Version('7.1'))->isMajor());
    Assert::assertFalse((new Version('7.10.5-SNAPSHOT'))->isMajor());
    Assert::assertFalse((new Version('7.10.5-m251'))->isMajor());
    Assert::assertFalse((new Version('7.10.5-m251.1'))->isMajor());
    Assert::assertFalse((new Version('7.10-SNAPSHOT'))->isMajor());
    Assert::assertFalse((new Version('7.10-m251'))->isMajor());
    Assert::assertFalse((new Version('7-SNAPSHOT'))->isMajor());
    
    Assert::assertTrue((new Version('7'))->isMajor());
    Assert::assertTrue((new Version('11'))->isMajor());
    Assert::assertTrue((new Version('7'))->isMajor());
  }

  public function test_isMinor()
  {
    Assert::assertFalse((new Version('7.1.0'))->isMinor());
    Assert::assertFalse((new Version('7'))->isMinor());
    Assert::assertFalse((new Version('7.10.5-SNAPSHOT'))->isMinor());
    Assert::assertFalse((new Version('7.10.5-m251'))->isMinor());
    Assert::assertFalse((new Version('7.10.5-m251.1'))->isMinor());
    Assert::assertFalse((new Version('7.10-SNAPSHOT'))->isMinor());
    Assert::assertFalse((new Version('7.10-m251'))->isMinor());

    Assert::assertTrue((new Version('7.0'))->isMinor());
    Assert::assertTrue((new Version('11.0'))->isMinor());
    Assert::assertTrue((new Version('7.19'))->isMinor());
  }

  public function test_isBugfix()
  {
    Assert::assertFalse((new Version('7.1'))->isBugfix());
    Assert::assertFalse((new Version('7'))->isBugfix());
    Assert::assertFalse((new Version('7.10.5-SNAPSHOT'))->isBugfix());
    Assert::assertFalse((new Version('7.10.5-m251'))->isBugfix());
    Assert::assertFalse((new Version('7.10-SNAPSHOT'))->isBugfix());
    Assert::assertFalse((new Version('7.10-m251'))->isBugfix());

    Assert::assertTrue((new Version('7.1.5'))->isBugfix());
    Assert::assertTrue((new Version('11.0.15'))->isBugfix());
    Assert::assertTrue((new Version('7.3.25'))->isBugfix());
  }

  public function test_isSnapshot()
  {
    Assert::assertFalse((new Version('7'))->isSnapshot());
    Assert::assertFalse((new Version('7.1'))->isSnapshot());
    Assert::assertFalse((new Version('7.1.0'))->isSnapshot());
    Assert::assertFalse((new Version('7.1.0-alpha'))->isSnapshot());
    Assert::assertFalse((new Version('7.1.0-m251.1'))->isSnapshot());

    Assert::assertTrue((new Version('7-SNAPSHOT'))->isSnapshot());
    Assert::assertTrue((new Version('7.1-SNAPSHOT'))->isSnapshot());
    Assert::assertTrue((new Version('7.1.0-SNAPSHOT'))->isSnapshot());
  }

  public function test_isSprint()
  {
    Assert::assertFalse((new Version('7'))->isSprint());
    Assert::assertFalse((new Version('7.1'))->isSprint());
    Assert::assertFalse((new Version('7.1.0'))->isSprint());
    Assert::assertFalse((new Version('7.1.0-alpha'))->isSprint());

    Assert::assertTrue((new Version('7-m251'))->isSprint());
    Assert::assertTrue((new Version('7.1-m251'))->isSprint());
    Assert::assertTrue((new Version('7.1.0-m251'))->isSprint());
    Assert::assertTrue((new Version('7.1.0-m251.1'))->isSprint());
  }

  public function test_isOffical()
  {
    Assert::assertTrue((new Version('7'))->isOffical());
    Assert::assertTrue((new Version('7.1'))->isOffical());
    Assert::assertTrue((new Version('7.1.0'))->isOffical());
    Assert::assertTrue((new Version('7.1.0-alpha'))->isOffical());
    
    Assert::assertFalse((new Version('7-m251'))->isOffical());
    Assert::assertFalse((new Version('7.1-m251'))->isOffical());
    Assert::assertFalse((new Version('7.1.0-m251'))->isOffical());
    Assert::assertFalse((new Version('7.1.0-m251.1'))->isOffical());
    Assert::assertFalse((new Version('7-SNAPSHOT'))->isOffical());
    Assert::assertFalse((new Version('7.1-SNAPSHOT'))->isOffical());
    Assert::assertFalse((new Version('7.1.0-SNAPSHOT'))->isOffical());
  }
}
