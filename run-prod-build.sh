#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${PORT:-8080}"

# Ensure Node.js is available in this shell.
source "${SCRIPT_DIR}/node-check.sh" || exit 1

cd "${SCRIPT_DIR}"

"${SCRIPT_DIR}/scripts/build-prod-dist.sh"

echo "Serving dist/ at http://127.0.0.1:${PORT} (CORS enabled, no hot reload)."
echo "Press Ctrl+C to stop."
node "${SCRIPT_DIR}/scripts/serve-dist.js" --root "${SCRIPT_DIR}/dist" --port "${PORT}"
