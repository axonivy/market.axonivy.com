<?php

namespace app\pages\product\json;

use Slim\Exception\HttpNotFoundException;
use app\domain\market\Market;
use app\domain\market\MarketInstallCounter;
use Slim\Psr7\Request;

class ProductJsonAction
{
  public function __invoke(Request $request, $response, $args)
  {
    $key = $args['key'] ?? '';
    $product = Market::getProductByKey($key);
    if ($product == null) {
      throw new HttpNotFoundException($request, "product $key does not exist");
    }

    $version = $args['version'] ?? '';
    if (empty($version)) {
      throw new HttpNotFoundException($request, 'version is empty');
    }

    $info = $product->getMavenProductInfo();
    if ($info == null) {
      throw new HttpNotFoundException($request, 'product is not versionized');
    }

    if (!in_array($version, $info->getVersions())) {
      throw new HttpNotFoundException($request, 'version does not exist');
    }

    MarketInstallCounter::incrementInstallCount($product->getKey());
    $content = $product->getProductJsonContent($version);
    $content = str_replace('${version}', $version, $content);

    if (empty($content)) {
      $content = "{}";
    }
    $json = json_decode($content);
    $json->name = $product->getName();
    $content = json_encode($json, JSON_PRETTY_PRINT);
    $response->getBody()->write($content);
    return $response->withHeader('Content-Type', 'application/json');
  }
}
