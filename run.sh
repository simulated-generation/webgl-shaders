#!/bin/sh
set -e

mkdir -p volumes/caddy


#cp -r ./src/vortex-front/* /var/www/html/live/ #dedicated script for that for now
echo "[run] Building and starting all containers..."
docker compose up --build
#docker compose up

