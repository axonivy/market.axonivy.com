<?php

namespace app;

use Middlewares\TrailingSlash;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\App;
use Slim\Exception\HttpException;
use Slim\Exception\HttpNotFoundException;
use Slim\Factory\AppFactory;
use Slim\Psr7\Response;
use Throwable;

class Website
{
  private $app;

  function __construct()
  {
    $this->app = AppFactory::create();
    $this->installTrailingSlashRedirect();
    $this->installRoutes();
    $this->installErrorHandling();
    $this->installCors();
  }

  public function getApp(): App
  {
    return $this->app;
  }

  public function start()
  {
    $this->app->run();
  }

  private function installTrailingSlashRedirect()
  {
    $this->app->add((new TrailingSlash(false))->redirect());
  }

  private function installRoutes()
  {
    RoutingRules::installRoutes($this->app);
  }

  private function installErrorHandling()
  {
    $errorMiddleware = $this->app->addErrorMiddleware(false, true, true);
    $jsonErrorHandler = function (ServerRequestInterface $request, Throwable $exception, bool $displayErrorDetails) {
      $response = new Response();
      $status = $exception instanceof HttpException && $exception->getCode() >= 400
        ? $exception->getCode()
        : 500;
      $message = $status < 500 ? $exception->getMessage() : 'Internal Server Error';
      $response->getBody()->write(json_encode(['message' => $message]));
      return $response
        ->withStatus($status)
        ->withHeader('Content-Type', 'application/json; charset=utf-8');
    };
    $errorMiddleware->setErrorHandler(HttpNotFoundException::class, $jsonErrorHandler);
    $errorMiddleware->setDefaultErrorHandler($jsonErrorHandler);
  }

  private function installCors(): void
  {
    $this->app->add(function (ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface {
      if (!str_starts_with($request->getUri()->getPath(), '/stable/')) {
        return $handler->handle($request);
      }

      if ($request->getMethod() === 'OPTIONS') {
        $requestedMethod = strtoupper($request->getHeaderLine('Access-Control-Request-Method'));
        if ($requestedMethod === 'GET') {
          $response = new Response(204);
          $requestedHeaders = $request->getHeaderLine('Access-Control-Request-Headers');
          if ($requestedHeaders !== '') {
            $response = $response->withHeader('Access-Control-Allow-Headers', $requestedHeaders);
          }
          $response = $response->withHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        } else {
          $response = $handler->handle($request);
        }
      } else {
        $response = $handler->handle($request);
      }

      return $response
        ->withHeader('Access-Control-Allow-Origin', '*')
        ->withHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    });
  }
}
