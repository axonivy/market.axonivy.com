<?php

namespace app\pages\sitemap;

use app\domain\market\Market;
use Slim\Psr7\Request;
use Slim\Psr7\Response;
use Slim\Views\Twig;

class SitemapAction
{
  private Twig $view;

  public function __construct(Twig $view)
  {
    $this->view = $view;
  }

  public function __invoke(Request $request, Response $response, $args)
  {
    $baseUrl = $request->getUri()->getScheme() . '://' . $request->getUri()->getHost();
    $sites = [
      self::createSite($baseUrl, '/', 1),
    ];
    foreach(Market::listed() as $product) {
      $sites[] = self::createSite($baseUrl, $product->getUrl(), 1);
    }
    return $this->view->render($response, 'sitemap/sitemap.twig', ['sites' => $sites])->withHeader('Content-Type', 'text/xml');
  }

  private static function createSite($baseUrl, $relativeUrl, $prio): Site
  {
    $site = new Site();
    $site->url =  $baseUrl . $relativeUrl;
    $site->changeFreq = 'daily';
    $site->prio = $prio;
    return $site;
  }
}

class Site
{
  public $url;
  public $changeFreq;
  public $prio;
}
