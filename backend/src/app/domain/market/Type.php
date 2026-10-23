<?php

namespace app\domain\market;

class Type
{
  private static $types = null;

  private string $name;
  private string $filter;
  private string $icon;

  public function __construct(string $name, string $filter, string $icon)
  {
    $this->name = $name;
    $this->filter = $filter;
    $this->icon = $icon;
  }

  public function getName(): string
  {
    return $this->name;
  }

  public function getFilter(): string
  {
    return $this->filter;
  }

  public function getIcon(): string
  {
    return $this->icon;
  }

  public static function all(): array
  {
    if (self::$types == null) {
      self::$types = [
        new Type('All Types', '', 'si-types'),
        new Type('Connectors', 'connector', 'si-connector'),
        //new Type('Process Models', 'process', 'si-diagram'),
        new Type('Solutions', 'solution', 'si-lab-flask'),
        new Type('Utils', 'util', 'si-util')
      ];
    }
    return self::$types;
  }
}
