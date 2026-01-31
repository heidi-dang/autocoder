# AutoCoder Dev Environment - Quick Reference

## Status: ✅ Running with Auto-Detection Enabled

Your dev environment is now fully configured with **automatic Ollama instance detection**. No manual port configuration needed!

## Quick Start

```bash
# Start the entire dev environment (auto-detects Ollama)
bash start_dev.sh
```

**What happens:**
1. Backend starts on port `8889` with hot reload
2. Frontend starts on port `5173` with hot reload
3. Auto-detects Ollama instance on any common port
4. SQLite database auto-initializes
5. Ready for development!

## URLs

| Component | URL | Purpose |
|-----------|-----|---------|
| **Frontend** | http://localhost:5173 | React UI - Kanban board, dependency graph |
| **Backend API** | http://localhost:8889 | FastAPI REST endpoints |
| **Quick-Chat** | `POST /api/assistant/quick-chat` | AI chat using local Ollama |
| **WebSocket** | `WS://localhost:8889/ws` | Real-time updates |

## Verify Everything Works

```bash
# Check Ollama detection
bash detect_ollama.sh

# Test API connection
curl http://localhost:8889/api/projects

# Test quick-chat endpoint
curl -X POST http://localhost:8889/api/assistant/quick-chat \
  -H "Content-Type: application/json" \
  -d '{"message": "hello", "model": "qwen2.5-coder:3b"}'
```

## Detected Ollama Instance

**Auto-Detection checks ports (in order):**
- 11434 (default)
- 36199 (alternative)
- 11435, 8000, 8080, 5000 (fallback)

**Currently detected:** http://localhost:11434

**Available models:**
- `codellama:latest`
- `qwen2.5-coder:3b` (default for dev)
- `qwen2.5-coder:7b`

## Override Ollama Port (Optional)

Edit `.env.dev` and set explicitly:

```bash
# .env.dev
OLLAMA_BASE_URL=http://localhost:36199
```

Then restart the backend.

## Stop Dev Environment

```bash
bash stop_dev.sh
```

## Logs

**Backend logs:**
```bash
tail -f .logs/backend.log
```

**Frontend logs:**
```bash
# In browser DevTools: Console tab
# Or in terminal running vite dev server
```

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "Cannot connect to Ollama" | Run `bash detect_ollama.sh` to verify Ollama is running |
| Wrong Ollama port being used | Set `OLLAMA_BASE_URL` explicitly in `.env.dev` |
| Port 8889 already in use | Change `PORT=8889` in `.env.dev` to another port |
| Port 5173 already in use | Frontend auto-shifts to 5174, 5175, etc. |
| Hot reload not working | Stop backend/frontend, delete `.venv`, run `bash start_dev.sh` again |

## Configuration Files

| File | Purpose |
|------|---------|
| [.env.dev](.env.dev) | Backend environment (leave OLLAMA_BASE_URL commented for auto-detection) |
| [ui/.env.development](ui/.env.development) | Frontend environment (API endpoint URL) |
| [ollama_detection.py](ollama_detection.py) | Auto-detection module (scans for Ollama) |
| [detect_ollama.sh](detect_ollama.sh) | Bash script for manual detection |

## Full Documentation

- **Auto-Detection Details:** [OLLAMA_AUTO_DETECTION.md](OLLAMA_AUTO_DETECTION.md)
- **Development Guide:** [DEVELOPMENT.md](DEVELOPMENT.md)
- **Architecture:** [CLAUDE.md](CLAUDE.md)

## One-Liner: Test Everything

```bash
bash start_dev.sh && sleep 3 && python3 -c "from ollama_detection import get_ollama_url; print(f'Ollama: {get_ollama_url()}')" && curl -s http://localhost:8889/api/projects | head -20
```

---

**Last Updated:** 2026-01-31  
**System:** Linux with Python 3.12, Node.js 20, Ollama auto-detected  
**Status:** ✅ All systems operational
