import express from 'express';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { SERVER_CONFIG } from './config.js';
import { createGameServer } from './index.js';

export function createPublicGameServer(distDir = resolve(process.cwd(), 'client/dist')) {
  const server = createGameServer();
  const indexPath = join(distDir, 'index.html');

  server.app.use(express.static(distDir, {
    extensions: ['html'],
    maxAge: '1h'
  }));

  server.app.get('*', (req, res, next) => {
    if (req.path.startsWith('/socket.io')) {
      next();
      return;
    }
    if (!existsSync(indexPath)) {
      res.status(503).json({ error: 'Client build not found. Run npm run build first.' });
      return;
    }
    res.sendFile(indexPath);
  });

  return server;
}

export function startPublicServer(port: number | string = SERVER_CONFIG.port) {
  const server = createPublicGameServer();
  server.httpServer.listen(port, () => {
    console.log(`Public game server listening on http://localhost:${port}`);
  });
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startPublicServer();
}
