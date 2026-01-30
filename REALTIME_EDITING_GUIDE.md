# Real-Time UI Editing with Builder.io in VS Code

## 🎯 Overview

This setup enables seamless real-time UI editing with Builder.io directly integrated into VS Code using:
- **Remote Containers** - Isolated development environment
- **REST Client** - API testing and debugging
- **Live Server** - Hot Module Reloading (HMR)
- **Builder.io Sync** - Environment variable synchronization

## 📋 Prerequisites

### Required Extensions
Install these in VS Code (or use `.vscode/extensions.json`):

```bash
code --install-extension ms-vscode-remote.remote-containers
code --install-extension humao.rest-client
code --install-extension ritwickdey.LiveServer
code --install-extension bradlc.vscode-tailwindcss
code --install-extension esbenp.prettier-vscode
code --install-extension ms-azuretools.vscode-docker
```

### Builder.io Setup
1. Get API key from https://builder.io/account/settings
2. Add to `.env.local`: `VITE_BUILDER_API_KEY=your_key_here`

## 🚀 Quick Start

### Option 1: Remote Container Development (Recommended)

```bash
# 1. Open folder in VS Code
code /home/heidi/Desktop/autocoder

# 2. Press Ctrl+Shift+P and select:
# "Remote-Containers: Reopen in Container"

# 3. Wait for container to build and install deps

# 4. Open terminal (Ctrl+`)
# Backend auto-starts on http://localhost:8888
# Frontend auto-starts on http://localhost:5173
```

### Option 2: Local Development

```bash
# Terminal 1: Backend
cd /home/heidi/Desktop/autocoder
python -m uvicorn server.main:app --reload --host 0.0.0.0 --port 8888

# Terminal 2: Frontend
cd /home/heidi/Desktop/autocoder/ui
npm run dev

# Terminal 3: REST Client Testing
# Open .vscode/builder-api.rest and use REST Client extension
```

## 🔌 Key Components

### 1. Dev Container (.devcontainer/)

**devcontainer.json**
- Python 3.11 + Node 20 Alpine
- Docker-in-Docker support
- Auto-forwarded ports (8888, 5173, 8000)
- Pre-installed extensions

**post-create.sh**
- Installs Python & Node dependencies
- Sets up environment

### 2. REST Client API Testing (.vscode/builder-api.rest)

Pre-configured requests for:
- Builder.io model/content management
- Quick Chat API
- Filesystem operations
- Authentication
- Health checks

**Usage:**
```
1. Open .vscode/builder-api.rest
2. Click "Send Request" above any request
3. View response in side panel
```

### 3. VS Code Settings (.vscode/settings.json)

Auto-configured:
- Python formatting (Ruff)
- TypeScript formatting (Prettier)
- REST Client environment variables
- Tailwind CSS IntelliSense
- File exclusions

### 4. Debug Configuration (.vscode/launch.json)

Available debugging:
- Python: FastAPI Backend
- Chrome: React App
- Node: Vite Dev Server
- **Full Stack** (both backend + frontend)

**Usage:**
```
1. Press F5 or click "Run and Debug" in left sidebar
2. Select "Full Stack (Backend + Frontend)"
3. Set breakpoints in code (click line number)
4. Debug with full IDE support
```

### 5. Tasks Configuration (.vscode/tasks.json)

Pre-defined tasks:
- `Backend: Start FastAPI`
- `Frontend: Start Vite Dev Server`
- `Full Stack: Start (Backend + Frontend)`
- `Docker: Build and Start`
- `Builder.io: Sync Content`
- `Tests: Run Python Tests`
- `Tests: Run E2E Tests`
- `Lint: Python (Ruff)`
- `Lint: TypeScript/React`

**Usage:**
```
Ctrl+Shift+B (or Terminal → Run Task)
Select task to execute
```

## 🎨 Real-Time Workflow

### Step 1: Start Full Stack Development

```bash
# Option A: In container
Ctrl+Shift+P → "Remote-Containers: Reopen in Container"

# Option B: Local
Ctrl+Shift+B → "Full Stack: Start (Backend + Frontend)"
```

### Step 2: Test API with REST Client

```
1. Open .vscode/builder-api.rest
2. Update @builderApiKey with your key
3. Click "Send Request" on any endpoint
4. View results in side panel
```

### Step 3: Edit UI Components

```
1. Edit src/components/QuickChat.tsx
2. Vite HMR auto-reloads browser
3. See changes instantly on http://localhost:5173
```

### Step 4: Debug with Browser DevTools

```
1. Open http://localhost:5173 in browser
2. Press F12 for DevTools
3. Go to "Sources" tab for breakpoints
4. Or use VS Code debug (F5)
```

### Step 5: Sync with Builder.io

```
1. Create content in Builder.io Studio
2. Run task: "Builder.io: Sync Content"
3. Changes auto-sync to your app
```

## 📡 Environment Variables for Builder.io

Create `.env.local` in project root:

```bash
# Builder.io
VITE_BUILDER_API_KEY=your_public_api_key
VITE_BUILDER_PREVIEW_URL=http://localhost:5173
VITE_BUILDER_EDIT_URL=http://localhost:5173?builder.edit=true

