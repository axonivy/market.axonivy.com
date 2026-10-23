<?php

namespace app\pages\product;

use Slim\Exception\HttpNotFoundException;
use Slim\Views\Twig;
use app\domain\market\Market;
use app\domain\market\MavenProductInfo;
use app\domain\market\ProductMavenArtifactDownloader;
use app\domain\market\VersionResolver;
use app\domain\util\Redirect;
use app\ViewerMiddleware;

class ProductAction
{

  private Twig $view;

  public function __construct(Twig $view)
  {
    $this->view = $view;
  }

  public function __invoke($request, $response, $args)
  {
    $key = $args['key'] ?? '';
    $product = Market::getProductByKey($key);
    if ($product == null) {
      throw new HttpNotFoundException($request, "product $key does not exist");
    }

    $version = $args['version'] ?? '';
    $mavenProductInfo = $product->getMavenProductInfo();
    if ($mavenProductInfo == null && !empty($version)) {
      throw new HttpNotFoundException($request, "this product is not versionized");
    }

    // redirect to full version for shortcut versions (e.g. 9, 9.0, dev, nightly, sprint, latest)
    if (!empty($version) && $mavenProductInfo != null) {
      $v = VersionResolver::get($mavenProductInfo, $version);
      if ($v == null) {
        throw new HttpNotFoundException($request, "$key for $version does not exist");
      }
      if ($v != $version) {
        return Redirect::to($response, "/$key/$v");
      }
    }

    $showDevVersions = $this->showDevVersions($request);
    $designerVersion = $this->view->getEnvironment()->getGlobals()[ViewerMiddleware::DESIGNER_VERSION];
    $version = $this->resolveVersionToShow($request, $mavenProductInfo, $showDevVersions, $version, $designerVersion);
    if (!empty($version)) {
      (new ProductMavenArtifactDownloader())->download($product, $version);
    }

    $view = new ProductView($request, $product, $version, $designerVersion, $showDevVersions, $mavenProductInfo);
    return $this->view->render($response, 'product/product.twig', [
      'product' => $product,
      'view' => $view
    ]);
  }

  private function resolveVersionToShow($request, ?MavenProductInfo $mavenProductInfo, bool $showDevVersions, string $version, string $designerVersion): ?string
  {
    if ($mavenProductInfo == null || $mavenProductInfo->getProductArtifact() == null) {
      return $version;
    }

    // favor $version from url
    if (!empty($version)) {
      if ($mavenProductInfo->hasVersion($version)) {
        return $version;
      }
      throw new HttpNotFoundException($request, "version $version does not exist");
    }

    // fallback to latest display version (released)
    $versionToDisplay = $mavenProductInfo->getBestMatchVersion($showDevVersions, $designerVersion);
    if (!empty($versionToDisplay)) {
      return $versionToDisplay;
    }

    // fallback to non released versions
    if (!$showDevVersions) {
      $versionToDisplay = $mavenProductInfo->getBestMatchVersion(true, $designerVersion);
      if (!empty($versionToDisplay)) {
        return $versionToDisplay;
      }
    }

    throw new HttpNotFoundException($request, "no version found to display");
  }

  private function showDevVersions($request): bool
  {
    $showDevVersionCookie = $request->getCookieParams()['showDevVersions'] ?? 'false';
    $showDevVersions = filter_var($showDevVersionCookie, FILTER_VALIDATE_BOOLEAN) ?? false;
    if (isset($request->getQueryParams()['showDevVersions'])) {
      if ($request->getQueryParams()['showDevVersions'] == "true") {
        $showDevVersions = true;
        setcookie('showDevVersions', "true", time()+60*60*24*30*12, "/");
      } else {
        $showDevVersions = false;
        setcookie('showDevVersions', "false", -1, "/");
      }
    }
    return $showDevVersions;
  }
}
