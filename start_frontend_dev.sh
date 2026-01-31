#!/bin/bash

cd "$(dirname "$0")/ui"

# Start frontend dev server
echo "🎨 Starting AutoCoder Frontend (Development)"
echo "   Port: 5173"
echo "   API: http://localhost:8889"
# Builder.io not configured
echo ""

npm run dev -- --port 5173 --host
