#!/bin/bash

docker compose up --build -d
docker compose run --rm composer install

