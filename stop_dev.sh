#!/bin/bash

echo "🛑 Stopping development servers..."

# Kill processes on dev ports
lsof -ti:8889 | xargs kill -9 2>/dev/null || true
lsof -ti:5173 | xargs kill -9 2>/dev/null || true

echo "✓ Development servers stopped"
