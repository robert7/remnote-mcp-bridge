import fs from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

type StaticServerModule = {
  createStaticServer: (options: { root: string }) => http.Server;
  isInsideRoot: (root: string, filePath: string) => boolean;
  parseCliArgs: (
    args: string[],
    options?: { defaultPort?: number; defaultRoot?: string }
  ) => { help: boolean; port: string | number; root: string };
  startStaticServer: (options: {
    logger?: { error: (message: string) => void; log: (message: string) => void };
    port?: number;
    root: string;
  }) => http.Server;
};

type ResponseSnapshot = {
  body: string;
  headers: http.IncomingHttpHeaders;
  statusCode: number;
};

const nodeRequire = createRequire(import.meta.url);
const { createStaticServer, isInsideRoot, parseCliArgs, startStaticServer } = nodeRequire(
  '../../scripts/serve-dist.js'
) as StaticServerModule;

const tmpDirs: string[] = [];

afterEach(() => {
  for (const tmpDir of tmpDirs.splice(0)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

function createFixtureRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'remnote-mcp-bridge-dist-'));
  tmpDirs.push(root);
  fs.writeFileSync(path.join(root, 'index.html'), '<html>ok</html>');
  fs.writeFileSync(path.join(root, 'widget.js'), 'console.log("ok");');
  return root;
}

function listen(server: http.Server): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (address && typeof address === 'object') {
        resolve(address.port);
      } else {
        reject(new Error('Server did not expose a TCP port'));
      }
    });
  });
}

function close(server: http.Server): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

async function request(
  server: http.Server,
  method: string,
  requestPath: string
): Promise<ResponseSnapshot> {
  const port = await listen(server);

  return new Promise<ResponseSnapshot>((resolve, reject) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        method,
        path: requestPath,
        port,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('error', reject);
        res.on('end', () => {
          resolve({
            body: Buffer.concat(chunks).toString('utf8'),
            headers: res.headers,
            statusCode: res.statusCode || 0,
          });
        });
      }
    );
    req.on('error', reject);
    req.end();
  }).finally(async () => {
    await close(server);
  });
}

describe('serve-dist static server', () => {
  it('serves index.html with CORS and no-store headers', async () => {
    const server = createStaticServer({ root: createFixtureRoot() });
    const response = await request(server, 'GET', '/');

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe('<html>ok</html>');
    expect(response.headers['access-control-allow-origin']).toBe('*');
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['content-type']).toBe('text/html; charset=utf-8');
  });

  it('serves HEAD requests without a response body', async () => {
    const server = createStaticServer({ root: createFixtureRoot() });
    const response = await request(server, 'HEAD', '/widget.js');

    expect(response.statusCode).toBe(200);
    expect(response.body).toBe('');
    expect(response.headers['content-type']).toBe('text/javascript; charset=utf-8');
  });

  it('handles CORS preflight requests', async () => {
    const server = createStaticServer({ root: createFixtureRoot() });
    const response = await request(server, 'OPTIONS', '/widget.js');

    expect(response.statusCode).toBe(204);
    expect(response.body).toBe('');
    expect(response.headers['access-control-allow-methods']).toBe('GET,HEAD,OPTIONS');
  });

  it('rejects methods outside the static server contract', async () => {
    const server = createStaticServer({ root: createFixtureRoot() });
    const response = await request(server, 'POST', '/widget.js');

    expect(response.statusCode).toBe(405);
    expect(response.body).toBe('Method Not Allowed');
  });

  it('rejects path traversal outside the dist root', async () => {
    const root = createFixtureRoot();
    const server = createStaticServer({ root });
    const response = await request(server, 'GET', '/..%2Fsecret.txt');

    expect(response.statusCode).toBe(403);
    expect(response.body).toBe('Forbidden');
  });

  it('checks root containment without prefix-only false positives', () => {
    const root = path.resolve('/tmp/dist');

    expect(isInsideRoot(root, path.resolve('/tmp/dist/index.html'))).toBe(true);
    expect(isInsideRoot(root, path.resolve('/tmp/dist-neighbor/index.html'))).toBe(false);
  });

  it('parses CLI root and port arguments', () => {
    const parsed = parseCliArgs(['--root', '/tmp/dist', '--port', '9090']);

    expect(parsed).toEqual({
      help: false,
      port: '9090',
      root: '/tmp/dist',
    });
  });

  it('rejects CLI options without required values', () => {
    expect(() => parseCliArgs(['--root'])).toThrow('--root requires a value');
    expect(() => parseCliArgs(['--port'])).toThrow('--port requires a value');
  });

  it('allows port 0 for ephemeral-port startup checks', async () => {
    const messages: string[] = [];
    const server = startStaticServer({
      logger: {
        error: (message: string) => messages.push(message),
        log: (message: string) => messages.push(message),
      },
      port: 0,
      root: createFixtureRoot(),
    });

    await new Promise<void>((resolve) => server.on('listening', resolve));
    await close(server);

    expect(messages[0]).toMatch(
      /\[remnote-mcp-bridge\] static server listening on http:\/\/127\.0\.0\.1:\d+/
    );
    expect(messages[0]).not.toContain(':0');
  });
});
