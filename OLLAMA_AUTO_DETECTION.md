# Ollama Auto-Detection System

## Overview

The AutoCoder dev environment now includes a **permanent, automatic Ollama instance detection system**. This solves the problem of Ollama running on different ports by:

1. **Checking common ports** when the dev server starts
2. **Auto-detecting active Ollama instances** without manual configuration
3. **Gracefully falling back** if no instance is found
4. **Supporting multiple parallel Ollama servers** running on different ports

## Problem It Solves

- Ollama is auto-started by system boot and may run on port 11434, 36199, or others
- Hardcoding a port in `.env.dev` meant the backend couldn't find Ollama if it was running elsewhere
- Users had to manually update `.env.dev` to switch Ollama ports

**Solution:** The backend now automatically detects which port Ollama is actually running on.

## How It Works

### 1. Detection Strategy

The system checks ports in this order:
- **11434** (default Ollama port)
- **36199** (alternative common port)
- **11435, 8000, 8080, 5000** (other common service ports)

Each port is tested with a quick HTTP GET request to `/api/tags` with a 1-second timeout.

### 2. Key Components

#### `ollama_detection.py`
Python module that performs auto-detection:
- `detect_ollama_url()` - Scans ports and returns active instance URL
- `get_ollama_url()` - Wrapper with fallback logic
- `_test_ollama_connection()` - HTTP connectivity test

#### `detect_ollama.sh`
Bash script for startup diagnostics and CI/CD integration:
- Color-coded output showing port, URL, and available models
- Useful for debugging or startup logs
- Can be called from `start_dev.sh`

#### `server/ollama_client.py`
Backend integration:
- `get_ollama_base_url()` - Uses detection module with fallback
- Automatically called when backend initializes
- Falls back to `http://localhost:11434` if detection fails

#### `.env.dev`
Environment configuration:
- `OLLAMA_BASE_URL` commented out to enable auto-detection
- Can be explicitly set if you need to override detection

#### `server/routers/assistant_chat.py`
Endpoint configuration:
- Defaults `ai_provider` to `"local"` (Ollama) instead of `"cloud"` (Gemini)
- Ensures quick-chat uses Ollama by default

## Usage

### Starting the Dev Environment

```bash
bash start_dev.sh
```

The backend will automatically:
1. Detect running Ollama instance
2. Connect to that instance
3. Log detection results to console

### Explicit Port (Optional)

If you want to force a specific port:

```bash
# Set in .env.dev
OLLAMA_BASE_URL=http://localhost:36199
```

### Manual Detection

Check which Ollama instance the system found:

```bash
# Bash
bash detect_ollama.sh

# Python
python3 -c "from ollama_detection import get_ollama_url; print(get_ollama_url())"
```

## Verification

Run the comprehensive verification test:

```bash
cd /home/heidi/autocoder
python3 /tmp/test_auto_detect.py
```

Expected output:
```
============================================================
OLLAMA AUTO-DETECTION VERIFICATION
============================================================

1. Testing ollama_detection module:
   Common ports to check: [11434, 36199, 11435, 8000, 8080, 5000]
   detect_ollama_url() returned: http://localhost:11434

2. Testing get_ollama_url() with fallback:
   URL: http://localhost:11434

3. Testing backend ollama_client integration:
   get_ollama_base_url() returned: http://localhost:11434

4. Testing HTTP connection to detected URL:
   ✓ Connected successfully!
   ✓ 3 models available:
     - codellama:latest
     - qwen2.5-coder:3b
     - qwen2.5-coder:7b
```

## Test the Quick-Chat Endpoint

```bash
curl -X POST http://localhost:8889/api/assistant/quick-chat \
  -H "Content-Type: application/json" \
  -d '{"message": "say hello", "model": "qwen2.5-coder:3b"}'
```

Expected response: HTTP 200 with streaming Ollama responses

## Configuration Files Modified

| File | Changes |
|------|---------|
| [ollama_detection.py](ollama_detection.py) | **NEW** - Auto-detection module |
| [detect_ollama.sh](detect_ollama.sh) | **NEW** - Bash detection script |
| [server/ollama_client.py](server/ollama_client.py) | Updated to use auto-detection |
| [server/routers/assistant_chat.py](server/routers/assistant_chat.py#L375) | Changed `ai_provider` default to `"local"` |
| [.env.dev](.env.dev) | Commented out `OLLAMA_BASE_URL` to enable auto-detection |

## Fallback Behavior

If Ollama is not detected on any port:
1. System defaults to `http://localhost:11434`
2. Backend gracefully handles connection errors
3. Quick-chat endpoint returns an error message
4. No crash or hang occurs

## Future Enhancements

- [ ] Support OLLAMA_HOST environment variable
- [ ] Add metrics/logging for detection timing
- [ ] Implement health check UI indicator
- [ ] Support LLM_NAME override for model selection

## Troubleshooting

**Q: Backend can't find Ollama even though it's running?**
- Check `detect_ollama.sh` output: `bash detect_ollama.sh`
- Verify port is in `COMMON_OLLAMA_PORTS` list in [ollama_detection.py](ollama_detection.py#L18)
- Add port to list if needed: Edit line 18

**Q: Want to use a specific Ollama instance?**
- Set explicitly in `.env.dev`: `OLLAMA_BASE_URL=http://localhost:YOUR_PORT`
- Restart backend to apply

**Q: Detection is too slow?**
- Timeout is 1 second per port (6 ports = max 6 seconds)
- Set `OLLAMA_BASE_URL` explicitly to skip detection entirely

## Related Documentation

- [DEVELOPMENT.md](DEVELOPMENT.md) - General dev setup
- [.claude/agents/coder.md](.claude/agents/coder.md) - Code quality standards
- [CLAUDE.md](CLAUDE.md) - Architecture and MCP integration
