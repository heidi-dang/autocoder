#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Banner
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                            ║${NC}"
echo -e "${CYAN}║      AutoCoder Development Environment Setup Script       ║${NC}"
echo -e "${CYAN}║                                                            ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
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

# Function to prompt for password/secret
prompt_secret() {
    local prompt="$1"
    local result
    
    read -s -p "$(echo -e ${BLUE}${prompt}${NC}: )" result
    echo ""
    echo "$result"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check if port is in use
port_in_use() {
    lsof -i:"$1" >/dev/null 2>&1
}

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

print_step "Step 1: Pre-flight Checks"

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
    print_error "Please do not run this script as root"
    exit 1
fi

print_success "Running as non-root user"

# Check Node.js
if command_exists node; then
    NODE_VERSION=$(node --version)
    print_success "Node.js installed ($NODE_VERSION)"
else
    print_error "Node.js not found. Installing Node.js..."
    
    # Install Node.js via nvm or apt
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
    
    print_success "Node.js installed"
fi

# Check npm
if command_exists npm; then
    NPM_VERSION=$(npm --version)
    print_success "npm installed ($NPM_VERSION)"
else
    print_error "npm not found"
    exit 1
fi

# Check Python
if command_exists python3; then
    PYTHON_VERSION=$(python3 --version)
    print_success "Python installed ($PYTHON_VERSION)"
else
    print_error "Python 3 not found. Please install Python 3.11+"
    exit 1
fi

# Check pip
if command_exists pip3; then
    print_success "pip3 installed"
else
    print_error "pip3 not found. Installing..."
    sudo apt-get update
    sudo apt-get install -y python3-pip
fi

print_step "Step 2: Development Configuration"

print_info "Let's configure your development environment"
echo ""

# Prompt for ports
BACKEND_PORT=$(prompt_input "Enter backend API port" "8889")
FRONTEND_PORT=$(prompt_input "Enter frontend dev server port" "5173")

# Check if ports are available
if port_in_use "$BACKEND_PORT"; then
    print_warning "Port $BACKEND_PORT is already in use"
    BACKEND_PORT=$(prompt_input "Enter a different backend port" "8890")
fi

if port_in_use "$FRONTEND_PORT"; then
    print_warning "Port $FRONTEND_PORT is already in use"
    FRONTEND_PORT=$(prompt_input "Enter a different frontend port" "5174")
fi

print_success "Ports: Backend=$BACKEND_PORT, Frontend=$FRONTEND_PORT"

# Check for Ollama
print_info "Checking for Ollama..."
OLLAMA_URL=""

if curl -s http://localhost:11434/api/tags >/dev/null 2>&1; then
    print_success "Ollama is running on localhost:11434"
    OLLAMA_URL="http://localhost:11434"
else
    print_warning "Ollama not detected on localhost:11434"
    
    # Check if production Ollama is running
    if docker ps | grep -q ollama; then
        print_info "Production Ollama container detected"
        OLLAMA_URL="http://localhost:11434"
    else
        CUSTOM_OLLAMA=$(prompt_input "Enter Ollama URL (or press Enter to skip)" "http://localhost:11434")
        if [ -n "$CUSTOM_OLLAMA" ]; then
            OLLAMA_URL="$CUSTOM_OLLAMA"
        fi
    fi
fi

if [ -n "$OLLAMA_URL" ]; then
    print_success "Using Ollama at: $OLLAMA_URL"
else
    print_warning "No Ollama configured. You'll need to set it up later."
    OLLAMA_URL="http://localhost:11434"
fi

# Prompt for Builder.io API key
echo ""
print_info "Builder.io Configuration"
print_info "Get your API key from: https://builder.io/account/space"
echo ""

BUILDERIO_API_KEY=$(prompt_input "Enter Builder.io API key (or press Enter to skip)" "")

if [ -n "$BUILDERIO_API_KEY" ]; then
    print_success "Builder.io API key configured"
    USE_BUILDERIO="true"
else
    print_warning "Builder.io not configured. You can add it later."
    USE_BUILDERIO="false"
fi

# Prompt for additional settings
echo ""
GEMINI_API_KEY=$(prompt_input "Enter Gemini API key (optional, press Enter to skip)" "")
ANTHROPIC_API_KEY=$(prompt_input "Enter Anthropic API key (optional, press Enter to skip)" "")

print_step "Step 3: Creating Environment Files"

# Create backend .env
print_info "Creating backend .env file..."

cat > "$SCRIPT_DIR/.env.dev" << EOF
# Development Environment Configuration
ENVIRONMENT=development
DEBUG=true

# Server Configuration
HOST=0.0.0.0
PORT=$BACKEND_PORT
RELOAD=true

# Ollama Configuration
OLLAMA_BASE_URL=$OLLAMA_URL

# CORS Configuration (allow frontend)
CORS_ORIGINS=http://localhost:$FRONTEND_PORT,http://127.0.0.1:$FRONTEND_PORT

# Database
DATABASE_URL=sqlite:///./autocoder_dev.db

# Security (relaxed for dev)
AUTOCODER_ALLOW_REMOTE=1
AUTOCODER_ALLOWED_ROOTS=/tmp,/projects,/workspace,$SCRIPT_DIR/projects

# API Keys
$([ -n "$GEMINI_API_KEY" ] && echo "GEMINI_API_KEY=$GEMINI_API_KEY" || echo "# GEMINI_API_KEY=")
$([ -n "$ANTHROPIC_API_KEY" ] && echo "ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY" || echo "# ANTHROPIC_API_KEY=")

# Logging
LOG_LEVEL=DEBUG
EOF

print_success "Backend configuration created: .env.dev"

# Create frontend .env
print_info "Creating frontend .env file..."

cat > "$SCRIPT_DIR/ui/.env.development" << EOF
# Frontend Development Configuration
VITE_API_URL=http://localhost:$BACKEND_PORT
VITE_WS_URL=ws://localhost:$BACKEND_PORT
$([ -n "$BUILDERIO_API_KEY" ] && echo "VITE_BUILDER_IO_API_KEY=$BUILDERIO_API_KEY" || echo "# VITE_BUILDER_IO_API_KEY=")
VITE_ENVIRONMENT=development
EOF

print_success "Frontend configuration created: ui/.env.development"

# Create Builder.io specific config if API key provided
if [ "$USE_BUILDERIO" = "true" ]; then
    print_info "Setting up Builder.io integration..."
    
    # Check if builder.config.ts exists
    if [ ! -f "$SCRIPT_DIR/ui/builder.config.ts" ]; then
        cat > "$SCRIPT_DIR/ui/builder.config.ts" << EOF
import { defineConfig } from '@builder.io/sdk';

export default defineConfig({
  apiKey: import.meta.env.VITE_BUILDER_IO_API_KEY || '',
  // Add your Builder.io custom components here
  components: [],
});
EOF
        print_success "Builder.io config created"
    else
        print_info "Builder.io config already exists"
    fi
fi

print_step "Step 4: Installing Dependencies"

# Install backend dependencies
print_info "Installing Python dependencies..."
cd "$SCRIPT_DIR"

if [ -f "requirements.txt" ]; then
    # Create virtual environment if it doesn't exist
    if [ ! -d "venv" ]; then
        print_info "Creating Python virtual environment..."
        python3 -m venv venv
    fi
    
    print_info "Activating virtual environment and installing packages..."
    source venv/bin/activate
    pip install -r requirements.txt
    deactivate
    
    print_success "Backend dependencies installed"
else
    print_warning "requirements.txt not found. Skipping backend dependencies."
fi

# Install frontend dependencies
print_info "Installing frontend dependencies..."
cd "$SCRIPT_DIR/ui"

if [ -f "package.json" ]; then
    npm install
    print_success "Frontend dependencies installed"
else
    print_error "package.json not found in ui/ directory"
    exit 1
fi

print_step "Step 5: Database Setup"

print_info "Initializing development database..."
cd "$SCRIPT_DIR"

# Create projects directory if it doesn't exist
mkdir -p "$SCRIPT_DIR/projects"

# Run database migrations if they exist
if [ -f "api/migration.py" ]; then
    source venv/bin/activate
    python3 -c "
from api.database import init_db
init_db()
print('✓ Database initialized')
" 2>/dev/null || print_warning "Database initialization skipped"
    deactivate
else
    print_info "No migration script found. Database will be auto-created on first run."
fi

print_success "Database setup complete"

print_step "Step 6: Creating Start Scripts"

# Create backend start script
print_info "Creating backend start script..."

cat > "$SCRIPT_DIR/start_backend_dev.sh" << EOF
#!/bin/bash

cd "\$(dirname "\$0")"

# Load environment
export \$(cat .env.dev | xargs)

# Activate virtual environment
source venv/bin/activate

# Start backend with hot reload
echo "🚀 Starting AutoCoder Backend (Development)"
echo "   Port: $BACKEND_PORT"
echo "   Ollama: $OLLAMA_URL"
echo ""

python3 -m uvicorn server.main:app --host 0.0.0.0 --port $BACKEND_PORT --reload

deactivate
EOF

chmod +x "$SCRIPT_DIR/start_backend_dev.sh"
print_success "Backend start script created: start_backend_dev.sh"

# Create frontend start script
print_info "Creating frontend start script..."

cat > "$SCRIPT_DIR/start_frontend_dev.sh" << EOF
#!/bin/bash

cd "\$(dirname "\$0")/ui"

# Start frontend dev server
echo "🎨 Starting AutoCoder Frontend (Development)"
echo "   Port: $FRONTEND_PORT"
echo "   API: http://localhost:$BACKEND_PORT"
$([ "$USE_BUILDERIO" = "true" ] && echo "echo \"   Builder.io: Enabled\"" || echo "# Builder.io not configured")
echo ""

npm run dev -- --port $FRONTEND_PORT --host
EOF

chmod +x "$SCRIPT_DIR/start_frontend_dev.sh"
print_success "Frontend start script created: start_frontend_dev.sh"

# Create combined start script
print_info "Creating combined start script..."

cat > "$SCRIPT_DIR/start_dev.sh" << EOF
#!/bin/bash

cd "\$(dirname "\$0")"

echo "🚀 Starting AutoCoder Development Environment"
echo ""

# Start backend in background
./start_backend_dev.sh &
BACKEND_PID=\$!

# Wait a bit for backend to start
sleep 3

# Start frontend in background
./start_frontend_dev.sh &
FRONTEND_PID=\$!

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✓ Development servers started!"
echo ""
echo "  Backend:  http://localhost:$BACKEND_PORT"
echo "  Frontend: http://localhost:$FRONTEND_PORT"
echo "  API Docs: http://localhost:$BACKEND_PORT/docs"
$([ -n "$OLLAMA_URL" ] && echo "echo \"  Ollama:   $OLLAMA_URL\"")
echo ""
echo "Press Ctrl+C to stop all servers"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Wait for Ctrl+C
trap "kill \$BACKEND_PID \$FRONTEND_PID 2>/dev/null; exit" INT TERM

wait
EOF

chmod +x "$SCRIPT_DIR/start_dev.sh"
print_success "Combined start script created: start_dev.sh"

# Create stop script
print_info "Creating stop script..."

cat > "$SCRIPT_DIR/stop_dev.sh" << EOF
#!/bin/bash

echo "🛑 Stopping development servers..."

# Kill processes on dev ports
lsof -ti:$BACKEND_PORT | xargs kill -9 2>/dev/null || true
lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null || true

echo "✓ Development servers stopped"
EOF

chmod +x "$SCRIPT_DIR/stop_dev.sh"
print_success "Stop script created: stop_dev.sh"

print_step "Step 7: VSCode Configuration"

print_info "Creating VSCode launch configuration..."

mkdir -p "$SCRIPT_DIR/.vscode"

cat > "$SCRIPT_DIR/.vscode/launch.json" << EOF
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Python: Backend Server",
      "type": "python",
      "request": "launch",
      "module": "uvicorn",
      "args": [
        "server.main:app",
        "--host",
        "0.0.0.0",
        "--port",
        "$BACKEND_PORT",
        "--reload"
      ],
      "envFile": "\${workspaceFolder}/.env.dev",
      "console": "integratedTerminal",
      "justMyCode": false
    },
    {
      "name": "Frontend: Dev Server",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev", "--", "--port", "$FRONTEND_PORT"],
      "cwd": "\${workspaceFolder}/ui",
      "console": "integratedTerminal"
    }
  ],
  "compounds": [
    {
      "name": "Full Stack",
      "configurations": ["Python: Backend Server", "Frontend: Dev Server"],
      "presentation": {
        "group": "dev",
        "order": 1
      }
    }
  ]
}
EOF

