#!/bin/bash

cd "$(dirname "$0")"

echo "🚀 Starting AutoCoder Development Environment"
echo ""

# Start backend in background
./start_backend_dev.sh &
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 3

# Start frontend in background
./start_frontend_dev.sh &
FRONTEND_PID=$!

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✓ Development servers started!"
echo ""
echo "  Backend:  http://localhost:8889"
echo "  Frontend: http://localhost:5173"
echo "  API Docs: http://localhost:8889/docs"
echo "  Ollama:   http://localhost:11434"
echo ""
echo "Press Ctrl+C to stop all servers"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Wait for Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM

wait
