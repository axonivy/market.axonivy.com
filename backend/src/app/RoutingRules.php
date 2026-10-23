<?php

namespace app;

use app\pages\market\MarketAction;
use app\pages\product\ProductAction;
use app\pages\sitemap\SitemapAction;
use app\permalink\LibraryPermalinkAction;
use app\permalink\DocPermalinkAction;
use app\pages\product\json\ProductJsonAction;
use app\pages\internal\MarketRCPTTAction;
use app\pages\permalink\ProductLogoPermalinkAction;
use app\api\StatusApi;
use app\pages\apibrowser\ApiBrowserAction;

class RoutingRules
{
  public static function installRoutes($app)
  {
    $app->get('/', MarketAction::class);

    $app->get('/api/status', StatusApi::class);
    $app->get('/sitemap.xml', SitemapAction::class);
    $app->get('/api-browser', ApiBrowserAction::class);

    $app->get('/internal/market-rcptt', MarketRCPTTAction::class);

    $app->get('/market-cache/{key}/{artifactId}/{version}/logo.png', ProductLogoPermalinkAction::class);
    $app->get('/market-cache/{key}/{artifactId}/{version}/_product.json', ProductJsonAction::class);

    $app->get('/{key}/{version}/doc[/{path:.*}]', DocPermalinkAction::class);
    $app->get('/{key}/{version}/lib/{name}', LibraryPermalinkAction::class);
    $app->get('/{key}[/{version}]', ProductAction::class);
  }
}
