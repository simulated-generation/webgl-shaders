#!/bin/sh
set -e

# Root-level orchestration script
# Later we can add: volume init, cleanup, etc.
#
#

mkdir -p volumes/caddy
doas rm -rf ./volumes/caddy/config
doas rm -rf ./volumes/caddy/data

echo "[run] Building and starting all containers..."
docker compose up --build

