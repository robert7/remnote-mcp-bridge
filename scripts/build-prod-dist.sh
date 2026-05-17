#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DIST_DIR="${REPO_ROOT}/dist"
WEBPACK_BIN="${REPO_ROOT}/node_modules/.bin/webpack"

cd "${REPO_ROOT}"

echo "Building production bundle to dist/ (no zip, no hot reload)..."
rm -rf "${DIST_DIR}"
if [[ ! -x "${WEBPACK_BIN}" ]]; then
  echo "Local webpack binary not found at ${WEBPACK_BIN}. Run npm install first." >&2
  exit 1
fi

NODE_ENV=production "${WEBPACK_BIN}" --color --progress
