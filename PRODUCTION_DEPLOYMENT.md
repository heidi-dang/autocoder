# AutoCoder Production Deployment Summary

**Deployment Date**: January 31, 2026  
**Status**: ✅ LIVE

## 🚀 Live Endpoints

### Web Services

| Service | URL | Status |
|---------|-----|--------|
| **🎨 AI App** | https://ai.heidiai.com.au | ✅ 200 OK |
| **📡 API** | https://api.heidiai.com.au/health | ✅ 200 OK |
| **🏠 Website** | https://heidiai.com.au | ✅ 302 Redirect |

### AI/ML Services

| Service | URL | Access | Status |
|---------|-----|--------|--------|
| **🦙 Ollama (Direct)** | https://ollama.heidiai.com.au | External | ⚠️ 403 (WAF Blocked) |
| **🦙 Ollama (Via API)** | https://api.heidiai.com.au/ollama | External | ⚠️ 403 (WAF Blocked) |
| **🦙 Ollama (Local)** | http://localhost:11434 | Internal | ✅ Working |

## 📋 Deployment Architecture

### Infrastructure
```
┌─────────────────────────────────────────┐
│ Your Server (Ubuntu 24.04)              │
│ IP: 175.32.184.49                       │
├─────────────────────────────────────────┤
│ Services:                               │
│ ├─ Docker (Traefik + AutoCoder API)    │
│ ├─ Cloudflare Tunnel (cloudflared)      │
│ └─ Ollama (Local, port 11434)           │
└────────────┬────────────────────────────┘
             │
             ▼
        Cloudflare Edge
             │
             ▼
        Public Internet
```

### Service Routing

```yaml
Cloudflare Tunnel Config (heidiai-tunnel):
  
  heidiai.com.au 
    → localhost:80 (Welcome Page)
  
  ai.heidiai.com.au 
    → localhost:8888 (AutoCoder Web App)
  
  api.heidiai.com.au 
    → localhost:8888 (AutoCoder API)
    + path /ollama/* → localhost:11434 (Ollama - WAF Blocked)
  
  ollama.heidiai.com.au 
    → localhost:11434 (Ollama - WAF Blocked)
```

## 🔒 Security

- **SSL/TLS**: Auto-provisioned via Let's Encrypt through Traefik
- **No Public IP Exposure**: All traffic routed through Cloudflare Tunnel
- **Cloudflare WAF**: Active (blocking some Ollama API endpoints)
- **CORS**: Configured for all subdomains

## 📦 Deployment Components

### Docker Services (Running)
✅ **traefik** - Reverse proxy with automatic HTTPS  
✅ **autocoder-api** - FastAPI backend (port 8888)  

### System Services (Running)
✅ **cloudflared** - Cloudflare Tunnel (systemd service)  
✅ **ollama** - AI model server (localhost:11434)

### Included Models
- codellama:latest (7B)
- qwen2.5-coder:3b
- qwen2.5-coder:7b

## ✨ Recent Changes Deployed

### Frontend (UI)
- ✅ QuickChat redesigned - direct AI chat without project selection
- ✅ AI Mode selector moved to header icon (Brain/Zap/Code2)
- ✅ Model selector dropdown
- ✅ Improved UX with minimal onboarding

### Backend  
- ✅ Sandbox settings integration (3-tab modal)
- ✅ Sandbox test endpoint (/api/sandbox/test)
- ✅ Settings API for persisting sandbox config
- ✅ Merged upstream improvements from leonvaszyl/autocoder (25 commits)

### Infrastructure
- ✅ Cloudflare Tunnel setup with 4 subdomains
- ✅ Automatic SSL/TLS with Let's Encrypt
- ✅ Systemd service for tunnel persistence
- ✅ Docker multi-stage build optimization

## 📍 Access Instructions

### For End Users
```bash
# Access the app
https://ai.heidiai.com.au

# View API documentation
https://api.heidiai.com.au/docs

# Check API health
https://api.heidiai.com.au/health
```

### For Developers (Local Machine Access)
```bash
# Access Ollama locally (works perfectly)
curl http://localhost:11434/api/tags

# View running services
docker compose -f docker-compose.yml -f docker-compose.traefik.yml ps

# View tunnel status
sudo systemctl status cloudflared
sudo journalctl -u cloudflared -n 50

# Restart tunnel
sudo systemctl restart cloudflared
```

