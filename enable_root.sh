#!/usr/bin/env bash
set -euo pipefail

# === Config (edit if you want) ===
COMPOSE_FILE="docker-compose.yml"
HOST_PROJECTS_DIR="/opt/autocoder/projects"
CONTAINER_PROJECTS_DIR="/projects"
ALLOWED_ROOTS="$CONTAINER_PROJECTS_DIR"

echo "==> Using compose file: $COMPOSE_FILE"
echo "==> Host dir: $HOST_PROJECTS_DIR"
echo "==> Container dir: $CONTAINER_PROJECTS_DIR"

if [ ! -f "$COMPOSE_FILE" ]; then
  echo "ERROR: $COMPOSE_FILE not found in $(pwd)"
  exit 1
fi

# Ensure host folder exists
mkdir -p "$HOST_PROJECTS_DIR"

# Backup compose
BACKUP="${COMPOSE_FILE}.bak.$(date +%Y%m%d-%H%M%S)"
cp -a "$COMPOSE_FILE" "$BACKUP"
echo "==> Backup created: $BACKUP"

# 1) Add AUTOCODER_ALLOWED_ROOTS under autocoder.environment (idempotent)
if grep -qE '^\s*AUTOCODER_ALLOWED_ROOTS:' "$COMPOSE_FILE"; then
  echo "==> AUTOCODER_ALLOWED_ROOTS already present (skip)"
else
  echo "==> Adding AUTOCODER_ALLOWED_ROOTS to environment"
  # Insert after the AUTOCODER_ALLOW_REMOTE line if present, otherwise after "environment:"
  if grep -qE '^\s*AUTOCODER_ALLOW_REMOTE:' "$COMPOSE_FILE"; then
    sed -i '/^[[:space:]]*AUTOCODER_ALLOW_REMOTE:/a\
      AUTOCODER_ALLOWED_ROOTS: '"$ALLOWED_ROOTS" "$COMPOSE_FILE"
  else
    sed -i '/^[[:space:]]*environment:[[:space:]]*$/a\
      AUTOCODER_ALLOWED_ROOTS: '"$ALLOWED_ROOTS" "$COMPOSE_FILE"
  fi
fi

# 2) Add bind mount to autocoder.volumes (idempotent)
BIND_LINE="      - ${HOST_PROJECTS_DIR}:${CONTAINER_PROJECTS_DIR}"
if grep -qF "$BIND_LINE" "$COMPOSE_FILE"; then
  echo "==> Bind mount already present (skip)"
else
  echo "==> Adding bind mount to volumes"
  # Insert right after the autocoder-data volume line if it exists, otherwise after "volumes:"
  if grep -qE '^\s*-\s*autocoder-data:/root/\.autocoder' "$COMPOSE_FILE"; then
    sed -i '/^[[:space:]]*-\s*autocoder-data:\/root\/\.autocoder/a\
'"$BIND_LINE" "$COMPOSE_FILE"
  else
    sed -i '/^[[:space:]]*volumes:[[:space:]]*$/a\
'"$BIND_LINE" "$COMPOSE_FILE"
  fi
fi

echo "==> Updated $COMPOSE_FILE"
echo "==> Diff:"
diff -u "$BACKUP" "$COMPOSE_FILE" || true

# 3) Restart stack (with traefik override if present)
if [ -f "docker-compose.traefik.yml" ]; then
  echo "==> Restarting with docker-compose.traefik.yml"
  docker compose -f docker-compose.yml -f docker-compose.traefik.yml up -d
else
  echo "==> Restarting with docker-compose.yml only"
  docker compose -f docker-compose.yml up -d
fi

# 4) Quick test (local)
echo "==> Testing filesystem list locally:"
curl -sS "http://127.0.0.1:8888/api/filesystem/list?path=${CONTAINER_PROJECTS_DIR}" | head -n 50 || true

echo "==> Done."
