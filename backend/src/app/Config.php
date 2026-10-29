<?php

namespace app;

class Config
{
  public static function marketDirectory(): string
  {
    $configuredDirectory = getenv('MARKET_PRODUCTS_DIR');
    if ($configuredDirectory !== false && $configuredDirectory !== '') {
      return rtrim($configuredDirectory, '/');
    }
    $frontendDirectory = dirname(__DIR__, 3) . '/frontend/.market/meta-catalog/products';
    if (is_dir($frontendDirectory)) {
      return $frontendDirectory;
    }
    return dirname(__DIR__) . '/web/_market';
  }

  public static function marketCacheDirectory(): string
  {
    $configuredDirectory = getenv('MARKET_CACHE_DIR');
    if ($configuredDirectory !== false && $configuredDirectory !== '') {
      return rtrim($configuredDirectory, '/');
    }
    $frontendDirectory = dirname(__DIR__, 3) . '/frontend/public/maven-products';
    if (is_dir($frontendDirectory)) {
      return $frontendDirectory;
    }
    return dirname(__DIR__) . '/web/maven-products';
  }

  public static function marketIndexFile(): string
  {
    $configuredFile = getenv('MARKET_INDEX_FILE');
    if ($configuredFile !== false && $configuredFile !== '') {
      return $configuredFile;
    }
    $frontendFile = dirname(__DIR__, 3) . '/frontend/.market/products.json';
    if (is_file($frontendFile)) {
      return $frontendFile;
    }
    $webFile = dirname(__DIR__) . '/web/_market/products.json';
    return is_file($webFile) ? $webFile : '';
  }

}