# Authentication
AUTOCODER_AUTH_ENABLED=true
AUTOCODER_AUTH_USER=user
AUTOCODER_AUTH_PASS=changeme

# API URLs
VITE_API_URL=http://localhost:8888
```

## 🔍 REST Client Usage Examples

### Get Builder.io Models
```
Open .vscode/builder-api.rest
Find: "Get all Builder.io models"
Click: "Send Request"
```

### Send Quick Chat Message
```
POST request to /api/assistant/quick-chat
Payload:
{
  "message": "Hello AI",
  "mode": "assistant",
  "model": "auto"
}
```

### Health Check
```
Simple GET to /api/health
Returns: { "status": "healthy" }
```

## 🐛 Debugging Tips

### Debug Backend (Python)

```
1. Press F5
2. Select "Python: FastAPI Backend"
3. Set breakpoints by clicking line numbers
4. Make API request to trigger breakpoint
```

### Debug Frontend (React)

```
1. Press F5
2. Select "Chrome: React App"
3. Browser opens with debugging active
4. Set breakpoints in DevTools or VS Code
```

### View Console Output

```
Python Backend: "Backend Output" panel
React Frontend: "Frontend Output" panel
Both visible simultaneously
```

## 🔄 HMR (Hot Module Reload)

Changes auto-reload:
- **Python**: Edit `server/` → auto-reload on save
- **React**: Edit `src/` → auto-reload in browser
- **Styles**: Edit `.css` → instant in browser
- **Types**: TypeScript validation in editor

No manual refresh needed!

## 📊 Browser DevTools Integration

### Source Maps

```
✓ Vite provides source maps for React code
✓ Click stack trace to jump to source
✓ Full TypeScript debugging support
```

### Network Tab

```
✓ Inspect API calls to /api/builder/*
✓ View request/response payloads
✓ Monitor WebSocket for real-time updates
```

### React DevTools

```
1. Install React DevTools browser extension
2. Inspect React component tree
3. View props/state in real-time
```

## 🚨 Troubleshooting

### "Port already in use"

```bash
# Find and kill process on port
lsof -ti:8888 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

### "Remote container fails to build"

```bash
# Rebuild container
Ctrl+Shift+P → "Remote-Containers: Rebuild Container"
```

### "HMR not working"

```bash
# Check Vite config
cat ui/vite.config.ts | grep -A 10 "hmr:"

# Manually refresh browser
Ctrl+Shift+R (hard refresh)
```

### "Builder.io API key invalid"

```bash
# Test API key
curl -H "Authorization: Bearer YOUR_KEY" \
  https://api.builder.io/v1/me

# Update .env.local and restart
```

## 📚 Key Files

| File | Purpose |
|------|---------|
| `.devcontainer/devcontainer.json` | Container configuration |
| `.devcontainer/post-create.sh` | Setup script |
| `.vscode/settings.json` | IDE & formatter settings |
| `.vscode/launch.json` | Debug configurations |
| `.vscode/tasks.json` | Task definitions |
| `.vscode/extensions.json` | Recommended extensions |
| `.vscode/builder-api.rest` | REST Client requests |

## 💡 Pro Tips

1. **Use Compound Debugging**: Run "Full Stack" to debug both frontend + backend
2. **Keyboard Shortcuts**:
   - `Ctrl+Shift+B` - Run task
   - `F5` - Start debugging
   - `Ctrl+` (backtick) - Toggle terminal
3. **REST Client Variables**: Use `@baseUrl`, `@authUser`, etc. in requests
4. **Live Server**: Auto-opens browser on http://localhost:5500
5. **Builder.io Sync**: Run sync task before deploying changes

## 🔗 Resources

- [Builder.io React Docs](https://www.builder.io/docs/react)
- [VS Code Remote Dev](https://code.visualstudio.com/docs/remote/remote-overview)
- [REST Client Extension](https://github.com/Huachao/vscode-restclient)
- [Vite HMR Docs](https://vitejs.dev/guide/hmr.html)
- [FastAPI Docs](https://fastapi.tiangolo.com/)

## 🤝 Support

Need help?
- Check `.vscode/builder-api.rest` for example requests
- Run tasks for common operations
- Use Debug mode for troubleshooting
