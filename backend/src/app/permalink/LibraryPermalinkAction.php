<?php

namespace app\permalink;

use app\domain\market\Market;
use app\domain\market\VersionResolver;
use app\domain\maven\MavenArtifact;
use Slim\Exception\HttpNotFoundException;
use app\domain\util\Redirect;

class LibraryPermalinkAction
{
  public function __invoke($request, $response, $args)
  {
    $key = $args['key'];
    $product = Market::getProductByKey($key);
    if ($product == null) {
      throw new HttpNotFoundException($request, "product $key does not exist");
    }

    $info = $product->getMavenProductInfo();
    if ($info == null) {
      throw new HttpNotFoundException($request, "no maven artifacts");
    }

    $version = $args['version'];
    $versionToShow = VersionResolver::get($info, $version);

    if ($versionToShow == null) {
      throw new HttpNotFoundException($request, "version $version does not exist");
    }
    $name = $args['name'] ?? ''; // e.g demo-app.zip
    $type = pathinfo($name, PATHINFO_EXTENSION); // e.g. zip 
    $filename = pathinfo($name, PATHINFO_FILENAME); // e.g. demo-app

    $artifacts = array_filter($info->getMavenArtifacts($versionToShow), fn (MavenArtifact $artifact) => $this->isMatching($artifact, $filename, $type));
    if (empty($artifacts)) {
      throw new HttpNotFoundException($request, "no maven artifact for $name");
    }
    $url = array_values($artifacts)[0]->getUrl($versionToShow);
    return Redirect::to($response, $url);
  }

  private function isMatching(MavenArtifact $artifact, string $filename, string $type): bool
  {
    return $artifact->getArtifactId() == $filename && $artifact->getType() == $type;
  }
}