print_success "VSCode launch config created"

print_step "Step 8: Documentation"

# Create development guide
cat > "$SCRIPT_DIR/DEV_GUIDE.md" << EOF
# AutoCoder Development Guide

## 🚀 Quick Start

### Start All Services
\`\`\`bash
./start_dev.sh
\`\`\`

This will start:
- Backend API on http://localhost:$BACKEND_PORT
- Frontend on http://localhost:$FRONTEND_PORT

### Start Services Individually

Backend only:
\`\`\`bash
./start_backend_dev.sh
\`\`\`

Frontend only:
\`\`\`bash
./start_frontend_dev.sh
\`\`\`

### Stop All Services
\`\`\`bash
./stop_dev.sh
\`\`\`

Or press \`Ctrl+C\` in the terminal running \`start_dev.sh\`

## 📁 Project Structure

\`\`\`
autocoder/
├── server/           # Backend FastAPI application
├── ui/              # Frontend React application
├── api/             # Database & API utilities
├── projects/        # Development projects
├── .env.dev         # Backend environment variables
├── ui/.env.development  # Frontend environment variables
└── venv/            # Python virtual environment
\`\`\`

## 🔧 Configuration

### Backend (.env.dev)
- Port: $BACKEND_PORT
- Ollama: $OLLAMA_URL
- Hot reload: Enabled
- Debug mode: Enabled

### Frontend (ui/.env.development)
- Port: $FRONTEND_PORT
- API URL: http://localhost:$BACKEND_PORT
$([ "$USE_BUILDERIO" = "true" ] && echo "- Builder.io: Enabled" || echo "- Builder.io: Not configured")

## 🌐 Access Points

- **Frontend**: http://localhost:$FRONTEND_PORT
- **Backend API**: http://localhost:$BACKEND_PORT
- **API Docs**: http://localhost:$BACKEND_PORT/docs
- **API Redoc**: http://localhost:$BACKEND_PORT/redoc
$([ -n "$OLLAMA_URL" ] && echo "- **Ollama**: $OLLAMA_URL")

## 🔑 API Keys

### Gemini (Google AI)
$([ -n "$GEMINI_API_KEY" ] && echo "✓ Configured" || echo "Not configured - Add to .env.dev")

### Anthropic (Claude)
$([ -n "$ANTHROPIC_API_KEY" ] && echo "✓ Configured" || echo "Not configured - Add to .env.dev")

### Builder.io
$([ "$USE_BUILDERIO" = "true" ] && echo "✓ Configured" || echo "Not configured - Add to ui/.env.development")

To add API keys later:
1. Edit \`.env.dev\` for backend keys
2. Edit \`ui/.env.development\` for frontend keys
3. Restart the respective service

## 🛠️ Development Tools

### VSCode Debugging
Use the VSCode debugger with these launch configurations:
- **Full Stack**: Starts both backend and frontend
- **Python: Backend Server**: Backend only
- **Frontend: Dev Server**: Frontend only

Press \`F5\` or use the Run and Debug panel.

### Hot Reload
Both frontend and backend have hot reload enabled:
- Backend: Changes to Python files auto-restart server
- Frontend: Changes to React files auto-refresh browser

### Database
SQLite database: \`autocoder_dev.db\`

To reset database:
\`\`\`bash
rm autocoder_dev.db
# Restart backend to recreate
\`\`\`

## 📦 Adding Dependencies

### Backend (Python)
\`\`\`bash
source venv/bin/activate
pip install package-name
pip freeze > requirements.txt
deactivate
\`\`\`

### Frontend (Node)
\`\`\`bash
cd ui
npm install package-name
\`\`\`

## 🧪 Testing

### Run Backend Tests
\`\`\`bash
source venv/bin/activate
pytest
deactivate
\`\`\`

### Run Frontend Tests
\`\`\`bash
cd ui
npm test
\`\`\`

## 🐛 Troubleshooting

### Port Already in Use
\`\`\`bash
./stop_dev.sh
# Or manually:
lsof -ti:$BACKEND_PORT | xargs kill -9
lsof -ti:$FRONTEND_PORT | xargs kill -9
\`\`\`

### Backend Won't Start
1. Check if virtual environment is activated
2. Verify all dependencies installed: \`pip install -r requirements.txt\`
3. Check \`.env.dev\` configuration
4. View logs for errors

### Frontend Won't Start
1. Check if node_modules installed: \`cd ui && npm install\`
2. Verify \`.env.development\` exists
3. Check for port conflicts

### Ollama Connection Failed
1. Verify Ollama is running: \`curl http://localhost:11434/api/tags\`
2. Check OLLAMA_BASE_URL in \`.env.dev\`
3. Update URL and restart backend

## 📝 Git Workflow

\`\`\`bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes and commit
git add .
git commit -m "Add your feature"

# Push to remote
git push origin feature/your-feature
\`\`\`

## 🔗 Useful Commands

\`\`\`bash
# View backend logs
tail -f logs/autocoder.log

# Check running processes
ps aux | grep uvicorn
ps aux | grep vite

# Check port usage
lsof -i:$BACKEND_PORT
lsof -i:$FRONTEND_PORT

# Rebuild frontend
cd ui && npm run build

# Format code
cd ui && npm run format
\`\`\`

## 📚 Resources

- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [React Docs](https://react.dev/)
- [Vite Docs](https://vitejs.dev/)
$([ "$USE_BUILDERIO" = "true" ] && echo "- [Builder.io Docs](https://www.builder.io/c/docs)")
- [Ollama API](https://github.com/ollama/ollama/blob/main/docs/api.md)

---

Happy coding! 🚀
EOF

print_success "Development guide created: DEV_GUIDE.md"

print_step "🎉 Development Environment Setup Complete!"

echo ""
print_success "Your development environment is ready!"
echo ""
print_info "Configuration Summary:"
echo -e "  Backend Port:      ${CYAN}$BACKEND_PORT${NC}"
echo -e "  Frontend Port:     ${CYAN}$FRONTEND_PORT${NC}"
echo -e "  Ollama URL:        ${CYAN}$OLLAMA_URL${NC}"
$([ "$USE_BUILDERIO" = "true" ] && echo -e "  Builder.io:        ${GREEN}✓ Enabled${NC}" || echo -e "  Builder.io:        ${YELLOW}Not configured${NC}")
$([ -n "$GEMINI_API_KEY" ] && echo -e "  Gemini API:        ${GREEN}✓ Configured${NC}" || echo -e "  Gemini API:        ${YELLOW}Not configured${NC}")
$([ -n "$ANTHROPIC_API_KEY" ] && echo -e "  Anthropic API:     ${GREEN}✓ Configured${NC}" || echo -e "  Anthropic API:     ${YELLOW}Not configured${NC}")
echo ""
print_info "Quick Start Commands:"
echo ""
echo -e "  ${CYAN}./start_dev.sh${NC}          - Start all services"
echo -e "  ${CYAN}./start_backend_dev.sh${NC}  - Start backend only"
echo -e "  ${CYAN}./start_frontend_dev.sh${NC} - Start frontend only"
echo -e "  ${CYAN}./stop_dev.sh${NC}           - Stop all services"
echo ""
print_info "Access Your App:"
echo ""
echo -e "  🌐 Frontend:  ${BLUE}http://localhost:$FRONTEND_PORT${NC}"
echo -e "  📡 Backend:   ${BLUE}http://localhost:$BACKEND_PORT${NC}"
echo -e "  📚 API Docs:  ${BLUE}http://localhost:$BACKEND_PORT/docs${NC}"
echo ""
print_info "Documentation:"
echo -e "  📖 Read ${CYAN}DEV_GUIDE.md${NC} for detailed development instructions"
echo ""
print_warning "Note: Make sure Ollama is running if you want to use AI features"
$([ "$USE_BUILDERIO" = "false" ] && echo -e "${YELLOW}⚠${NC}  Add Builder.io API key to ui/.env.development to enable Builder.io")
echo ""
print_success "Happy coding! 🚀"
echo ""

# Save configuration
cat > "$SCRIPT_DIR/DEV_CONFIG.txt" << EOF
AutoCoder Development Environment
==================================

Setup Date: $(date)
Setup By: $USER

Configuration:
--------------
Backend Port: $BACKEND_PORT
Frontend Port: $FRONTEND_PORT
Ollama URL: $OLLAMA_URL
Builder.io: $([ "$USE_BUILDERIO" = "true" ] && echo "Enabled" || echo "Not configured")
Gemini API: $([ -n "$GEMINI_API_KEY" ] && echo "Configured" || echo "Not configured")
Anthropic API: $([ -n "$ANTHROPIC_API_KEY" ] && echo "Configured" || echo "Not configured")

Files Created:
--------------
- .env.dev (Backend configuration)
- ui/.env.development (Frontend configuration)
- start_dev.sh (Start all services)
- start_backend_dev.sh (Start backend)
- start_frontend_dev.sh (Start frontend)
- stop_dev.sh (Stop all services)
- DEV_GUIDE.md (Development documentation)
- .vscode/launch.json (VSCode debugging)
$([ "$USE_BUILDERIO" = "true" ] && echo "- ui/builder.config.ts (Builder.io configuration)")

Quick Start:
------------
1. Start all services: ./start_dev.sh
2. Open browser: http://localhost:$FRONTEND_PORT
3. View API docs: http://localhost:$BACKEND_PORT/docs

Or use VSCode debugger (F5) with "Full Stack" configuration

Environment Files:
------------------
Backend:  .env.dev
Frontend: ui/.env.development

To modify configuration, edit these files and restart services.
EOF

print_info "Configuration saved to: DEV_CONFIG.txt"
