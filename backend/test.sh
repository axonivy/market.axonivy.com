#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
compose=(docker compose --project-directory "$script_dir" -f "$script_dir/compose.yaml")

"${compose[@]}" exec -u www-data web ./vendor/bin/phpunit
