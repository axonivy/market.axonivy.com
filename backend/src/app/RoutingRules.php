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
    $app->get('/stable/openapi.json', OpenApiDocumentApi::class);
    $app->get('/stable/api/status', StatusApi::class);
    $app->get('/stable/api/product', [$productApi, 'getProducts']);
    $app->get('/stable/api/product/{id}/versions', [$productApi, 'getVersions']);
    $app->get('/stable/api/product/{id}/install', [$productApi, 'getInstall']);
    $app->get('/stable/api/product-details/{id}/{version}/bestmatch', [$productApi, 'getBestMatch']);
    $app->get('/stable/api/image/{id}', [$productApi, 'getImage']);
  }
}
