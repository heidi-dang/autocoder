#!/bin/bash

cd "$(dirname "$0")"

# Load environment
set -a
source .env.dev
set +a

# Activate virtual environment
source venv/bin/activate

# Start backend with hot reload
echo "🚀 Starting AutoCoder Backend (Development)"
echo "   Port: 8889"
echo "   Ollama: http://localhost:11434"
echo ""

python3 -m uvicorn server.main:app --host 0.0.0.0 --port 8889 --reload

deactivate
