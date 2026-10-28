#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
compose=(docker compose --project-directory "$root_dir/backend" -f "$root_dir/backend/compose.yaml")

pnpm --dir "$root_dir/frontend" install --frozen-lockfile
pnpm --dir "$root_dir/frontend" build
"${compose[@]}" up --build -d
"${compose[@]}" run --rm composer install

printf 'Market website is available at http://localhost/\n'