#!/usr/bin/env bash

# Build and package the plugin for marketplace submission.

set -euo pipefail

# Ensure Node.js and npm are available.
source "$(dirname "$0")/node-check.sh" || exit 1

echo "Packaging plugin for marketplace submission..."
npm run build

echo "ZIP file for marketplace submission:"
ls -l *zip
