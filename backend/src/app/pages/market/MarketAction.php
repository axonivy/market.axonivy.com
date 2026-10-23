<?php
namespace app\pages\market;

use Slim\Views\Twig;
use app\domain\market\Market;
use app\domain\market\Type;
use Slim\Psr7\Request;
use Slim\Psr7\Response;

class MarketAction
{

  private Twig $view;

  public function __construct(Twig $view)
  {
    $this->view = $view;
  }

  public function __invoke(Request $request, Response $response, $args)
  {
    $queryParams = $request->getQueryParams();
    $searchQuery = $queryParams['search'] ?? '';
    $selectedType = $queryParams['type'] ?? '';
    $selectedTags = $queryParams['tags'] ?? '';

    if (isset($queryParams['resultsOnly'])) {
      $env = $this->view->getEnvironment();
      $env->addGlobal('hideSearch', true);
    }

    $listedProducts = Market::listed();

    $types = Type::all();
    $tags = Market::tags($listedProducts);
    array_unshift($tags);

    $filteredProducts = Market::search($listedProducts, $searchQuery);
    $filteredProducts = Market::searchByType($filteredProducts, $selectedType);
    $filteredProducts = Market::searchByTag($filteredProducts, explode(",", $selectedTags));

    $filterSet = !empty($searchQuery) || !empty($selectedType) || !empty($selectedTags);

    return $this->view->render($response, 'market/market.twig', [
      'products' => $filteredProducts,
      'searchQuery' => $searchQuery,
      'types' => $types,
      'selectedType' => $selectedType,
      'tags' => $tags,
      'selectedTags' => $selectedTags,
      'filterSet' => $filterSet
    ]);
  }
}
