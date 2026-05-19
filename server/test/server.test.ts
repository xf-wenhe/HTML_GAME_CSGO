import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { io as ioClient } from 'socket.io-client';

describe('Server', () => {
  let socket: any;

  beforeAll(async () => {
    socket = ioClient('http://localhost:3000');
    await new Promise(resolve => socket.on('connect', resolve));
  });

  afterAll(() => {
    socket.close();
  });

  it('should accept client connection', () => {
    expect(socket.connected).toBe(true);
  });
});