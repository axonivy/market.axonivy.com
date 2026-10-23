<?php
namespace app\pages\apibrowser;

use Slim\Psr7\Response;
use Slim\Views\Twig;

class ApiBrowserAction
{

  private Twig $view;

  public function __construct(Twig $view)
  {
    $this->view = $view;
  }

  public function __invoke($request, Response $response, $args)
  {
    return $this->view->render($response, 'apibrowser/apibrowser.twig');
  }
}
