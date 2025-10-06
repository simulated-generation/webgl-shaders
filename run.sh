#!/bin/sh
set -e

# Root-level orchestration script
# Later we can add: volume init, cleanup, etc.

echo "[run] Building and starting all containers..."
docker compose up --build

