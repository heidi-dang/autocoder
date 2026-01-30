#!/bin/bash
# Builder.io Development Server Launcher
# Starts the dev server with Builder.io integration enabled

set -e

cd "$(dirname "$0")"

echo "🚀 Starting Builder.io Development Server..."
echo ""

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "⚠️  .env.local not found. Creating template..."
    cat > .env.local << 'EOF'
# Builder.io Configuration
# Get your API key from https://builder.io/account/settings
VITE_BUILDER_API_KEY=your_api_key_here
EOF
    echo "✅ Created .env.local"
    echo "📝 Please edit .env.local and add your Builder.io API key"
    echo ""
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    exit 1
fi

echo "📦 Node version: $(node -v)"
echo "📦 npm version: $(npm -v)"
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📥 Installing dependencies..."
    npm install --legacy-peer-deps
    echo ""
fi

# Start dev server
echo "🔥 Vite dev server starting on http://localhost:5173"
echo ""
echo "💡 Tips:"
echo "   - Builder.io Edit Mode: http://localhost:5173?builder.edit=true"
echo "   - API Key from: https://builder.io/account/settings"
echo "   - Docs: https://www.builder.io/docs/react"
echo ""

npm run dev
