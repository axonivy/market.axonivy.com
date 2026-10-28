# market.axonivy.com

## Setup
  
For the Maven package source, export `GITHUB_TOKEN` with a classic GitHub PAT that has `read:packages`, then run `pnpm --dir ../frontend fetch-data` to create the market bundle, index, and artifact cache. With a GitHub Actions artifact, extract those files to the configured data directories instead. Then run `./dev.sh` to start the REST backend in docker.
  
... and later `docker-compose down` to stop the containers.

## REST API

The PHP app exposes JSON endpoints only; legacy Twig pages are not routed.

- `GET /stable/api/product?type=all|connectors|utilities|demos&keyword=...&language=en|de`
- `GET /stable/api/product/{id}/versions?isShowDevVersion=...&designerVersion=...`
- `GET /stable/api/product/{id}/install?productVersion=...`
- `GET /stable/api/product-details/{id}/{version}/bestmatch?isShowDevVersion=...`
- `GET /stable/api/image/{id}` and `/stable/api/image/{id}-dark`
- `GET /stable/openapi.json` for the generated OpenAPI 3.1 contract

The backend reads the same generated files as the frontend. Set `MARKET_PRODUCTS_DIR` to the extracted `market-bundle/products` directory, `MARKET_INDEX_FILE` to the generated `products.json`, and `MARKET_CACHE_DIR` to the generated `public/market-cache` directory. Local Docker mounts these from `frontend`; deployments can provide them from the market Maven package or a GitHub Actions artifact.

## Execute tests

Run `./test.sh` to execute tests.

## VSCode Setup

- Install extension **PHP Intelphense** and follow the Quickstart guide
- Install extension **Twig**

## Update a php library

```
// Show outdated dependencies
docker compose run --rm composer show --outdated

// Upgrade dependencies
docker compose run --rm composer update --prefer-dist -a --with-all-dependencies
```

## Resources

- SlimFramework <http://www.slimframework.com>
- Template <https://templated.co/introspect>
- JS-Framework <https://github.com/ajlkn/skel>
