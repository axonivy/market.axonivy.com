#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
package_dir="$(mktemp -d)"
trap 'rm -rf "$package_dir"' EXIT

mkdir -p "$package_dir/src/web/_market"
cp -R "$root_dir/frontend/dist/." "$package_dir/src/web/"
cp -R "$root_dir/backend/src/app" "$package_dir/src/"
cp "$root_dir/backend/src/web/index.php" \
  "$root_dir/backend/src/web/.htaccess" \
  "$root_dir/backend/src/web/robots.txt" \
  "$package_dir/src/web/"
cp -R "$root_dir/backend/vendor" "$package_dir/"
cp -R "$root_dir/frontend/.market/." "$package_dir/src/web/_market/"

tar -cf "$root_dir/build/ivy-website-market.tar" \
  -C "$package_dir" src vendor