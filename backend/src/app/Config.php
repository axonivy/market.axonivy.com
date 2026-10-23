<?php

namespace app;

class Config
{
  public const MAVEN_ARTIFACTORY_URL = 'https://maven.axonivy.com/';

  public static function isProductionEnvironment()
  {
    return !file_exists(__DIR__ . '/../../Jenkinsfile');
  }

  public static function marketDirectory(): string
  {
    return self::isProductionEnvironment() ? '/home/axonivya/data/market' : __DIR__ . '/../../src/web/_market';
  }

  public static function marketCacheDirectory(): string
  {
    return self::isProductionEnvironment() ? '/home/axonivya/data/market-cache' : __DIR__ . '/../../src/web/market-cache';
  }

  public static function marketInstallationsFile(): string
  {
    return self::isProductionEnvironment() ? '/home/axonivya/data/market-installations.json' : '/tmp/market-installations.json';
  }

  public static function unzipper(): string
  {
    return __DIR__ . '/download-zip.sh';
  }
}
