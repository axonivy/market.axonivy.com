<?php

namespace app\pages\permalink;

use Slim\Psr7\Request;
use app\domain\util\Redirect;

/**
 * Used that the Axon Ivy Designer can request the log relative
 * to the product.json
 */
class ProductLogoPermalinkAction
{
  public function __invoke(Request $request, $response, $args)
  {
    $key = $args['key'] ?? '';
    return Redirect::to($response, "/_market/$key/logo.png");
  }
}
