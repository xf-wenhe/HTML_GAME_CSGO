import { AddressInfo } from 'net';
import { io as ioClient, Socket } from 'socket.io-client';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createGameServer } from '../index.js';
import { RoomManager } from '../rooms.js';

const bodyShot = {
  origin: { x: 0, y: 1.12, z: 0 },
  direction: { x: 0, y: 0, z: -1 },
  weaponId: 'pistol' as const,
  clientTime: Date.now()
};

const headShot = {
  origin: { x: 0, y: 1.7, z: 0 },
  direction: { x: 0, y: 0, z: -1 },
  weaponId: 'operator' as const,
  clientTime: Date.now()
};

function createLiveDuel(mode: 'tdm' | 'defusal' = 'tdm') {
  const rooms = new RoomManager();
  const room = rooms.createRoom({ mode, maxPlayers: 2, warmupSeconds: 1 });
  rooms.addPlayerToRoom(room.id, 'p1', 'Alpha');
  rooms.addPlayerToRoom(room.id, 'p2', 'Bravo');
  rooms.setReady('p1', true);
  rooms.setReady('p2', true);
  rooms.applyInput('p1', { position: { x: 0, y: 1.7, z: 0 }, rotation: { x: 0, y: 0, z: 0 } });
  rooms.applyInput('p2', { position: { x: 0, y: 1.7, z: -8 }, rotation: { x: 0, y: 0, z: 0 } });
  return { rooms, room };
}

function snapshotPlayer(rooms: RoomManager, roomId: string, playerId: string) {
  return rooms.getSnapshot(roomId)!.players.find(player => player.id === playerId)!;
}

