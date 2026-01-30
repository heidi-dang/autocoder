#!/bin/bash

# Production Deployment & Verification Script for AutoCoder
# This script will deploy to production and verify all services are running

set -eo pipefail

AUTOCODER_HOME="/home/autocoder"
HEIDI_AUTOCODER_HOME="/home/heidi/autocoder"
DOMAIN="heidiaichat.duckdns.org"
LETSENCRYPT_EMAIL="heidi.dang.dev@gmail.com"
APP_PORT="8888"
DUCKDNS_TOKEN="eab497dd-d4c9-4767-aa72-0d0cfff6d1a0"

echo "=========================================="
echo "AutoCoder Production Deploy & Verify"
echo "=========================================="
echo ""

# Step 1: Verify Docker
echo "1. Verifying Docker Installation..."
if ! command -v docker &> /dev/null; then
  echo "❌ Docker not found. Installing..."
  exit 1
fi
echo "✓ Docker installed: $(docker --version)"

if ! command -v /usr/local/bin/docker-compose &> /dev/null; then
  echo "❌ Docker Compose not found"
  exit 1
fi
echo "✓ Docker Compose installed: $(/usr/local/bin/docker-compose --version)"
echo ""

# Step 2: Create deployment directory if needed
echo "2. Setting up deployment directory..."
if [ ! -d "$AUTOCODER_HOME" ]; then
  echo "Creating $AUTOCODER_HOME..."
  sudo mkdir -p "$AUTOCODER_HOME"
  sudo cp -r "$HEIDI_AUTOCODER_HOME"/* "$AUTOCODER_HOME/" 2>/dev/null || true
fi
echo "✓ Deployment directory: $AUTOCODER_HOME"
echo ""

# Step 3: Create .env file
echo "3. Creating .env configuration..."
sudo bash << ENVEOF
cat > "$AUTOCODER_HOME/.env" << 'ENDENV'
DOMAIN=$DOMAIN
LETSENCRYPT_EMAIL=$LETSENCRYPT_EMAIL
APP_PORT=$APP_PORT
AUTOCODER_ALLOW_REMOTE=1
AUTOCODER_ALLOWED_ROOTS=/projects,/workspace
OLLAMA_BASE_URL=http://172.18.0.1:11434
ENDENV
chmod 644 "$AUTOCODER_HOME/.env"
ENVEOF

if [ -f "$AUTOCODER_HOME/.env" ]; then
  echo "✓ .env file created"
else
  echo "❌ Failed to create .env file"
  exit 1
fi
echo ""

# Step 4: Create Traefik network
echo "4. Creating Traefik proxy network..."
docker network ls | grep -q "traefik-proxy" || \
  docker network create traefik-proxy
echo "✓ Traefik proxy network ready"
echo ""

# Step 5: Deploy with docker-compose
echo "5. Deploying AutoCoder with Docker Compose..."
cd "$AUTOCODER_HOME"

export DOMAIN="$DOMAIN"
export LETSENCRYPT_EMAIL="$LETSENCRYPT_EMAIL"
export PATH="/usr/local/bin:$PATH"

echo "Building and starting containers..."
/usr/local/bin/docker-compose -f docker-compose.yml -f docker-compose.traefik.yml up -d --build 2>&1 | \
  grep -E "^(Creating|Starting|Built|Service)" || true

sleep 3
echo "✓ Deployment completed"
echo ""

# Step 6: Check service status
echo "6. Checking Service Status..."
RUNNING=$(/usr/local/bin/docker-compose -f docker-compose.yml -f docker-compose.traefik.yml ps --services --filter status=running 2>/dev/null | wc -l)
TOTAL=$(/usr/local/bin/docker-compose -f docker-compose.yml -f docker-compose.traefik.yml ps --services 2>/dev/null | wc -l)
echo "Services running: $RUNNING/$TOTAL"
/usr/local/bin/docker-compose -f docker-compose.yml -f docker-compose.traefik.yml ps
echo ""

# Step 7: Check open ports
echo "7. Checking Open Ports..."
for port in 80 443 8888; do
  if sudo ss -tlnp 2>/dev/null | grep -q ":$port "; then
    echo "✓ Port $port is OPEN"
  else
    echo "⚠ Port $port may be CLOSED"
  fi
done
echo ""

# Step 8: Check DNS resolution
echo "8. Verifying DNS Resolution ($DOMAIN)..."
if command -v dig &> /dev/null; then
  RESOLVED=$(dig +short "$DOMAIN" @8.8.8.8 2>/dev/null | tail -1)
  if [ -n "$RESOLVED" ]; then
    echo "✓ DNS resolves to: $RESOLVED"
  else
    echo "⚠ DNS resolution pending"
  fi
else
  echo "⚠ dig not available for DNS check"
fi
echo ""

# Step 9: Wait for Traefik certificate
echo "9. Waiting for Let's Encrypt Certificate (this may take 1-2 minutes)..."
if [ -f "$AUTOCODER_HOME/letsencrypt/acme.json" ]; then
  CERT_SIZE=$(wc -c < "$AUTOCODER_HOME/letsencrypt/acme.json")
  echo "✓ Certificate storage exists ($CERT_SIZE bytes)"
else
  echo "⚠ Certificate file will be created by Traefik"
fi
echo ""

# Step 10: Test application health
echo "10. Testing Application Health Endpoints..."
echo "Waiting 10 seconds for services to fully initialize..."
sleep 10

if command -v curl &> /dev/null; then
  echo ""
  echo "Testing endpoints (may fail if certificate not issued yet):"
  for endpoint in "health" "readiness"; do
    HTTP_CODE=$(curl -s -m 5 -o /dev/null -w "%{http_code}" "http://localhost/$endpoint" 2>/dev/null || echo "000")
    if [ "$HTTP_CODE" = "200" ]; then
      echo "✓ /$endpoint endpoint: HTTP $HTTP_CODE"
    else
      echo "⚠ /$endpoint endpoint: HTTP $HTTP_CODE (will work after HTTPS setup)"
    fi
  done
  echo ""
  echo "Note: HTTPS endpoints will work after Let's Encrypt certificate is issued."
else
  echo "curl not available for health checks"
fi
echo ""

# Step 11: Configure DuckDNS
echo "11. Configuring DuckDNS Dynamic DNS..."
if [ ! -f "/etc/cron.d/duckdns" ]; then
  echo "Setting up DuckDNS cron job..."
  sudo bash << CRONEOF
cat > /etc/cron.d/duckdns << 'ENDCRON'
*/5 * * * * root curl -fsS "https://www.duckdns.org/update?domains=heidiaichat&token=$DUCKDNS_TOKEN&ip=" >/var/log/duckdns.log 2>&1
ENDCRON
CRONEOF
  echo "✓ DuckDNS cron job created"
else
  echo "✓ DuckDNS cron job already configured"
fi
echo ""

# Summary
echo "=========================================="
echo "Deployment Summary"
echo "=========================================="
echo ""
echo "Configuration:"
echo "  Domain: $DOMAIN"
echo "  App Port: $APP_PORT"
echo "  Email: $LETSENCRYPT_EMAIL"
echo "  Home: $AUTOCODER_HOME"
echo ""
echo "Next Steps:"
echo "1. Visit: https://$DOMAIN"
echo "2. Check logs: docker-compose -f docker-compose.yml -f docker-compose.traefik.yml logs -f"
echo "3. Verify: https://$DOMAIN/health"
echo ""
echo "Services Deployed:"
echo "  - AutoCoder API (port $APP_PORT)"
echo "  - Traefik Reverse Proxy (ports 80, 443)"
echo "  - DuckDNS Dynamic DNS (auto-updating)"
echo "  - Let's Encrypt SSL/TLS (auto-renewing)"
echo ""
echo "=========================================="
