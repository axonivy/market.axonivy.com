#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
compose=(docker compose --project-directory "$root_dir/backend" -f "$root_dir/backend/compose.yaml")

if ! command -v node >/dev/null 2>&1 || ! node -e 'const [major, minor] = process.versions.node.split(".").map(Number); process.exit(major < 22 || (major === 22 && minor < 18) ? 1 : 0)'; then
	printf 'Node.js 22.18 or newer is required.\n' >&2
	exit 1
fi

if ! command -v pnpm >/dev/null 2>&1; then
	printf 'pnpm must be available in PATH. Activate a Node.js 22.18+ environment first.\n' >&2
	exit 1
fi

pnpm --dir "$root_dir/frontend" install --frozen-lockfile
pnpm --dir "$root_dir/frontend" build
"${compose[@]}" up --build -d
"${compose[@]}" exec web composer install

printf 'Market website is available at http://localhost/\n'