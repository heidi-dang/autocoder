#!/usr/bin/env bash
set -euo pipefail

# Wrapper to run the repository's deploy.sh for VPS production deployments.
# Usage (recommended):
# DOMAIN=example.duckdns.org DUCKDNS_TOKEN=token LETSENCRYPT_EMAIL=you@example.com sudo ./scripts/deploy_vps.sh

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ -z "${DOMAIN:-}" || -z "${DUCKDNS_TOKEN:-}" || -z "${LETSENCRYPT_EMAIL:-}" ]]; then
  echo "Missing required environment variables. Example usage:" >&2
  echo "DOMAIN=your.duckdns.org DUCKDNS_TOKEN=token LETSENCRYPT_EMAIL=you@example.com sudo $0" >&2
  exit 1
fi

SUDO_CMD="sudo"
if [[ $EUID -eq 0 ]]; then
  SUDO_CMD=""
fi

echo "Running VPS deploy (non-interactive automated mode)..."
${SUDO_CMD} AUTOCODER_AUTOMATED=1 AUTOCODER_ASSUME_YES=1 DOMAIN="${DOMAIN}" DUCKDNS_TOKEN="${DUCKDNS_TOKEN}" LETSENCRYPT_EMAIL="${LETSENCRYPT_EMAIL}" APP_DIR="${APP_DIR:-/home/autocoder}" "${REPO_ROOT}/deploy.sh"
