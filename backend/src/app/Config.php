<?php

namespace app;

class Config
{
  private static function marketRootDirectory(): string
  {
    $marketDir = getenv('MARKET_DIR');
    if ($marketDir !== false && $marketDir !== '') {
      return rtrim($marketDir, '/');
    }
    $frontendDir = dirname(__DIR__, 3) . '/frontend/.market';
    if (is_dir($frontendDir)) {
      return $frontendDir;
    }
    return dirname(__DIR__) . '/web/_market';
  }

  public static function marketDirectory(): string
  {
    return self::marketRootDirectory() . '/meta-catalog/products';
  }

  public static function marketCacheDirectory(): string
  {
    return self::marketRootDirectory() . '/maven-products';
  }

  public static function marketIndexFile(): string
  {
    return self::marketRootDirectory() . '/product-index.json';
  }

}
