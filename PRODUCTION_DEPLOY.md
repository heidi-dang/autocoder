# Production Deployment Guide for AutoCoder

## Current Configuration
- **Domain**: heidiaichat.duckdns.org (from .env.deploy)
- **Email**: heidi.dang.dev@gmail.com
- **App Port**: 8888
- **Public Ports**: 80 (HTTP), 443 (HTTPS), 8888 (direct)

## Prerequisites
This system needs Docker and Docker Compose installed. Install as follows:

```bash
# Install Docker
sudo apt-get update
sudo apt-get install -y docker.io docker-compose

# Verify installation
docker --version
docker compose version
```

## Production Deployment Steps

### 1. Ensure Root Access
The deployment script requires sudo/root privileges:

```bash
sudo bash /home/heidi/autocoder/deploy.sh
```

### 2. Deployment will:
- Build Docker images
- Create traefik-proxy network (if not exists)
- Start Traefik with Let's Encrypt HTTPS
- Start AutoCoder application
- Configure DuckDNS DNS updates
- Issue SSL certificates automatically

### 3. Environment Variables (already configured in .env.deploy):
- DOMAIN=heidiaichat.duckdns.org
- LETSENCRYPT_EMAIL=heidi.dang.dev@gmail.com
- APP_PORT=8888

### 4. Automated Deployment (for CI/CD):
```bash
DOMAIN=heidiaichat.duckdns.org \
DUCKDNS_TOKEN=your-token-here \
LETSENCRYPT_EMAIL=heidi.dang.dev@gmail.com \
sudo bash scripts/deploy_vps.sh
```

## Post-Deployment Verification

### Check Services Running
```bash
docker compose -f docker-compose.yml -f docker-compose.traefik.yml ps
```

### View Logs
```bash
docker compose -f docker-compose.yml -f docker-compose.traefik.yml logs -f
```

### Check Open Ports
```bash
# Check all listening ports
sudo ss -tlnp | grep -E ':(80|443|8888)'

# Or using netstat
sudo netstat -tlnp | grep -E ':(80|443|8888)'
```

### Verify DNS/Cloudflare Tunnel
```bash
# Test DNS resolution
nslookup heidiaichat.duckdns.org
dig heidiaichat.duckdns.org

# Test HTTPS connectivity
curl -v https://heidiaichat.duckdns.org
```

### Health Check Endpoints
```bash
# Health endpoint
curl https://heidiaichat.duckdns.org/health

# Readiness endpoint
curl https://heidiaichat.duckdns.org/readiness

# Metrics (if enabled)
curl https://heidiaichat.duckdns.org/metrics
```

## Troubleshooting

### Certificate Issues
- Ensure ports 80/443 are publicly accessible
- Check DuckDNS points to correct IP
- Verify `letsencrypt/acme.json` permissions (should be 0600)

### App Not Reachable
```bash
# Check container status
docker ps

# View full logs
docker compose -f docker-compose.yml -f docker-compose.traefik.yml logs

# Verify port mapping
docker port autocoder
```

### DNS Not Updating
```bash
# Check DuckDNS cron (if using DuckDNS)
cat /etc/cron.d/duckdns
tail -f /var/log/duckdns.log
```

## Key Files
- **Deployment Script**: `/home/heidi/autocoder/deploy.sh`
- **Docker Compose**: `/home/heidi/autocoder/docker-compose.yml`
- **Traefik Config**: `/home/heidi/autocoder/docker-compose.traefik.yml`
- **Environment**: `/home/heidi/autocoder/.env.deploy`
- **Certificates**: `/home/heidi/autocoder/letsencrypt/acme.json` (auto-renewed)
