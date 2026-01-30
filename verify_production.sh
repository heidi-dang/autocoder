#!/bin/bash

# Production Deployment Verification Script for AutoCoder
# Checks all ports, Cloudflare/DuckDNS tunnel, and service health

set -u

DOMAIN="${DOMAIN:-heidiaichat.duckdns.org}"
COLORS_RED='\033[0;31m'
COLORS_GREEN='\033[0;32m'
COLORS_YELLOW='\033[1;33m'
COLORS_NC='\033[0m' # No Color

echo "=========================================="
echo "AutoCoder Production Verification"
echo "=========================================="
echo "Domain: $DOMAIN"
echo ""

# Function to print status
print_status() {
  local status=$1
  local message=$2
  if [ "$status" -eq 0 ]; then
    echo -e "${COLORS_GREEN}✓${COLORS_NC} $message"
  else
    echo -e "${COLORS_RED}✗${COLORS_NC} $message"
  fi
}

# Check Docker installation
echo "1. Checking Docker Installation..."
if command -v docker &> /dev/null; then
  print_status 0 "Docker installed"
  docker --version
else
  print_status 1 "Docker not found"
  echo "  Install with: sudo apt-get install docker.io"
fi
echo ""

# Check Docker Compose
echo "2. Checking Docker Compose..."
if docker compose version &>/dev/null; then
  print_status 0 "Docker Compose installed"
  docker compose version | head -1
else
  print_status 1 "Docker Compose not found"
  echo "  Install with: sudo apt-get install docker-compose"
fi
echo ""

# Check running containers
echo "3. Checking Running Containers..."
if docker ps &>/dev/null 2>&1; then
  RUNNING_COUNT=$(docker ps --filter "status=running" -q | wc -l)
  if [ "$RUNNING_COUNT" -gt 0 ]; then
    print_status 0 "Containers running: $RUNNING_COUNT"
    docker ps --filter "status=running" --format "table {{.Names}}\t{{.Status}}"
  else
    print_status 1 "No containers running"
  fi
else
  print_status 1 "Cannot access Docker (may need sudo)"
fi
echo ""

# Check open ports
echo "4. Checking Open Ports..."
declare -a PORTS=(80 443 8888)
for port in "${PORTS[@]}"; do
  if ss -tlnp 2>/dev/null | grep -q ":$port "; then
    PORT_INFO=$(ss -tlnp 2>/dev/null | grep ":$port " | awk '{print $NF}')
    print_status 0 "Port $port is OPEN ($PORT_INFO)"
  elif sudo ss -tlnp 2>/dev/null | grep -q ":$port "; then
    PORT_INFO=$(sudo ss -tlnp 2>/dev/null | grep ":$port " | awk '{print $NF}')
    print_status 0 "Port $port is OPEN ($PORT_INFO)"
  else
    print_status 1 "Port $port is CLOSED"
  fi
done
echo ""

# Check DNS resolution
echo "5. Checking DNS Resolution ($DOMAIN)..."
if command -v nslookup &> /dev/null; then
  if RESOLVED_IP=$(nslookup "$DOMAIN" 2>/dev/null | grep "Address:" | tail -1 | awk '{print $NF}'); then
    print_status 0 "DNS resolves to: $RESOLVED_IP"
  else
    print_status 1 "DNS resolution failed"
  fi
else
  print_status 1 "nslookup not found"
fi
echo ""

# Check HTTPS connectivity
echo "6. Checking HTTPS Connectivity..."
if command -v curl &> /dev/null; then
  if curl -s -m 5 --max-redirs 2 "https://$DOMAIN" > /dev/null 2>&1; then
    print_status 0 "HTTPS connection successful"
    CERT_INFO=$(curl -s -m 5 --insecure -v "https://$DOMAIN" 2>&1 | grep -i "subject:" | head -1)
    if [ -n "$CERT_INFO" ]; then
      echo "  Certificate: $CERT_INFO"
    fi
  else
    print_status 1 "HTTPS connection failed"
  fi
else
  print_status 1 "curl not found"
fi
echo ""

# Check health endpoints
echo "7. Checking Health Endpoints..."
declare -a ENDPOINTS=("health" "readiness" "metrics")
for endpoint in "${ENDPOINTS[@]}"; do
  if command -v curl &> /dev/null; then
    if RESPONSE=$(curl -s -m 5 -o /dev/null -w "%{http_code}" "https://$DOMAIN/$endpoint" 2>/dev/null); then
      if [ "$RESPONSE" = "200" ]; then
        print_status 0 "/$endpoint endpoint: HTTP $RESPONSE"
      elif [ "$RESPONSE" = "000" ]; then
        print_status 1 "/$endpoint endpoint: Cannot connect"
      else
        echo -e "${COLORS_YELLOW}⚠${COLORS_NC} /$endpoint endpoint: HTTP $RESPONSE"
      fi
    else
      print_status 1 "/$endpoint endpoint: Error"
    fi
  fi
done
echo ""

# Check DuckDNS
echo "8. Checking DuckDNS Configuration..."
if [ -f "/etc/cron.d/duckdns" ]; then
  print_status 0 "DuckDNS cron job configured"
  cat /etc/cron.d/duckdns | grep -v "^#" | head -1
else
  echo -e "${COLORS_YELLOW}⚠${COLORS_NC} DuckDNS cron job not found (will be created during deploy)"
fi
echo ""

# Check certificate storage
echo "9. Checking Let's Encrypt Certificates..."
CERT_FILE="/home/heidi/autocoder/letsencrypt/acme.json"
if [ -f "$CERT_FILE" ]; then
  CERT_SIZE=$(wc -c < "$CERT_FILE")
  print_status 0 "Certificate storage exists ($CERT_SIZE bytes)"
  CERT_PERMS=$(stat -c "%a" "$CERT_FILE" 2>/dev/null || stat -f "%A" "$CERT_FILE" 2>/dev/null)
  echo "  Permissions: $CERT_PERMS (should be 600)"
else
  echo -e "${COLORS_YELLOW}⚠${COLORS_NC} Certificate file not found (will be created during deploy)"
fi
echo ""

echo "=========================================="
echo "Verification Complete"
echo "=========================================="
echo ""
echo "SUMMARY:"
echo "- Ports: Check if 80, 443, 8888 are open"
echo "- DNS: Verify $DOMAIN resolves correctly"
echo "- HTTPS: Ensure certificate is valid"
echo "- Health: Check endpoints are responding"
echo ""
echo "To deploy, run:"
echo "  sudo DOMAIN=$DOMAIN DUCKDNS_TOKEN=<token> LETSENCRYPT_EMAIL=heidi.dang.dev@gmail.com bash /home/heidi/autocoder/deploy.sh"
echo ""
