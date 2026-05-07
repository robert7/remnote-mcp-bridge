#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DIST_DIR="${REPO_ROOT}/dist"

cd "${REPO_ROOT}"

echo "Building production bundle to dist/ (no zip, no hot reload)..."
rm -rf "${DIST_DIR}"
NODE_ENV=production npx webpack --color --progress
