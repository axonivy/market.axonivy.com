<?php

namespace app;

use app\api\ProductApi;
use app\api\OpenApiDocumentApi;
use app\api\StatusApi;

class RoutingRules
{
  public static function installRoutes($app)
  {
    $productApi = new ProductApi();
    $app->get('/openapi.json', OpenApiDocumentApi::class);
    $app->get('/stable/openapi.json', OpenApiDocumentApi::class);
    $app->get('/api/status', StatusApi::class);
    $app->get('/api/product', [$productApi, 'getProducts']);
    $app->get('/api/product/{id}/versions', [$productApi, 'getVersions']);
    $app->get('/api/product/{id}/install', [$productApi, 'getInstall']);
    $app->get('/api/product-details/{id}/{version}/bestmatch', [$productApi, 'getBestMatch']);
    $app->get('/api/image/{id}', [$productApi, 'getImage']);
  }
}
