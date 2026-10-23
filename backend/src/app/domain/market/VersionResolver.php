<?php

namespace app\domain\market;

use app\domain\Version;

class VersionResolver
{
  public static function get(MavenProductInfo $info, string $requestedVersion): ?string
  {
    // redirect to latest version at all
    if ($requestedVersion == 'dev' || $requestedVersion == 'nightly' || $requestedVersion == 'sprint') {
      $v = $info->getNewestVersion();
      if ($v == null) {
        return null;
      }
      return $v;
    }

    // e.g. 10.0-dev
    if (str_ends_with($requestedVersion, '-dev')) {
      $requestedVersion = str_replace('-dev', '', $requestedVersion);
      return self::findNewestDevVersion($info, $requestedVersion);
    }

    // redirect latest
    if ($requestedVersion == 'latest') {
      $v = reset($info->getVersionsReleased());
      if ($v == null) {
        return null;
      }
      return $v;
    }

    $v = new Version($requestedVersion);
    if ($v->isMinor() || $v->isMajor()) {
      $versions = $info->getVersionsReleased();
      foreach ($versions as $ver) {
        if (str_starts_with($ver, $requestedVersion)) {
          return $ver;
        }
      }

      $versions = $info->getVersions();
      foreach ($versions as $ver) {
        if (str_starts_with($ver, $requestedVersion)) {
          return $ver;
        }
      }
    }
    return self::findNewestVersion($info, $requestedVersion);
  }

  public static function findNewestVersion(MavenProductInfo $info, string $version): ?string
  {
    $v = new Version($version);
    if ($v->isMinor() || $v->isMajor()) {
      $versions = $info->getVersionsReleased();
      foreach ($versions as $ver) {
        if (str_starts_with($ver, $version)) {
          return $ver;
        }
      }
      return null;
    }
    return $version;
  }

  public static function findNewestDevVersion(MavenProductInfo $info, string $version): ?string
  {
    $versions = $info->getVersions();
    foreach ($versions as $ver) {
      if (str_starts_with($ver, $version)) {
        return $ver;
      }
    }
    return null;
  }
}
