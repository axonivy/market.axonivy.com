<?php

namespace app\domain\util;

class StringUtil
{

  public static function containsIgnoreCase($string, $contains): bool
  {
    return stripos($string, $contains) !== false;
  }
}
