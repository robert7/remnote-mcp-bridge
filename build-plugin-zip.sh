#!/usr/bin/env bash

# Build RemNote Plugin Zip
# Creates a production build and packages it into PluginZip.zip

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "Building RemNote MCP Bridge plugin..."

# Step 1: Delete PluginZip.zip if it exists
if [ -f "PluginZip.zip" ]; then
    echo "Removing existing PluginZip.zip..."
    rm -f PluginZip.zip || {
        echo -e "${RED}Error: Failed to remove PluginZip.zip${NC}" >&2
        exit 1
    }
fi

# Step 2: Remove dist folder content if it exists
if [ -d "dist" ]; then
    echo "Removing existing dist folder..."
    rm -rf dist || {
        echo -e "${RED}Error: Failed to remove dist folder${NC}" >&2
        exit 1
    }
fi

# Step 3: Create dist folder (npm run build will do this, but ensure it exists)
if [ ! -d "dist" ]; then
    echo "Creating dist folder..."
    mkdir -p dist || {
        echo -e "${RED}Error: Failed to create dist folder${NC}" >&2
        exit 1
    }
fi

# Step 4: Ensure Node.js is available
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Node.js not found in PATH, attempting to source node-check.sh...${NC}"
    if [ -f "node-check.sh" ]; then
        # shellcheck disable=SC1091
        source node-check.sh || {
            echo -e "${RED}Error: Failed to source node-check.sh${NC}" >&2
            exit 1
        }
    else
        echo -e "${RED}Error: Node.js not available and node-check.sh not found${NC}" >&2
        exit 1
    fi
fi

# Verify Node.js is now available
if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is still not available after sourcing node-check.sh${NC}" >&2
    exit 1
fi

# Verify npm is available
if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not available${NC}" >&2
    exit 1
fi

# Step 5: Run npm run build
echo "Running npm run build..."
npm run build || {
    echo -e "${RED}Error: npm run build failed${NC}" >&2
    exit 1
}

# Verify PluginZip.zip was created
if [ ! -f "PluginZip.zip" ]; then
    echo -e "${RED}Error: PluginZip.zip was not created${NC}" >&2
    exit 1
fi

# Success
echo -e "${GREEN}✅ Plugin zip built successfully: PluginZip.zip${NC}"
exit 0
