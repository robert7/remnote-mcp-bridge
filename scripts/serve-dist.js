#!/usr/bin/env node

const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_PORT = 8080;
const DEFAULT_ROOT = path.resolve(__dirname, '..', 'dist');

const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
]);

function send(res, status, body, contentType = 'text/plain; charset=utf-8') {
  res.statusCode = status;
  res.setHeader('Content-Type', contentType);
  res.end(body);
}

function isInsideRoot(root, filePath) {
  const relativePath = path.relative(root, filePath);
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

function resolveRequestPath(root, url) {
  let pathname = '/';
  try {
    pathname = decodeURIComponent(new URL(url, 'http://127.0.0.1').pathname);
  } catch {
    return { errorStatus: 400, errorBody: 'Bad Request' };
  }

  const requestPath = pathname === '/' ? '/index.html' : pathname;
  const filePath = path.resolve(root, `.${requestPath}`);

  if (!isInsideRoot(root, filePath)) {
    return { errorStatus: 403, errorBody: 'Forbidden' };
  }

  return { filePath };
}

function createStaticServer(options = {}) {
  const root = path.resolve(options.root || DEFAULT_ROOT);

  return http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'baggage, sentry-trace, content-type');
    res.setHeader('Access-Control-Allow-Methods', 'GET,HEAD,OPTIONS');
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      send(res, 405, 'Method Not Allowed');
      return;
    }

    const resolved = resolveRequestPath(root, req.url || '/');
    if (resolved.errorStatus) {
      send(res, resolved.errorStatus, resolved.errorBody);
      return;
    }

    let stat;
    try {
      stat = fs.statSync(resolved.filePath);
    } catch {
      send(res, 404, 'Not Found');
      return;
    }

    if (!stat.isFile()) {
      send(res, 404, 'Not Found');
      return;
    }

    const ext = path.extname(resolved.filePath).toLowerCase();
    const contentType = mimeTypes.get(ext) || 'application/octet-stream';
    res.statusCode = 200;
    res.setHeader('Content-Type', contentType);

    if (req.method === 'HEAD') {
      res.end();
      return;
    }

    fs.createReadStream(resolved.filePath).pipe(res);
  });
}

function startStaticServer(options = {}) {
  const root = path.resolve(options.root || DEFAULT_ROOT);
  const port = Number(options.port ?? process.env.PORT ?? DEFAULT_PORT);
  const host = options.host || DEFAULT_HOST;
  const label = options.label || 'remnote-mcp-bridge';
  const logger = options.logger || console;
  const server = createStaticServer({ root });

  server.on('error', (error) => {
    logger.error(`[${label}] failed to start static server on http://${host}:${port}`);
    logger.error(error.message);
    process.exitCode = 1;
  });

  server.listen(port, host, () => {
    const address = server.address();
    const listeningPort = address && typeof address === 'object' ? address.port : port;
    logger.log(`[${label}] static server listening on http://${host}:${listeningPort}`);
  });

  return server;
}

function printHelp(commandName, logger = console) {
  logger.log(`Usage: ${commandName} [--root <dist-dir>] [--port <port>]`);
}

function parseCliArgs(args, options = {}) {
  const parsed = {
    root: options.defaultRoot || DEFAULT_ROOT,
    port: options.defaultPort ?? process.env.PORT ?? DEFAULT_PORT,
    help: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--help' || arg === '-h') {
      parsed.help = true;
    } else if (arg === '--root') {
      if (!args[index + 1]) {
        throw new Error('--root requires a value');
      }
      index += 1;
      parsed.root = args[index];
    } else if (arg === '--port' || arg === '-p') {
      if (!args[index + 1]) {
        throw new Error(`${arg} requires a value`);
      }
      index += 1;
      parsed.port = args[index];
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return parsed;
}

function runCli(args = process.argv.slice(2), options = {}) {
  const commandName = options.commandName || path.basename(process.argv[1] || 'serve-dist');
  const logger = options.logger || console;
  let parsed;

  try {
    parsed = parseCliArgs(args, options);
  } catch (error) {
    logger.error(error.message);
    printHelp(commandName, logger);
    process.exitCode = 1;
    return null;
  }

  if (parsed.help) {
    printHelp(commandName, logger);
    return null;
  }

  return startStaticServer({
    root: parsed.root,
    port: parsed.port,
    host: options.host,
    label: options.label,
    logger,
  });
}

module.exports = {
  DEFAULT_HOST,
  DEFAULT_PORT,
  DEFAULT_ROOT,
  createStaticServer,
  isInsideRoot,
  parseCliArgs,
  resolveRequestPath,
  runCli,
  startStaticServer,
};

if (require.main === module) {
  runCli(process.argv.slice(2), { commandName: 'serve-dist', label: 'run-prod-build' });
}
