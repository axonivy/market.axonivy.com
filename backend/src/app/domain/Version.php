<?php

namespace app\domain;

class Version
{

  private string $versionNumber;

  public function __construct(string $versionNumber)
  {
    $this->versionNumber = $versionNumber;
  }

  public static function isValidVersionNumber(string $versionNumber): bool
  {
    $number = str_replace('.', '', $versionNumber);
    return is_numeric($number);
  }

  public function getVersionNumber(): string
  {
    return $this->versionNumber;
  }

  public function isMajor(): bool
  {
    return substr_count($this->getNumbersOnly(), '.') == 0 && $this->isOffical();
  }

  public function isMinor(): bool
  {
    return substr_count($this->getNumbersOnly(), '.') == 1 && $this->isOffical();
  }

  public function isBugfix(): bool
  {
    return substr_count($this->getNumbersOnly(), '.') == 2 && $this->isOffical();
  }

  public function isSnapshot(): bool
  {
    return str_ends_with($this->versionNumber, '-SNAPSHOT');
  }

  public function isSprint(): bool
  {
    return str_contains($this->versionNumber, '-m');
  }

  public function isOffical(): bool
  {
    return !$this->isSnapshot() && !$this->isSprint();
  }

  /**
   * e.g.
   * 6, 7
   *
   * @return string
   */
  public function getMajorVersion(): string
  {
    $v = explode('.', $this->getNumbersOnly());
    $v = array_slice($v, 0, 1);
    return implode('.', $v);
  }

  /**
   * e.g.
   * 6.1 or 3.9
   *
   * @return string
   */
  public function getMinorVersion(): string
  {
    $v = explode('.', $this->getNumbersOnly());
    $v = array_slice($v, 0, 2);
    return implode('.', $v);
  }

  /**
   * e.g.
   * 6.1.2 or 3.9.6
   *
   * @return string
   */
  public function getBugfixVersion(): string
  {
    $v = explode('.', $this->getNumbersOnly());
    $v = array_slice($v, 0, 3);
    return implode('.', $v);
  }

  /**
   * Returns only the minor number of the full version string.
   *
   * @return string
   */
  public function getMinorNumber(): string
  {
    $v = explode('.', $this->getNumbersOnly());
    $v = array_slice($v, 1, 1);
    return implode('.', $v);
  }

  /**
   * Returns only the Bugfix number of the full version string.
   *
   * @return string
   */
  public function getBugfixNumber(): string
  {
    $v = explode('.', $this->getNumbersOnly());
    $v = array_slice($v, 2, 1);
    return implode('.', $v);
  }

  public function getNumbersOnly(): string
  {
    if (str_contains($this->versionNumber, '-')) {
      return substr($this->versionNumber, 0, strpos($this->versionNumber, '-'));
    }
    return $this->versionNumber;
  }
}
