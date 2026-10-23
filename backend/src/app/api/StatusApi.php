<?php

namespace app\api;

use app\domain\market\Market;

/**
 * Simple API for debugging purpose.
 * This is no official API for the outside world.
 */
class StatusApi
{
  public function __invoke($request, $response, $args)
  {
    $data = $this->status();
    $response->getBody()->write((string) json_encode($data));
    $response = $response->withHeader('Content-Type', 'application/json');
    return $response;
  }

  private function status()
  {
    return [
      'site' => [
        'phpVersion' => phpversion()
      ],
      'data' => [
        'market' => $this->getMarketProducts()
      ]
    ];
  }

  private function getMarketProducts(): array
  {
    $products = [];
    foreach (Market::all() as $product) {
      $p = [
        'key' => $product->getKey(),
        'name' => $product->getName(),
        'url' => $product->getUrl()
      ];
      $info = $product->getMavenProductInfo();
      if ($info != null) {        
        $p['newest-version'] = $info->getNewestVersion();
        $p['oldest-version'] = $info->getOldestVersion();
      }
      $products[] = $p;
    }
    return $products;
  }
}
