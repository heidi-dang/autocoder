#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}║         AutoCoder Production Deployment Script            ║${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to print step headers
print_step() {
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  $1${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
}

# Function to print info
print_info() {
    echo -e "${BLUE}ℹ ${NC} $1"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Function to print error
print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Function to prompt for input
prompt_input() {
    local prompt="$1"
    local default="$2"
    local result
    
    if [ -n "$default" ]; then
        read -p "$(echo -e ${BLUE}${prompt}${NC} [${default}]: )" result
        result=${result:-$default}
    else
        read -p "$(echo -e ${BLUE}${prompt}${NC}: )" result
    fi
    
    echo "$result"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

print_step "Step 1: Pre-flight Checks"

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    print_error "Please do not run this script as root. It will request sudo when needed."
    exit 1
fi

print_success "Running as non-root user"

# Check OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    print_info "Detected OS: $NAME $VERSION"
else
    print_error "Cannot detect OS. This script is designed for Linux systems."
    exit 1
fi

print_step "Step 2: Docker Installation"

# Check Docker
if command_exists docker; then
    DOCKER_VERSION=$(docker --version | cut -d ' ' -f3 | cut -d ',' -f1)
    print_success "Docker already installed (version $DOCKER_VERSION)"
else
    print_info "Docker not found. Installing Docker..."
    
    # Update package index
    sudo apt-get update
    
    # Install prerequisites
    sudo apt-get install -y ca-certificates curl gnupg lsb-release
    
    # Add Docker's official GPG key
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
    
    # Set up the repository
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Install Docker Engine
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Add current user to docker group
    sudo usermod -aG docker $USER
    
    print_success "Docker installed successfully"
    print_warning "You may need to log out and back in for group changes to take effect"
fi

# Verify Docker Compose
if docker compose version >/dev/null 2>&1; then
    COMPOSE_VERSION=$(docker compose version --short)
    print_success "Docker Compose installed (version $COMPOSE_VERSION)"
else
    print_error "Docker Compose plugin not found"
    exit 1
fi

print_step "Step 3: Environment Configuration"

print_info "Let's configure your deployment settings"
echo ""

# Prompt for domain information
DOMAIN=$(prompt_input "Enter your primary domain" "yourdomain.com")
AI_DOMAIN=$(prompt_input "Enter your AI subdomain" "ai.$DOMAIN")
API_DOMAIN=$(prompt_input "Enter your API subdomain" "api.$DOMAIN")
OLLAMA_DOMAIN=$(prompt_input "Enter your Ollama subdomain" "ollama.$DOMAIN")

# Prompt for email
EMAIL=$(prompt_input "Enter your email for Let's Encrypt SSL" "admin@$DOMAIN")

# Prompt for app port
APP_PORT=$(prompt_input "Enter the application port" "8888")

# Prompt for deployment directory
DEPLOY_DIR=$(prompt_input "Enter deployment directory" "/home/autocoder")

# Create .env file
print_info "Creating .env file..."

ENV_CONTENT="DOMAIN=$DOMAIN
AI_DOMAIN=$AI_DOMAIN
API_DOMAIN=$API_DOMAIN
OLLAMA_DOMAIN=$OLLAMA_DOMAIN
LETSENCRYPT_EMAIL=$EMAIL
APP_PORT=$APP_PORT
AUTOCODER_ALLOW_REMOTE=1
AUTOCODER_ALLOWED_ROOTS=/projects,/workspace"

# Save env file
echo "$ENV_CONTENT" > "$SCRIPT_DIR/.env.production"
print_success "Environment configuration saved to .env.production"

print_step "Step 4: Cloudflare Tunnel Setup"

print_info "Cloudflare Tunnel provides secure access without exposing your IP"
echo ""

# Check if cloudflared is installed
if command_exists cloudflared; then
    print_success "cloudflared already installed"
else
    print_info "Installing cloudflared..."
    
    # Download and install cloudflared
    wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
    sudo dpkg -i cloudflared-linux-amd64.deb
    rm cloudflared-linux-amd64.deb
    
    print_success "cloudflared installed"
fi

# Check if already authenticated
if [ -f "$HOME/.cloudflared/cert.pem" ]; then
    print_success "Cloudflare already authenticated"
else
    print_warning "You need to authenticate with Cloudflare"
    echo ""
    print_info "This will open a browser window. Please:"
    print_info "  1. Log in to your Cloudflare account"
    print_info "  2. Select your domain"
    print_info "  3. Authorize the tunnel"
    echo ""
    read -p "Press Enter to continue..."
    
    cloudflared tunnel login
    
    if [ -f "$HOME/.cloudflared/cert.pem" ]; then
        print_success "Successfully authenticated with Cloudflare"
    else
        print_error "Authentication failed"
        exit 1
    fi
fi

# Create tunnel
TUNNEL_NAME=$(prompt_input "Enter tunnel name" "autocoder-tunnel")

# Check if tunnel already exists
if cloudflared tunnel list 2>/dev/null | grep -q "$TUNNEL_NAME"; then
    print_warning "Tunnel '$TUNNEL_NAME' already exists"
    REUSE_TUNNEL=$(prompt_input "Reuse existing tunnel? (y/n)" "y")
    
    if [ "$REUSE_TUNNEL" != "y" ]; then
        TUNNEL_NAME="${TUNNEL_NAME}-$(date +%s)"
        print_info "Creating new tunnel: $TUNNEL_NAME"
        cloudflared tunnel create "$TUNNEL_NAME"
    fi
else
    print_info "Creating tunnel: $TUNNEL_NAME"
    cloudflared tunnel create "$TUNNEL_NAME"
fi

# Get tunnel ID
TUNNEL_ID=$(cloudflared tunnel list | grep "$TUNNEL_NAME" | awk '{print $1}')
print_success "Tunnel ID: $TUNNEL_ID"

# Create cloudflared config
print_info "Creating Cloudflare Tunnel configuration..."

mkdir -p "$HOME/.cloudflared"

cat > "$HOME/.cloudflared/config.yml" << EOF
tunnel: $TUNNEL_ID
credentials-file: $HOME/.cloudflared/${TUNNEL_ID}.json

ingress:
  - hostname: $DOMAIN
    service: http://localhost:80
  - hostname: $AI_DOMAIN
    service: http://localhost:$APP_PORT
  - hostname: $API_DOMAIN
    service: http://localhost:$APP_PORT
  - hostname: $OLLAMA_DOMAIN
    service: http://localhost:11434
  - service: http_status:404
EOF

print_success "Cloudflare configuration created"

# DNS Configuration Instructions
print_info "DNS Configuration Required:"
echo ""
print_warning "Please add these CNAME records in your Cloudflare DNS:"
echo ""
echo -e "  ${YELLOW}$DOMAIN${NC} → ${TUNNEL_ID}.cfargotunnel.com"
echo -e "  ${YELLOW}$AI_DOMAIN${NC} → ${TUNNEL_ID}.cfargotunnel.com"
echo -e "  ${YELLOW}$API_DOMAIN${NC} → ${TUNNEL_ID}.cfargotunnel.com"
echo -e "  ${YELLOW}$OLLAMA_DOMAIN${NC} → ${TUNNEL_ID}.cfargotunnel.com"
echo ""
print_info "Steps:"
print_info "  1. Go to https://dash.cloudflare.com"
print_info "  2. Select your domain"
print_info "  3. Go to DNS > Records"
print_info "  4. Add each CNAME record above"
echo ""
read -p "Press Enter once you've added the DNS records..."

print_step "Step 5: Docker Configuration Files"

# Copy project files if needed
if [ "$DEPLOY_DIR" != "$SCRIPT_DIR" ]; then
    print_info "Preparing deployment directory..."
    sudo mkdir -p "$DEPLOY_DIR"
    sudo chown $USER:$USER "$DEPLOY_DIR"
    
    # Copy necessary files
    cp "$SCRIPT_DIR/.env.production" "$DEPLOY_DIR/.env"
    
    # Copy docker compose files
    if [ -f "$SCRIPT_DIR/docker-compose.yml" ]; then
        cp "$SCRIPT_DIR/docker-compose.yml" "$DEPLOY_DIR/"
    fi
    
    if [ -f "$SCRIPT_DIR/docker-compose.traefik.yml" ]; then
        cp "$SCRIPT_DIR/docker-compose.traefik.yml" "$DEPLOY_DIR/"
    fi
    
    print_success "Files copied to $DEPLOY_DIR"
else
    cp "$SCRIPT_DIR/.env.production" "$SCRIPT_DIR/.env"
    DEPLOY_DIR="$SCRIPT_DIR"
fi

# Create welcome page
print_info "Creating welcome page..."
mkdir -p "$DEPLOY_DIR/welcome"

cat > "$DEPLOY_DIR/welcome/index.html" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AutoCoder</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }
        .container {
            text-align: center;
            padding: 2rem;
        }
        h1 {
            font-size: 4rem;
            margin-bottom: 1rem;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        p {
            font-size: 1.5rem;
            margin-bottom: 2rem;
            opacity: 0.9;
        }
        .links {
            display: flex;
            gap: 1rem;
            justify-content: center;
            flex-wrap: wrap;
        }
        a {
            background: rgba(255,255,255,0.2);
            color: white;
            padding: 1rem 2rem;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 500;
            transition: all 0.3s;
            backdrop-filter: blur(10px);
        }
        a:hover {
            background: rgba(255,255,255,0.3);
            transform: translateY(-2px);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 AutoCoder</h1>
        <p>AI-Powered Development Platform</p>
        <div class="links">
            <a href="https://AI_DOMAIN_PLACEHOLDER">Launch App</a>
            <a href="https://API_DOMAIN_PLACEHOLDER/docs">API Docs</a>
        </div>
    </div>
</body>
</html>
EOF

# Replace placeholders
sed -i "s|AI_DOMAIN_PLACEHOLDER|$AI_DOMAIN|g" "$DEPLOY_DIR/welcome/index.html"
sed -i "s|API_DOMAIN_PLACEHOLDER|$API_DOMAIN|g" "$DEPLOY_DIR/welcome/index.html"

print_success "Welcome page created"

# Create Ollama nginx config
print_info "Creating Ollama proxy configuration..."

cat > "$DEPLOY_DIR/ollama-nginx.conf" << 'EOF'
events {
    worker_connections 1024;
}

http {
    server {
        listen 11434;
        location / {
            proxy_pass http://host.docker.internal:11434;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
EOF

print_success "Ollama configuration created"

print_step "Step 6: Building and Starting Services"

cd "$DEPLOY_DIR"

print_info "Starting Docker containers..."

# Build and start containers
docker compose -f docker-compose.yml -f docker-compose.traefik.yml up -d --build

print_success "Docker containers started"

# Wait for services to be ready
print_info "Waiting for services to start..."
sleep 10

# Check health
if curl -f http://localhost:$APP_PORT/health >/dev/null 2>&1; then
    print_success "Application is healthy"
else
    print_warning "Application health check failed (this might be normal on first start)"
fi

print_step "Step 7: Setting Up Cloudflare Tunnel Service"

print_info "Creating systemd service for Cloudflare tunnel..."

sudo tee /etc/systemd/system/cloudflared.service > /dev/null << EOF
[Unit]
Description=Cloudflare Tunnel
After=network.target

[Service]
Type=simple
User=$USER
ExecStart=/usr/local/bin/cloudflared tunnel run $TUNNEL_NAME
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

print_success "Systemd service created"

print_info "Enabling and starting Cloudflare tunnel..."

sudo systemctl daemon-reload
sudo systemctl enable cloudflared
sudo systemctl start cloudflared

# Check tunnel status
sleep 5
if sudo systemctl is-active --quiet cloudflared; then
    print_success "Cloudflare tunnel is running"
else
    print_error "Cloudflare tunnel failed to start"
    print_info "Check logs with: sudo journalctl -u cloudflared -n 50"
fi

print_step "Step 8: Verification"

print_info "Running final checks..."
echo ""

# Check Docker containers
print_info "Docker containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep -v "NAMES"

echo ""

# Check tunnel connections
print_info "Cloudflare tunnel status:"
if sudo systemctl is-active --quiet cloudflared; then
    echo -e "  ${GREEN}✓${NC} Active and running"
else
    echo -e "  ${RED}✗${NC} Not running"
fi

echo ""

# Test endpoints
print_info "Testing endpoints..."
sleep 5

echo -n "  - $DOMAIN: "
if curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN" | grep -q "200\|301\|302"; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⏳ (may take a few minutes)${NC}"
fi

echo -n "  - $AI_DOMAIN: "
if curl -s -o /dev/null -w "%{http_code}" "https://$AI_DOMAIN" | grep -q "200\|301\|302"; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⏳ (may take a few minutes)${NC}"
fi

echo -n "  - $API_DOMAIN/health: "
if curl -s -o /dev/null -w "%{http_code}" "https://$API_DOMAIN/health" | grep -q "200"; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${YELLOW}⏳ (may take a few minutes)${NC}"
fi

print_step "🎉 Deployment Complete!"

echo ""
print_success "Your AutoCoder instance is now deployed!"
echo ""
print_info "Access your services:"
echo -e "  🌐 Website:  ${BLUE}https://$DOMAIN${NC}"
echo -e "  🤖 AI App:   ${BLUE}https://$AI_DOMAIN${NC}"
echo -e "  📡 API:      ${BLUE}https://$API_DOMAIN${NC}"
echo -e "  🦙 Ollama:   ${BLUE}https://$OLLAMA_DOMAIN${NC}"
echo ""
print_info "Useful commands:"
echo "  - View logs:           docker compose -f docker-compose.yml -f docker-compose.traefik.yml logs -f"
echo "  - Restart services:    docker compose -f docker-compose.yml -f docker-compose.traefik.yml restart"
echo "  - Stop services:       docker compose -f docker-compose.yml -f docker-compose.traefik.yml down"
echo "  - Tunnel status:       sudo systemctl status cloudflared"
echo "  - Tunnel restart:      sudo systemctl restart cloudflared"
echo ""
print_warning "Note: SSL certificates may take a few minutes to provision"
print_warning "If services are not accessible immediately, wait 5-10 minutes and try again"
echo ""
print_success "Deployment information saved to: $DEPLOY_DIR/DEPLOYMENT_INFO.txt"

# Save deployment info
cat > "$DEPLOY_DIR/DEPLOYMENT_INFO.txt" << EOF
AutoCoder Production Deployment
================================

Deployment Date: $(date)
Deployed By: $USER

Configuration:
--------------
Domain: $DOMAIN
AI Domain: $AI_DOMAIN
API Domain: $API_DOMAIN
Ollama Domain: $OLLAMA_DOMAIN
Email: $EMAIL
App Port: $APP_PORT
Deploy Directory: $DEPLOY_DIR

Cloudflare Tunnel:
------------------
Tunnel Name: $TUNNEL_NAME
Tunnel ID: $TUNNEL_ID
Config File: $HOME/.cloudflared/config.yml

Services:
---------
- Traefik (Reverse Proxy & SSL)
- AutoCoder API
- Welcome Page
- Ollama Proxy

Management Commands:
--------------------
Docker:
  docker compose -f docker-compose.yml -f docker-compose.traefik.yml logs -f
  docker compose -f docker-compose.yml -f docker-compose.traefik.yml restart
  docker compose -f docker-compose.yml -f docker-compose.traefik.yml down

Tunnel:
  sudo systemctl status cloudflared
  sudo systemctl restart cloudflared
  sudo systemctl stop cloudflared
  sudo journalctl -u cloudflared -n 50

Access URLs:
------------
Website:  https://$DOMAIN
AI App:   https://$AI_DOMAIN
API:      https://$API_DOMAIN/docs
Ollama:   https://$OLLAMA_DOMAIN

Notes:
------
- SSL certificates auto-renew via Let's Encrypt
- Cloudflare tunnel auto-starts on boot
- All services restart automatically on failure
EOF

echo ""
print_info "Happy coding! 🚀"
echo ""
