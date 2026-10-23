<?php

namespace app;

use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\MiddlewareInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Slim\Views\Twig;

class ViewerMiddleware implements MiddlewareInterface
{
  public const IS_DESIGNER = "IS_DESIGNER";
  public const DESIGNER_VERSION = "DESIGNER_VERSION";

  private Twig $view;

  public function __construct(Twig $view)
  {
    $this->view = $view;
  }

  public function process(ServerRequestInterface $request, RequestHandlerInterface $handler): ResponseInterface
  {
    $env = $this->view->getEnvironment();

    $designerVersion = self::readWriteCookie($request, 'ivy-version');
    $env->addGlobal(self::DESIGNER_VERSION, $designerVersion);

    $isDesigner = self::readWriteCookie($request, 'ivy-viewer') == 'designer-market';
    $env->addGlobal(self::IS_DESIGNER, $isDesigner);

    return $handler->handle($request);
  }

  private static function readWriteCookie(ServerRequestInterface $request, string $name): string
  {
    $value = $request->getQueryParams()[$name] ?? '';
    if (!empty($value)) {
      setcookie($name, $value);
      return $value;
    }
    return $request->getCookieParams()[$name] ?? '';
  }
}
