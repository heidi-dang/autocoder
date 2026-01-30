#!/bin/bash
# Post-create hook for dev container setup

echo "🚀 Setting up development environment..."

# Install Python dependencies
pip install -r requirements.txt --quiet

# Install Node dependencies for UI
cd ui
npm install --legacy-peer-deps --quiet
cd ..

echo "✅ Dev container setup complete!"
echo ""
echo "📌 Available commands:"
echo "  - npm run dev (from ui folder)"
echo "  - python -m uvicorn server.main:app --reload"
echo "  - docker compose up (for production-like environment)"
