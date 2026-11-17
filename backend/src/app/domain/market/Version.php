<?php

namespace app\domain\market;

final class Version
{
  private function __construct(
    private int $major,
    private int $minor
  ) {
  }

  public static function parseMajorMinor(string $version): ?self
  {
    if (preg_match('/^(\d+)\.(\d+)(?:[.+-].*)?$/', $version, $matches) !== 1) {
      return null;
    }
    return new self((int) $matches[1], (int) $matches[2]);
  }

  public function getMajor(): int
  {
    return $this->major;
  }

  public function getMinor(): int
  {
    return $this->minor;
  }

  public function isOlderThan(self $other): bool
  {
    return $this->major < $other->major ||
      ($this->major === $other->major && $this->minor < $other->minor);
  }
}
