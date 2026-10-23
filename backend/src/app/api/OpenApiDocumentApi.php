<?php

namespace app\api;

use OpenApi\Generator;

class OpenApiDocumentApi
{
  private static ?string $document = null;

  public function __invoke($request, $response, $args)
  {
    if (self::$document === null) {
      $openApi = (new Generator())->generate([__DIR__]);
      self::$document = $openApi->toJson();
    }

    $response->getBody()->write(self::$document);
    return $response->withHeader('Content-Type', 'application/json; charset=utf-8');
  }
}