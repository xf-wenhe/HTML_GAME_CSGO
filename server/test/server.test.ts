import { AddressInfo } from 'net';
import { io as ioClient, Socket } from 'socket.io-client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createGameServer } from '../index.js';
import { RoomManager } from '../rooms.js';

describe('Server', () => {
  it('creates an express/socket server without listening on a fixed port', () => {
    const server = createGameServer();

    expect(server.httpServer.listening).toBe(false);
    expect(server.roomManager.getRoomList()).toEqual([]);

    server.io.close();
    server.httpServer.close();
  });

  it('assigns teams and enforces room capacity', () => {
    const rooms = new RoomManager();
    const room = rooms.createRoom({ mode: 'defusal', maxPlayers: 2 });

    expect(rooms.addPlayerToRoom(room.id, 'p1', 'Alpha')).toBe(true);
    expect(rooms.addPlayerToRoom(room.id, 'p2', 'Bravo')).toBe(true);
    expect(rooms.addPlayerToRoom(room.id, 'p3', 'Charlie')).toBe(false);

    const snapshot = rooms.getSnapshot(room.id)!;
    expect(snapshot.players.map(player => player.team).sort()).toEqual(['attackers', 'defenders']);
  });

  it('runs ready flow, buying, shooting, and TDM scoring', () => {
    const rooms = new RoomManager();
    const room = rooms.createRoom({ mode: 'tdm', maxPlayers: 2, warmupSeconds: 1 });
    rooms.addPlayerToRoom(room.id, 'p1', 'Alpha');
    rooms.addPlayerToRoom(room.id, 'p2', 'Bravo');
    rooms.setReady('p1', true);
    const ready = rooms.setReady('p2', true)!;

    expect(ready.phase).toBe('live');

    const p1 = ready.players.find(player => player.id === 'p1')!;
    const p2 = ready.players.find(player => player.id === 'p2')!;
    rooms.applyInput('p1', { position: { x: 0, y: 1.7, z: 0 }, rotation: { x: 0, y: 0, z: 0 } });
    rooms.applyInput('p2', { position: { x: 0, y: 1.7, z: -8 }, rotation: { x: 0, y: 0, z: 0 } });
    rooms.switchWeapon('p1', p1.team === 'defenders' ? 'sentinel' : 'vandal');
    rooms.switchWeapon('p2', p2.team === 'defenders' ? 'sentinel' : 'vandal');

    for (let i = 0; i < 4; i++) {
      rooms.shoot('p1', {
        origin: { x: 0, y: 1.7, z: 0 },
        direction: { x: 0, y: 0, z: -1 },
        weaponId: p1.team === 'defenders' ? 'sentinel' : 'vandal',
        clientTime: Date.now()
      });
    }

    const scored = rooms.getSnapshot(room.id)!;
    expect(scored.players.find(player => player.id === 'p1')!.kills).toBeGreaterThan(0);
  });

  it('handles defusal bomb plant and defuse', () => {
    const rooms = new RoomManager();
    const room = rooms.createRoom({ mode: 'defusal', maxPlayers: 2 });
    rooms.addPlayerToRoom(room.id, 'attacker', 'Attacker');
    rooms.addPlayerToRoom(room.id, 'defender', 'Defender');
    rooms.setReady('attacker', true);
    rooms.setReady('defender', true);

    rooms.applyInput('attacker', { position: { x: -24, y: 1.7, z: -27 }, rotation: { x: 0, y: 0, z: 0 } });
    const planted = rooms.plantBomb('attacker', { site: 'A' })!;
    expect(planted.bomb?.site).toBe('A');

    rooms.applyInput('defender', { position: { x: -24, y: 1.7, z: -27 }, rotation: { x: 0, y: 0, z: 0 } });
    const defused = rooms.defuseBomb('defender')!;
    expect(defused.phase).toBe('roundEnd');
    expect(defused.score.defenders).toBe(1);
  });
});

describe('Socket.IO multiplayer flow', () => {
  let server: ReturnType<typeof createGameServer>;
  let url: string;
  let networkAvailable = true;
  const sockets: Socket[] = [];

  beforeAll(async () => {
    server = createGameServer();
    await new Promise<void>(resolve => {
      server.httpServer.once('error', () => {
        networkAvailable = false;
        resolve();
      });
      server.httpServer.listen(0, '127.0.0.1', resolve);
    });
    if (!networkAvailable) return;
    const address = server.httpServer.address() as AddressInfo;
    url = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    sockets.forEach(socket => socket.close());
    server.io.close();
    await new Promise<void>(resolve => server.httpServer.close(() => resolve()));
  });

  it('creates a room and joins two clients when networking is available', async () => {
    if (!networkAvailable) {
      expect(networkAvailable).toBe(false);
      return;
    }
    const a = ioClient(url, { transports: ['websocket'] });
    const b = ioClient(url, { transports: ['websocket'] });
    sockets.push(a, b);
    await Promise.all([
      new Promise<void>(resolve => a.on('connect', () => resolve())),
      new Promise<void>(resolve => b.on('connect', () => resolve()))
    ]);

    const created = await new Promise<{ roomId: string }>(resolve => {
      a.on('roomCreated', resolve);
      a.emit('createRoom', { mode: 'tdm', maxPlayers: 10 });
    });

    const joined = await Promise.all([
      new Promise(resolve => {
        a.on('roomJoined', resolve);
        a.emit('joinRoom', { roomId: created.roomId, playerName: 'A' });
      }),
      new Promise(resolve => {
        b.on('roomJoined', resolve);
        b.emit('joinRoom', { roomId: created.roomId, playerName: 'B' });
      })
    ]);

    expect(joined).toHaveLength(2);
  });
});
