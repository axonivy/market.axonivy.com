<?php
namespace app\domain\market;

use League\CommonMark\MarkdownConverter;
use League\CommonMark\Environment\Environment;
use League\CommonMark\Extension\CommonMark\CommonMarkCoreExtension;
use League\CommonMark\Extension\GithubFlavoredMarkdownExtension;
use League\CommonMark\Extension\CommonMark\Node\Inline\Image;
use League\CommonMark\Node\Node;
use League\CommonMark\Renderer\ChildNodeRendererInterface;
use League\CommonMark\Renderer\NodeRendererInterface;
use League\CommonMark\Util\HtmlElement;

class ProductDescription
{

  private string $description;

  private string $demo;

  private string $setup;

  private function __construct(string $description, string $demo, string $setup)
  {
    $this->description = $description;
    $this->demo = $demo;
    $this->setup = $setup;
  }

  public static function create(Product $product, string $version): ProductDescription
  {
    $assetBaseUrl = $product->assetBaseUrl($version);
    $file = $product->getProductFile($version, 'README.md');
    if (file_exists($file)) {
      return self::createByFile($file, $assetBaseUrl); 
    }
    return new ProductDescription('', '', '');
  }
  
  public static function createByFile(string $markdownFile, string $assetBaseUrl): ProductDescription
  {
    $markdownContent = file_get_contents($markdownFile);
    $setupContent = explode('## Setup', $markdownContent);
    $demoContent = explode("## Demo", $setupContent[0] ?? '');
    $description = self::getHtmlOfMarkdown($assetBaseUrl, $demoContent, 0);
    $demo = self::getHtmlOfMarkdown($assetBaseUrl, $demoContent, 1);
    $setup = self::getHtmlOfMarkdown($assetBaseUrl, $setupContent, 1);
    return new ProductDescription($description, $demo, $setup);
  }

  public function getDescription(): string
  {
    return $this->description;
  }

  public function getDemo(): string
  {
    return $this->demo;
  }

  public function getSetup(): string
  {
    return $this->setup;
  }

  private static function getHtmlOfMarkdown(string $assetBaseUrl, array $content, int $index): string
  {
    $markdownContent = $content[$index] ?? '';
    if (empty($markdownContent)) {
      return '';
    }

    $environment = new Environment();
    $environment->addExtension(new CommonMarkCoreExtension());
    $environment->addExtension(new GithubFlavoredMarkdownExtension());
    $environment->addRenderer(Image::class, new MakeImageUrlsAbsolute($assetBaseUrl));
    $converter = new MarkdownConverter($environment);
    return $converter->convert($markdownContent);
  }
}

class MakeImageUrlsAbsolute implements NodeRendererInterface
{
  private string $baseUrl;

  public function __construct(string $baseUrl)
  {
    $this->baseUrl = $baseUrl;
  }

  public function render(Node $node, ChildNodeRendererInterface $childRenderer)
  {
    if ($node instanceof Image) {
      $image = $node;

      $imageUrl = $image->getUrl();
      if (! self::isAbsolute($imageUrl)) {
        $imageUrl = $this->baseUrl . "/$imageUrl";
      }
      return new HtmlElement('img', [
          'src' => $imageUrl,            
          'class' => 'image fit'],
          '', true);
    }
    return "not an image";
  }

  private static function isAbsolute($uri)
  {
    return strpos($uri, '://') !== false;
  }
}