## ⚠️ Known Issues & Workarounds

### Ollama WAF Blocking

**Problem**: Cloudflare WAF is blocking external API access to Ollama

**Status**: 403 Forbidden on both:
- https://ollama.heidiai.com.au/api/tags
- https://api.heidiai.com.au/ollama/api/tags

**Why**: Cloudflare's security rules flag Ollama's API patterns as suspicious

**Current Workaround**: Use local access from within your network
```bash
# This works fine
curl http://localhost:11434/api/tags
```

**Permanent Solutions**:
1. **Disable WAF for Ollama** (Cloudflare Dashboard > Security > WAF)
2. **Configure WAF rules** to whitelist Ollama endpoints
3. **Use direct IP access** (create A record bypassing tunnel)
4. **Contact Cloudflare support** to whitelist Ollama

See `.cloudflare/OLLAMA_WAF_ISSUE.md` for detailed troubleshooting.

## 📊 Management Commands

### Docker Management
```bash
# View logs
docker compose -f docker-compose.yml -f docker-compose.traefik.yml logs -f

# Restart services
docker compose -f docker-compose.yml -f docker-compose.traefik.yml restart

# Stop all services
docker compose -f docker-compose.yml -f docker-compose.traefik.yml down

# Rebuild and start
docker compose -f docker-compose.yml -f docker-compose.traefik.yml up -d --build
```

### Tunnel Management
```bash
# Check status
sudo systemctl status cloudflared

# View logs
sudo journalctl -u cloudflared -f

# Restart tunnel
sudo systemctl restart cloudflared

# Stop tunnel
sudo systemctl stop cloudflared

# Tunnel is enabled to start on boot
sudo systemctl is-enabled cloudflared
```

### Health Checks
```bash
# Test all endpoints
curl -I https://ai.heidiai.com.au
curl -I https://api.heidiai.com.au/health
curl -I https://heidiai.com.au

# Test local Ollama
curl http://localhost:11434/api/tags
```

## 📁 Configuration Files

```
/home/autocoder/
├── docker-compose.yml              # Main services
├── docker-compose.traefik.yml       # Reverse proxy config
├── .env                             # Environment variables
├── letsencrypt/
│   └── acme.json                   # SSL certificates
└── welcome/
    └── index.html                  # Landing page

/home/heidi/autocoder/
├── ui/dist                         # Built frontend
├── production_deployment.sh         # Deployment script
├── dev_deployment.sh                # Dev setup script
└── .cloudflare/
    ├── CLOUDFLARE_TUNNEL_SETUP.md  # Tunnel setup guide
    ├── SUBDOMAIN_SETUP.md          # DNS configuration
    └── OLLAMA_WAF_ISSUE.md         # Troubleshooting guide

~/.cloudflared/
├── config.yml                      # Tunnel routing rules
├── cert.pem                        # Cloudflare certificate
└── 5034045f-7f1c-4ad4-93c4-0c72b294c610.json  # Tunnel credentials

/etc/systemd/system/
└── cloudflared.service             # Tunnel systemd service
```

## 🎯 Next Steps

1. **Monitor Production**
   - Check tunnel health daily
   - Monitor Docker logs for errors
   - Test endpoints weekly

2. **Fix Ollama Access**
   - Option A: Whitelist in Cloudflare WAF
   - Option B: Use direct IP bypass
   - Option C: Use local access for now

3. **Backup & Maintenance**
   - Backup `.env` and Cloudflare credentials
   - Monitor disk space for Ollama models
   - Test disaster recovery procedures

4. **Scaling Considerations**
   - Monitor API response times
   - Consider load balancing for multiple instances
   - Plan for Ollama model updates

## 📞 Support

For issues:
1. Check `.cloudflare/OLLAMA_WAF_ISSUE.md` for Ollama problems
2. View tunnel logs: `sudo journalctl -u cloudflared -n 100`
3. View Docker logs: `docker compose logs -f`
4. Check API docs: https://api.heidiai.com.au/docs

---

**Deployment Status**: ✅ PRODUCTION READY (except Ollama external access)  
**Last Updated**: January 31, 2026
