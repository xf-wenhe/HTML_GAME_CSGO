import { mkdtempSync, writeFileSync } from 'node:fs';
import { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createPublicGameServer } from '../public.js';

describe('public single-port server', () => {
  it('serves the built client shell from the same Express app as Socket.IO', async () => {
    const dist = mkdtempSync(join(tmpdir(), 'fps-public-'));
    writeFileSync(join(dist, 'index.html'), '<main id="app">FPS</main>');
    const server = createPublicGameServer(dist);

    await new Promise<void>(resolve => server.httpServer.listen(0, '127.0.0.1', resolve));
    const address = server.httpServer.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${address.port}/dust2`);

    expect(response.status).toBe(200);
    expect(await response.text()).toContain('FPS');
    server.io.close();
    await new Promise<void>(resolve => server.httpServer.close(() => resolve()));
  });
});
