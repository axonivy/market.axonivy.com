# market.axonivy.com

## Setup
  
For local development, export `GITHUB_TOKEN` with a classic GitHub PAT that has `read:packages`, then run `pnpm --dir ../frontend fetch-data` to create the meta catalog, market index, and downloaded Maven products. Run `./dev.sh` to build the frontend and start the REST backend in Docker.

The Jenkins deployment tar includes the PHP backend, Composer dependencies, frontend build, product bundle, index, and maven products. The deployed app does not depend on external product or maven products directories.
  
... and later `docker-compose down` to stop the containers.

## REST API

The PHP app exposes JSON endpoints only; legacy Twig pages are not routed.

- `GET /stable/api/product?type=all|connectors|utilities|demos&keyword=...&language=en|de`
- `GET /stable/api/product/{id}/versions?isShowDevVersion=...&designerVersion=...`
- `GET /stable/api/product/{id}/install?productVersion=...`
- `GET /stable/api/product-details/{id}/{version}/bestmatch?isShowDevVersion=...`
- `GET /stable/api/image/{id}` and `/stable/api/image/{id}-dark`
- `GET /stable/openapi.json` for the generated OpenAPI 3.1 contract

The backend reads the same generated files as the frontend. Local Docker mounts them from `frontend`; deployment defaults resolve them from the self-contained tar. The `MARKET_PRODUCTS_DIR`, `MARKET_INDEX_FILE`, and `MARKET_CACHE_DIR` environment variables remain available for local overrides.

## Execute tests

Run `./test.sh` to execute tests.

## VSCode Setup

- Install extension **PHP Intelphense** and follow the Quickstart guide

## Update a php library

```
// Show outdated dependencies
docker compose run --rm composer show --outdated

// Upgrade dependencies
docker compose run --rm composer update --prefer-dist -a --with-all-dependencies
```
