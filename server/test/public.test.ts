import { mkdtempSync, writeFileSync } from 'node:fs';
import { IncomingMessage, ServerResponse } from 'node:http';
import { Socket } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createPublicGameServer } from '../public.js';

function requestApp(app: ReturnType<typeof createPublicGameServer>['app'], url: string): Promise<{ status: number; body: string }> {
  return new Promise(resolve => {
    const socket = new Socket();
    const req = new IncomingMessage(socket);
    req.method = 'GET';
    req.url = url;
    req.headers = { host: 'localhost' };

    const res = new ServerResponse(req);
    const chunks: Buffer[] = [];
    const originalWrite = res.write.bind(res);
    const originalEnd = res.end.bind(res);

    res.write = ((chunk: any, ...args: any[]) => {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      return originalWrite(chunk, ...args);
    }) as typeof res.write;
    res.end = ((chunk: any, ...args: any[]) => {
      if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      const result = originalEnd(chunk, ...args);
      resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8') });
      return result;
    }) as typeof res.end;

    app.handle(req, res);
  });
}

describe('public single-port server', () => {
  it('serves the built client shell from the same Express app as Socket.IO', async () => {
    const dist = mkdtempSync(join(tmpdir(), 'fps-public-'));
    writeFileSync(join(dist, 'index.html'), '<main id="app">FPS</main>');
    const server = createPublicGameServer(dist);

    const response = await requestApp(server.app, '/dust2');

    expect(response.status).toBe(200);
    expect(response.body).toContain('FPS');
    server.io.close();
    server.httpServer.close();
  });
});
