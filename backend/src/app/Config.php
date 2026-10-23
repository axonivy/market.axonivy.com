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
    $configuredDirectory = getenv('MARKET_PRODUCTS_DIR');
    if ($configuredDirectory !== false && $configuredDirectory !== '') {
      return rtrim($configuredDirectory, '/');
    }
    $frontendDirectory = dirname(__DIR__, 3) . '/frontend/.market/market-bundle/products';
    if (is_dir($frontendDirectory)) {
      return $frontendDirectory;
    }
    return self::isProductionEnvironment() ? '/home/axonivya/data/market' : __DIR__ . '/../../src/web/_market';
  }

  public static function marketCacheDirectory(): string
  {
    $configuredDirectory = getenv('MARKET_CACHE_DIR');
    if ($configuredDirectory !== false && $configuredDirectory !== '') {
      return rtrim($configuredDirectory, '/');
    }
    $frontendDirectory = dirname(__DIR__, 3) . '/frontend/public/market-cache';
    if (is_dir($frontendDirectory)) {
      return $frontendDirectory;
    }
    return self::isProductionEnvironment() ? '/home/axonivya/data/market-cache' : __DIR__ . '/../../src/web/market-cache';
  }

  public static function marketIndexFile(): string
  {
    $configuredFile = getenv('MARKET_INDEX_FILE');
    if ($configuredFile !== false && $configuredFile !== '') {
      return $configuredFile;
    }
    $frontendFile = dirname(__DIR__, 3) . '/frontend/.market/products.json';
    return is_file($frontendFile) ? $frontendFile : '';
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
