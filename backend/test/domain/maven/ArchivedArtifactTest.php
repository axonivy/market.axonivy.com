<?php

namespace test\domain\maven;
use PHPUnit\Framework\TestCase;
use app\domain\market\Market;
use app\domain\market\ProductMavenArtifactDownloader;
use PHPUnit\Framework\Assert;

class ArchivedArtifactTest extends TestCase
{

  public function testArchivedArtifact(){
    (new ProductMavenArtifactDownloader())->download(Market::getProductByKey('portal'), "10.0.0");

    $artifact = MavenArtifactTest::getMavenArtifact('portal-app', 'zip');
    Assert::assertIsArray($artifact->getArchivedArtifacts());
    Assert::assertCount(1, $artifact->getArchivedArtifacts());

    $archivedArtifact = $artifact->getArchivedArtifacts()[0];
    Assert::assertEquals('ch.ivyteam.ivy.project.portal', $archivedArtifact->getGroupId());
    Assert::assertEquals('10.1.0', $archivedArtifact->getLastVersion());
    Assert::assertEquals('portal-app', $archivedArtifact->getArtifactId());
  }
}
