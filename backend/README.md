# market.axonivy.com

## Setup
  
Run `./dev.sh` to start the website in docker
  
... and later `docker-compose down` to stop the containers.

## Execute tests

Run `./test.sh` to execute tests.

## VSCode Setup

- Install extension **PHP Intelphense** and follow the Quickstart guide
- Install extension **Twig**

## Update a php library

```
// Show outdated dependencies
docker compose exec web composer show --outdated

// Upgrade dependencies
docker compose exec web composer update --prefer-dist -a --with-all-dependencies
```

## Resources

- SlimFramework <http://www.slimframework.com>
- Template <https://templated.co/introspect>
- JS-Framework <https://github.com/ajlkn/skel>
