<?php
namespace app\permalink;

use app\domain\market\Market;
use app\domain\market\ProductMavenArtifactDownloader;
use app\domain\market\VersionResolver;
use Slim\Exception\HttpNotFoundException;
use app\domain\util\Redirect;

class DocPermalinkAction
{
  public function __invoke($request, $response, $args)
  {
    $key = $args['key'];
    $product = Market::getProductByKey($key);
    if ($product == null) {
      throw new HttpNotFoundException($request, "product $key does not exist");
    }

    $version = $args['version'];

    $info = $product->getMavenProductInfo();
    if ($info == null) {
      throw new HttpNotFoundException($request, "no maven artifacts");
    }

    $versionToShow = VersionResolver::get($info, $version);
    if ($versionToShow == null) {
      throw new HttpNotFoundException($request, "version $version does not exist");
    }

    $docArtifacts = $info->getDocArtifacts();
    if (empty($docArtifacts)) {
      throw new HttpNotFoundException($request, 'no doc artifact');
    }

    foreach ($docArtifacts as $docArtifact) {
      $exists = (new ProductMavenArtifactDownloader())->downloadArtifact($product, $docArtifact, $versionToShow);
      if ($exists) {        
        $docUrl = $docArtifact->getDocUrl($product, $versionToShow);
        $path = $args['path'] ?? '';
        if (!empty($path)) {
          $path = "/$path";
        }
        return Redirect::to($response, $docUrl . $path);
      }
    }
    throw new HttpNotFoundException($request, "doc artifact does not exist for version $versionToShow");
  }
}