afterEach(() => {
  vi.useRealTimers();
});

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
    expect(snapshot.players.find(player => player.team === 'attackers')?.weaponId).toBe('pistol');
    expect(snapshot.players.find(player => player.team === 'defenders')?.weaponId).toBe('usp_s');
  });

  it('uses configurable starting money for new rooms', () => {
    const rooms = new RoomManager();
    const room = rooms.createRoom({ mode: 'defusal', maxPlayers: 2, startingMoney: 1600 });

    rooms.addPlayerToRoom(room.id, 'p1', 'Alpha');

    expect(snapshotPlayer(rooms, room.id, 'p1').money).toBe(1600);
  });

  it('blocks fire-rate spam on the server', () => {
    vi.useFakeTimers();
    const { rooms, room } = createLiveDuel();

    rooms.shoot('p1', bodyShot);
    const afterFirst = snapshotPlayer(rooms, room.id, 'p1');
    rooms.shoot('p1', bodyShot);

    const shooter = snapshotPlayer(rooms, room.id, 'p1');
    const target = snapshotPlayer(rooms, room.id, 'p2');
    expect(shooter.ammo).toBe(afterFirst.ammo);
    expect(target.health).toBe(72);
  });

  it('reload consumes reserve ammo only after the weapon reload time', () => {
    vi.useFakeTimers();
    const { rooms, room } = createLiveDuel();
    const internalRoom = rooms.getRoom(room.id)!;
    const shooterState = internalRoom.players.get('p1')!;
    shooterState.ammo = 5;
    shooterState.reserveAmmo = 10;

    const startedReload = rooms.reload('p1')!;
    let shooter = startedReload.players.find(player => player.id === 'p1')!;
    expect(shooter.ammo).toBe(5);
    expect(shooter.reserveAmmo).toBe(10);
    expect(shooter.isReloading).toBe(true);

    vi.advanceTimersByTime(2199);
    rooms.tick();
    shooter = snapshotPlayer(rooms, room.id, 'p1');
    expect(shooter.ammo).toBe(5);
    expect(shooter.reserveAmmo).toBe(10);

    vi.advanceTimersByTime(1);
    rooms.tick();
    shooter = snapshotPlayer(rooms, room.id, 'p1');
    expect(shooter.ammo).toBe(15);
    expect(shooter.reserveAmmo).toBe(0);
    expect(shooter.isReloading).toBe(false);
  });

  it('armor and weapon buys enforce money, prices, grenades, and team restrictions in defusal buy phase', () => {
    const rooms = new RoomManager();
    const room = rooms.createRoom({ mode: 'defusal', maxPlayers: 2 });
    rooms.addPlayerToRoom(room.id, 'attacker', 'Alpha');
    rooms.addPlayerToRoom(room.id, 'defender', 'Bravo');

    const armored = rooms.buyWeapon('attacker', { armor: true })!;
    let attacker = armored.players.find(player => player.id === 'attacker')!;
    expect(attacker.armor).toBe(100);
    expect(attacker.money).toBe(150);

    expect(rooms.buyWeapon('attacker', { weaponId: 'vandal' })).toBeUndefined();
    attacker = snapshotPlayer(rooms, room.id, 'attacker');
    expect(attacker.weaponId).toBe('pistol');
    expect(attacker.money).toBe(150);

    const internalRoom = rooms.getRoom(room.id)!;
    internalRoom.players.get('attacker')!.money = 5000;
    internalRoom.players.get('defender')!.money = 5000;

    expect(rooms.switchWeapon('attacker', 'vandal')).toBeUndefined();
    expect(snapshotPlayer(rooms, room.id, 'attacker').weaponId).toBe('pistol');

    expect(rooms.buyWeapon('attacker', { weaponId: 'sentinel' })).toBeUndefined();
    const boughtSentinel = rooms.buyWeapon('defender', { weaponId: 'sentinel' })!;
    const defender = boughtSentinel.players.find(player => player.id === 'defender')!;
    expect(defender.weaponId).toBe('sentinel');
    expect(defender.money).toBe(2100);

    const grenadeBought = rooms.buyWeapon('attacker', { grenadeId: 'flashbang' })!;
    attacker = grenadeBought.players.find(player => player.id === 'attacker')!;
    expect(attacker.money).toBe(4800);
    expect(attacker.grenades?.flashbang).toBe(1);
  });

  it('allows two opposing players to damage, kill, and respawn against each other', () => {
    vi.useFakeTimers();
    const { rooms, room } = createLiveDuel();
    rooms.switchWeapon('p1', 'operator');
    rooms.switchWeapon('p2', 'operator');

    rooms.shoot('p1', headShot);
    let snapshot = rooms.getSnapshot(room.id)!;
    expect(snapshot.players.find(player => player.id === 'p1')!.kills).toBe(1);
    expect(snapshot.players.find(player => player.id === 'p2')!.isAlive).toBe(false);

    vi.advanceTimersByTime(2500);
    rooms.tick();
    rooms.applyInput('p2', { position: { x: 0, y: 1.7, z: 0 }, rotation: { x: 0, y: 0, z: 0 } });
    rooms.applyInput('p1', { position: { x: 0, y: 1.7, z: -8 }, rotation: { x: 0, y: 0, z: 0 } });
    rooms.shoot('p2', headShot);

    snapshot = rooms.getSnapshot(room.id)!;
    expect(snapshot.players.find(player => player.id === 'p2')!.kills).toBe(1);
    expect(snapshot.players.find(player => player.id === 'p1')!.isAlive).toBe(false);
  });

  it('formats headshot kill feed entries without HTML', () => {
    vi.useFakeTimers();
    const { rooms, room } = createLiveDuel();
    rooms.switchWeapon('p1', 'operator');

    const scored = rooms.shoot('p1', headShot)!;

    expect(scored.killFeed[0]).toBe('Alpha [AWP] HEADSHOT Bravo');
    expect(scored.killFeed[0]).not.toMatch(/[<>]/);
    expect(scored.lastHit).toMatchObject({
      shooterId: 'p1',
      victimId: 'p2',
      weaponId: 'operator',
      region: 'head',
      killed: true
    });
  });

  it('uses separated attacker and defender spawns in team modes', () => {
    const rooms = new RoomManager();
    const room = rooms.createRoom({ mode: 'tdm', maxPlayers: 2, mapId: 'dust2' as any });
    rooms.addPlayerToRoom(room.id, 'p1', 'Alpha');
    rooms.addPlayerToRoom(room.id, 'p2', 'Bravo');

    const snapshot = rooms.getSnapshot(room.id)!;
    const attacker = snapshot.players.find(player => player.team === 'attackers')!;
    const defender = snapshot.players.find(player => player.team === 'defenders')!;

    expect(Math.hypot(attacker.position.x - defender.position.x, attacker.position.z - defender.position.z)).toBeGreaterThan(45);
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

  it('preserves player state when a disconnected session reconnects', () => {
    const rooms = new RoomManager();
    const room = rooms.createRoom({ mode: 'tdm', maxPlayers: 2 });
    rooms.addPlayerToRoom(room.id, 'socket-old', 'Alpha');
    const sessionId = rooms.getPlayerSessionId('socket-old')!;
    rooms.buyWeapon('socket-old', { weaponId: 'p250' });
    rooms.applyInput('socket-old', { position: { x: 4, y: 1.7, z: 6 }, rotation: { x: 0, y: 0.5, z: 0 }, seq: 7 });

    const disconnected = rooms.markPlayerDisconnected('socket-old')!;
    expect(disconnected.players.find(player => player.id === 'socket-old')?.disconnected).toBe(true);

    const resumed = rooms.reconnectPlayer(room.id, 'socket-old', sessionId, 'socket-new')!;
    const player = resumed.players.find(candidate => candidate.id === 'socket-new')!;

    expect(resumed.players.some(candidate => candidate.id === 'socket-old')).toBe(false);
    expect(player.name).toBe('Alpha');
    expect(player.weaponId).toBe('p250');
    expect(player.position).toEqual({ x: 4, y: 1.7, z: 6 });
    expect(player.disconnected).toBe(false);
    expect(rooms.getPlayerSessionId('socket-new')).toBe(sessionId);
  });

  it('tracks spectators separately from active players', () => {
    const rooms = new RoomManager();
    const room = rooms.createRoom({ mode: 'tdm', maxPlayers: 2 });
    rooms.addPlayerToRoom(room.id, 'p1', 'Alpha');

    const spectating = rooms.addSpectatorToRoom(room.id, 'viewer')!;

    expect(spectating.players).toHaveLength(1);
    expect(spectating.spectatorCount).toBe(1);
    expect(rooms.getRoomList()[0]).toMatchObject({ playerCount: 1, spectatorCount: 1 });

    const afterLeave = rooms.removeSpectator('viewer')!;
    expect(afterLeave.spectatorCount).toBe(0);
  });

  it('records security events for malformed client state', () => {
    const rooms = new RoomManager();
    const room = rooms.createRoom({ mode: 'tdm', maxPlayers: 2 });
    rooms.addPlayerToRoom(room.id, 'p1', 'Alpha');

    const snapshot = rooms.applyInput('p1', {
      position: { x: Number.NaN, y: 1.7, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      seq: 1
    })!;

    expect(snapshot.securityEvents?.[0]).toContain('Rejected non-finite input');
    expect(snapshot.events?.[0].type).toBe('security');
  });

  it('adds match summaries when a TDM match ends', () => {
    const rooms = new RoomManager();
    const room = rooms.createRoom({ mode: 'tdm', maxPlayers: 2, roundLimit: 1 });
    rooms.addPlayerToRoom(room.id, 'p1', 'Alpha');
    rooms.addPlayerToRoom(room.id, 'p2', 'Bravo');
    rooms.setReady('p1', true);
    rooms.setReady('p2', true);
    rooms.applyInput('p1', { position: { x: 0, y: 1.7, z: 0 }, rotation: { x: 0, y: 0, z: 0 } });
    rooms.applyInput('p2', { position: { x: 0, y: 1.7, z: -8 }, rotation: { x: 0, y: 0, z: 0 } });
    rooms.switchWeapon('p1', 'operator');

    rooms.shoot('p1', headShot);
    const ended = rooms.tick()[0];

    expect(ended.phase).toBe('matchEnd');
    expect(ended.summary?.winner).toBe('attackers');
    expect(ended.summary?.topPlayer?.name).toBe('Alpha');
    expect(ended.events?.some(event => event.type === 'kill')).toBe(true);
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

  it('resumes a disconnected socket into its previous player slot', async () => {
    if (!networkAvailable) {
      expect(networkAvailable).toBe(false);
      return;
    }
    const first = ioClient(url, { transports: ['websocket'] });
    sockets.push(first);
    await new Promise<void>(resolve => first.on('connect', () => resolve()));

    const joined = await new Promise<{ roomId: string; playerId: string; sessionId: string }>(resolve => {
      first.on('roomJoined', resolve);
      first.emit('joinOrCreateRoom', { mode: 'tdm', playerName: 'ResumeMe', mapId: 'dust2' });
    });

    first.close();
    await new Promise(resolve => setTimeout(resolve, 20));

    const second = ioClient(url, { transports: ['websocket'] });
    sockets.push(second);
    await new Promise<void>(resolve => second.on('connect', () => resolve()));

    const resumed = await new Promise<{ playerId: string; resumed: boolean; snapshot: any }>(resolve => {
      second.on('roomJoined', resolve);
      second.emit('resumeSession', { roomId: joined.roomId, playerId: joined.playerId, sessionId: joined.sessionId });
    });

    expect(resumed.resumed).toBe(true);
    expect(resumed.playerId).toBe(second.id);
    expect(resumed.snapshot.players.find((player: any) => player.id === second.id)?.name).toBe('ResumeMe');
    expect(resumed.snapshot.players.some((player: any) => player.id === joined.playerId)).toBe(false);
  });

  it('lets a socket spectate without consuming a player slot', async () => {
    if (!networkAvailable) {
      expect(networkAvailable).toBe(false);
      return;
    }
    const host = ioClient(url, { transports: ['websocket'] });
    const viewer = ioClient(url, { transports: ['websocket'] });
    sockets.push(host, viewer);
    await Promise.all([
      new Promise<void>(resolve => host.on('connect', () => resolve())),
      new Promise<void>(resolve => viewer.on('connect', () => resolve()))
    ]);

    const created = await new Promise<{ roomId: string }>(resolve => {
      host.on('roomCreated', resolve);
      host.emit('createRoom', { mode: 'tdm', maxPlayers: 10, mapId: 'dust2' });
    });
    const joined = await new Promise<{ roomId: string }>(resolve => {
      host.on('roomJoined', resolve);
      host.emit('joinRoom', { roomId: created.roomId, playerName: 'Host' });
    });

    const spectating = await new Promise<{ spectator: boolean; snapshot: any }>(resolve => {
      viewer.on('roomJoined', resolve);
      viewer.emit('spectateRoom', { roomId: joined.roomId });
    });

    expect(spectating.spectator).toBe(true);
    expect(spectating.snapshot.players).toHaveLength(1);
    expect(spectating.snapshot.spectatorCount).toBe(1);
  });
});
