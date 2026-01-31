#!/bin/bash

# Ollama instance detector
# Used during dev server startup to log which Ollama instance is being used

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}Detecting Ollama instance...${NC}"

# Function to test a port
test_port() {
    local port=$1
    timeout 1 bash -c "echo >/dev/tcp/localhost/$port" 2>/dev/null && return 0 || return 1
}

# Function to check if Ollama is running on a port
check_ollama() {
    local port=$1
    if test_port "$port"; then
        if curl -s "http://localhost:$port/api/tags" >/dev/null 2>&1; then
            echo "$port"
            return 0
        fi
    fi
    return 1
}

# Check common ports
PORTS=(11434 36199 11435 8000 8080 5000)
FOUND_PORT=""

for port in "${PORTS[@]}"; do
    if check_ollama "$port"; then
        FOUND_PORT="$port"
        break
    fi
done

if [ -n "$FOUND_PORT" ]; then
    echo -e "${GREEN}✓ Ollama found on port $FOUND_PORT${NC}"
    echo "  URL: http://localhost:$FOUND_PORT"
    
    # Get available models
    MODELS=$(curl -s "http://localhost:$FOUND_PORT/api/tags" | python3 -c "import sys, json; d=json.load(sys.stdin); print(', '.join([m['name'] for m in d.get('models', [])]))" 2>/dev/null || echo "unknown")
    echo "  Models: $MODELS"
    exit 0
else
    echo -e "${YELLOW}⚠ No Ollama instance detected on common ports${NC}"
    echo "  Checked ports: ${PORTS[*]}"
    echo "  Dev server will fall back to default http://localhost:11434"
    exit 1
fi
