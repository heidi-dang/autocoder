#!/usr/bin/env bash
set -euo pipefail

# Run the local production-like Docker Compose stack
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${REPO_ROOT}"

echo "Bringing up local production-like stack (docker compose)..."

# Use the repository compose file. Allow .env to exist but don't require it.
docker compose -f docker-compose.yml pull || true
docker compose -f docker-compose.yml up -d --build

echo "Local stack started. Use: docker compose ps && docker compose logs -f"
