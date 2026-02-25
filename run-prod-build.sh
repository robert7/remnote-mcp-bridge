#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${PORT:-8080}"
DIST_DIR="${SCRIPT_DIR}/dist"

# Ensure Node.js is available in this shell.
source "${SCRIPT_DIR}/node-check.sh" || exit 1

cd "${SCRIPT_DIR}"

echo "Building production bundle to dist/ (no zip, no hot reload)..."
rm -rf "${DIST_DIR}"
NODE_ENV=production npx webpack --color --progress

echo "Serving dist/ at http://127.0.0.1:${PORT} (CORS enabled, no hot reload)."
echo "Press Ctrl+C to stop."

node -e '
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const root = path.resolve(process.argv[1]);
const port = Number(process.argv[2]);

const mimeTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".txt", "text/plain; charset=utf-8"],
]);

function send(res, status, body, contentType = "text/plain; charset=utf-8") {
  res.statusCode = status;
  res.setHeader("Content-Type", contentType);
  res.end(body);
}

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "baggage, sentry-trace, content-type");
  res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    send(res, 405, "Method Not Allowed");
    return;
  }

  let pathname = "/";
  try {
    pathname = decodeURIComponent(new URL(req.url, "http://127.0.0.1").pathname);
  } catch {
    send(res, 400, "Bad Request");
    return;
  }

  const requestPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.resolve(root, `.${requestPath}`);
  if (!filePath.startsWith(root)) {
    send(res, 403, "Forbidden");
    return;
  }

  let stat;
  try {
    stat = fs.statSync(filePath);
  } catch {
    send(res, 404, "Not Found");
    return;
  }

  if (!stat.isFile()) {
    send(res, 404, "Not Found");
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes.get(ext) || "application/octet-stream";
  res.statusCode = 200;
  res.setHeader("Content-Type", contentType);

  if (req.method === "HEAD") {
    res.end();
    return;
  }

  fs.createReadStream(filePath).pipe(res);
});

server.on("error", (error) => {
  console.error(`[run-prod-build] failed to start static server on http://127.0.0.1:${port}`);
  console.error(error.message);
  process.exit(1);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`[run-prod-build] static server listening on http://127.0.0.1:${port}`);
});
' "${DIST_DIR}" "${PORT}"
