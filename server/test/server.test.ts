import { AddressInfo } from 'net';
import { io as ioClient, Socket } from 'socket.io-client';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { WeaponId } from '../../shared/types.js';
import { CS16_DEFUSAL_WEAPON_IDS, WEAPON_BALANCE } from '../gameConfig.js';
import { createGameServer } from '../index.js';
import { RoomManager } from '../rooms.js';

const bodyShot = {
  origin: { x: 0, y: 1.12, z: 0 },
  direction: { x: 0, y: 0, z: -1 },
  weaponId: 'glock' as const,
  clientTime: Date.now()
};

const headShot = {
  origin: { x: 0, y: 1.7, z: 0 },
  direction: { x: 0, y: 0, z: -1 },
  weaponId: 'operator' as const,
  clientTime: Date.now()
};

const awpHeadShot = {
  origin: { x: 0, y: 1.7, z: 0 },
  direction: { x: 0, y: 0, z: -1 },
  weaponId: 'awp' as const,
  clientTime: Date.now()
};

const pistolHeadShot = {
  origin: { x: 0, y: 1.7, z: 0 },
  direction: { x: 0, y: 0, z: -1 },
  weaponId: 'glock' as const,
  clientTime: Date.now()
};

const expectedCs16DefusalWeaponEconomy: Array<[WeaponId, number]> = [
  ['glock', 400],
  ['usp', 500],
  ['p228', 600],
  ['deagle', 650],
  ['five_seven', 750],
  ['mp5', 1500],
  ['tmp', 1250],
  ['p90', 2350],
  ['mac10', 1400],
  ['ump45', 1700],
  ['m3', 1700],
  ['xm1014', 3000],
  ['galil', 2000],
  ['famas', 2250],
  ['ak47', 2500],
  ['m4a1', 3100],
  ['sg552', 3500],
  ['aug', 3500],
  ['scout', 2750],
  ['awp', 4750],
  ['g3sg1', 5000],
  ['sg550', 4200],
  ['m249', 5750],
];

function createLiveDuel(mode: 'tdm' | 'defusal' = 'tdm') {
  const rooms = new RoomManager();
  const room = rooms.createRoom({ mode, maxPlayers: 2, mapId: 'warehouse', warmupSeconds: 1 });
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
    expect(snapshot.players.find(player => player.team === 'attackers')?.weaponId).toBe('glock');
    expect(snapshot.players.find(player => player.team === 'defenders')?.weaponId).toBe('usp');
  });

  it('honors preferred teams when that side has room', () => {
    const rooms = new RoomManager();
    const room = rooms.createRoom({ mode: 'defusal', maxPlayers: 4 });

    expect(rooms.addPlayerToRoom(room.id, 'ct-1', { name: 'Bravo', preferredTeam: 'defenders' })).toBe(true);
    expect(rooms.addPlayerToRoom(room.id, 'ct-2', { name: 'Delta', preferredTeam: 'defenders' })).toBe(true);
    expect(rooms.addPlayerToRoom(room.id, 'ct-3', { name: 'Echo', preferredTeam: 'defenders' })).toBe(true);

    const snapshot = rooms.getSnapshot(room.id)!;
    expect(snapshot.players.find(player => player.id === 'ct-1')?.team).toBe('defenders');
    expect(snapshot.players.find(player => player.id === 'ct-2')?.team).toBe('defenders');
    expect(snapshot.players.find(player => player.id === 'ct-3')?.team).toBe('attackers');
  });

  it('uses configurable starting money for new rooms', () => {
    const rooms = new RoomManager();
    const room = rooms.createRoom({ mode: 'defusal', maxPlayers: 2, startingMoney: 1600 });

    rooms.addPlayerToRoom(room.id, 'p1', 'Alpha');

    expect(snapshotPlayer(rooms, room.id, 'p1').money).toBe(1600);
  });

  it('defaults Dust2 TDM to CS 1.6 pistol-round money', () => {
    const rooms = new RoomManager();
    const dust2 = rooms.createRoom({ mode: 'tdm', maxPlayers: 2, mapId: 'dust2' });
    const warehouse = rooms.createRoom({ mode: 'tdm', maxPlayers: 2, mapId: 'warehouse' });

    rooms.addPlayerToRoom(dust2.id, 'dust2-player', 'Alpha');
    rooms.addPlayerToRoom(warehouse.id, 'warehouse-player', 'Bravo');

    expect(snapshotPlayer(rooms, dust2.id, 'dust2-player').money).toBe(800);
    expect(snapshotPlayer(rooms, warehouse.id, 'warehouse-player').money).toBe(3200);
    expect(dust2.config.tickRate).toBe(64);
    expect(warehouse.config.tickRate).toBe(64);
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
    const attackerSpawn = { ...snapshotPlayer(rooms, room.id, 'attacker').position };

    const armored = rooms.buyWeapon('attacker', { armor: true })!;
    let attacker = armored.players.find(player => player.id === 'attacker')!;
    expect(attacker.armor).toBe(100);
    expect(attacker.hasHelmet).toBe(false);
    expect(attacker.money).toBe(150);

    expect(rooms.buyWeapon('attacker', { weaponId: 'vandal' })).toBeUndefined();
    expect(rooms.buyWeapon('attacker', { weaponId: 'operator' })).toBeUndefined();
    attacker = snapshotPlayer(rooms, room.id, 'attacker');
    expect(attacker.weaponId).toBe('glock');
    expect(attacker.money).toBe(150);

    const internalRoom = rooms.getRoom(room.id)!;
    internalRoom.players.get('attacker')!.money = 5000;
    internalRoom.players.get('defender')!.money = 5000;

    internalRoom.players.get('attacker')!.position = { x: 0, y: 1.7, z: -30 };
    expect(rooms.buyWeapon('attacker', { helmet: true })).toBeUndefined();
    attacker = snapshotPlayer(rooms, room.id, 'attacker');
    expect(attacker.hasHelmet).toBe(false);
    expect(attacker.money).toBe(5000);

    internalRoom.players.get('attacker')!.position = attackerSpawn;
    const helmet = rooms.buyWeapon('attacker', { helmet: true })!;
    attacker = helmet.players.find(player => player.id === 'attacker')!;
    expect(attacker.armor).toBe(100);
    expect(attacker.hasHelmet).toBe(true);
    expect(attacker.money).toBe(4650);

    expect(rooms.switchWeapon('attacker', 'vandal')).toBeUndefined();
    expect(snapshotPlayer(rooms, room.id, 'attacker').weaponId).toBe('glock');

    expect(rooms.buyWeapon('attacker', { weaponId: 'sentinel' })).toBeUndefined();
    expect(rooms.buyWeapon('defender', { weaponId: 'sentinel' })).toBeUndefined();
    const boughtM4 = rooms.buyWeapon('defender', { weaponId: 'm4a1' })!;
    let defender = boughtM4.players.find(player => player.id === 'defender')!;
    expect(defender.weaponId).toBe('m4a1');
    expect(defender.money).toBe(1900);

    expect(rooms.buyWeapon('attacker', { defuseKit: true })).toBeUndefined();
    const boughtKit = rooms.buyWeapon('defender', { defuseKit: true })!;
    defender = boughtKit.players.find(player => player.id === 'defender')!;
    expect(defender.hasDefuseKit).toBe(true);
    expect(defender.money).toBe(1700);

    const grenadeBought = rooms.buyWeapon('attacker', { grenadeId: 'flashbang' })!;
    attacker = grenadeBought.players.find(player => player.id === 'attacker')!;
    expect(attacker.money).toBe(4450);
    expect(attacker.grenades?.flashbang).toBe(1);

    const smokeBought = rooms.buyWeapon('attacker', { grenadeId: 'smoke' })!;
    attacker = smokeBought.players.find(player => player.id === 'attacker')!;
    expect(attacker.grenades?.smoke).toBe(1);
    expect(rooms.buyWeapon('attacker', { grenadeId: 'incendiary' })).toBeUndefined();
    expect(rooms.buyWeapon('attacker', { grenadeId: 'decoy' })).toBeUndefined();
    attacker = snapshotPlayer(rooms, room.id, 'attacker');
    expect(attacker.grenades?.incendiary).toBeUndefined();
    expect(attacker.grenades?.decoy).toBeUndefined();
  });

  it('defines CS 1.6 economy for every defusal buy weapon', () => {
    expect(new Set(expectedCs16DefusalWeaponEconomy.map(([weaponId]) => weaponId))).toEqual(CS16_DEFUSAL_WEAPON_IDS);

    for (const [weaponId, price] of expectedCs16DefusalWeaponEconomy) {
      expect(WEAPON_BALANCE[weaponId], `${weaponId} should have server weapon balance`).toBeDefined();
      expect(WEAPON_BALANCE[weaponId].price).toBe(price);
      expect(WEAPON_BALANCE[weaponId].killReward).toBe(300);
    }
    expect(WEAPON_BALANCE.awp.magazineSize).toBe(10);
    expect(WEAPON_BALANCE.awp.reloadTime).toBe(2.5);
    expect(WEAPON_BALANCE.awp.movementSpeedMultiplier).toBe(0.84);
    expect(WEAPON_BALANCE.knife.movementSpeedMultiplier).toBe(1);
  });

  it('charges CS 1.6 prices for MP5 and P228 in defusal buy phase', () => {
    const rooms = new RoomManager();
    const room = rooms.createRoom({ mode: 'defusal', maxPlayers: 2, startingMoney: 1500 });
    rooms.addPlayerToRoom(room.id, 'attacker', 'Alpha');
    rooms.addPlayerToRoom(room.id, 'defender', 'Bravo');

    const mp5Bought = rooms.buyWeapon('attacker', { weaponId: 'mp5' })!;
    const attacker = mp5Bought.players.find(player => player.id === 'attacker')!;
    expect(attacker.weaponId).toBe('mp5');
    expect(attacker.ownedWeapons).toContain('mp5');
    expect(attacker.money).toBe(0);

    const internalRoom = rooms.getRoom(room.id)!;
    internalRoom.players.get('defender')!.money = 600;
    const p228Bought = rooms.buyWeapon('defender', { weaponId: 'p228' })!;
    const defender = p228Bought.players.find(player => player.id === 'defender')!;
    expect(defender.weaponId).toBe('p228');
    expect(defender.ownedWeapons).toContain('p228');
    expect(defender.money).toBe(0);
  });

  it('uses CS 1.6 ownership and weapon restrictions in Dust2 TDM', () => {
    const rooms = new RoomManager();
    const room = rooms.createRoom({ mode: 'tdm', maxPlayers: 2, mapId: 'dust2', startingMoney: 3200 });
    rooms.addPlayerToRoom(room.id, 'attacker', 'Alpha');
    rooms.addPlayerToRoom(room.id, 'defender', 'Bravo');
    const attackerSpawn = { ...snapshotPlayer(rooms, room.id, 'attacker').position };

    expect(rooms.buyWeapon('attacker', { weaponId: 'operator' })).toBeUndefined();
    expect(rooms.buyWeapon('attacker', { weaponId: 'vandal' })).toBeUndefined();
    expect(rooms.switchWeapon('attacker', 'awp')).toBeUndefined();

    const mp5Bought = rooms.buyWeapon('attacker', { weaponId: 'mp5' })!;
    let attacker = mp5Bought.players.find(player => player.id === 'attacker')!;
    expect(attacker.weaponId).toBe('mp5');
    expect(attacker.money).toBe(1700);

    const backToPistol = rooms.switchWeapon('attacker', 'glock')!;
    attacker = backToPistol.players.find(player => player.id === 'attacker')!;
    expect(attacker.weaponId).toBe('glock');

    const backToMp5 = rooms.switchWeapon('attacker', 'mp5')!;
    attacker = backToMp5.players.find(player => player.id === 'attacker')!;
    expect(attacker.weaponId).toBe('mp5');

    rooms.getRoom(room.id)!.players.get('attacker')!.position = { x: 0, y: 1.7, z: -30 };
    expect(rooms.buyWeapon('attacker', { weaponId: 'deagle' })).toBeUndefined();
    attacker = snapshotPlayer(rooms, room.id, 'attacker');
    expect(attacker.weaponId).toBe('mp5');
    expect(attacker.money).toBe(1700);
    rooms.getRoom(room.id)!.players.get('attacker')!.position = attackerSpawn;

    expect(rooms.buyWeapon('attacker', { weaponId: 'm4a1' })).toBeUndefined();
    expect(rooms.buyWeapon('defender', { weaponId: 'ak47' })).toBeUndefined();
    expect(rooms.buyWeapon('defender', { defuseKit: true })).toBeUndefined();
    const p228Bought = rooms.buyWeapon('defender', { weaponId: 'p228' })!;
    const defender = p228Bought.players.find(player => player.id === 'defender')!;
    expect(defender.weaponId).toBe('p228');
    expect(defender.money).toBe(2600);
  });

  it('awards CS 1.6 kill money in Dust2 TDM without changing legacy TDM economy', () => {
    vi.useFakeTimers();
    const rooms = new RoomManager();
    const dust2 = rooms.createRoom({ mode: 'tdm', maxPlayers: 2, mapId: 'dust2', startingMoney: 10_000, warmupSeconds: 1 });
    rooms.addPlayerToRoom(dust2.id, 'dust2-attacker', 'Alpha');
    rooms.addPlayerToRoom(dust2.id, 'dust2-defender', 'Bravo');
    rooms.buyWeapon('dust2-attacker', { weaponId: 'awp' });
    rooms.setReady('dust2-attacker', true);
    rooms.setReady('dust2-defender', true);
    rooms.applyInput('dust2-attacker', { position: { x: 0, y: 1.7, z: 0 }, rotation: { x: 0, y: 0, z: 0 } });
    rooms.applyInput('dust2-defender', { position: { x: 0, y: 1.7, z: -8 }, rotation: { x: 0, y: 0, z: 0 } });

    rooms.shoot('dust2-attacker', awpHeadShot);
    let snapshot = rooms.getSnapshot(dust2.id)!;
    expect(snapshot.score.attackers).toBe(1);
    expect(snapshot.players.find(player => player.id === 'dust2-attacker')!.money).toBe(5550);
    vi.advanceTimersByTime(2500);
    rooms.tick();
    expect(snapshotPlayer(rooms, dust2.id, 'dust2-defender').armor).toBe(0);

    const legacy = createLiveDuel('tdm');
    legacy.rooms.switchWeapon('p1', 'operator');
    legacy.rooms.shoot('p1', headShot);
    snapshot = legacy.rooms.getSnapshot(legacy.room.id)!;
    expect(snapshot.score.attackers).toBe(1);
    expect(snapshot.players.find(player => player.id === 'p1')!.money).toBe(3200);
    vi.advanceTimersByTime(2500);
    legacy.rooms.tick();
    expect(snapshotPlayer(legacy.rooms, legacy.room.id, 'p2').armor).toBe(50);
  });

  it('blocks non-CS 1.6 grenades in Dust2 even when legacy inventory exists', () => {
    const rooms = new RoomManager();
    const room = rooms.createRoom({ mode: 'tdm', maxPlayers: 2, mapId: 'dust2' });
    rooms.addPlayerToRoom(room.id, 'attacker', 'Alpha');
    rooms.addPlayerToRoom(room.id, 'defender', 'Bravo');
    rooms.setReady('attacker', true);
    rooms.setReady('defender', true);
    const internalRoom = rooms.getRoom(room.id)!;
    const player = internalRoom.players.get('attacker')!;
    player.grenades = { he: 1, incendiary: 1, decoy: 1 };

    const incendiary = rooms.handleGrenadeThrow('attacker', {
      type: 'incendiary',
      origin: { x: 0, y: 1.7, z: 0 },
      velocity: { x: 0, y: 2, z: -8 }
    });
    expect(incendiary).toBeUndefined();
    expect(player.grenades.incendiary).toBe(1);
    expect(internalRoom.activeGrenades).toHaveLength(0);

    const he = rooms.handleGrenadeThrow('attacker', {
      type: 'he',
      origin: { x: 0, y: 1.7, z: 0 },
      velocity: { x: 0, y: 2, z: -8 }
    })!;
    expect(internalRoom.activeGrenades).toHaveLength(1);
    expect(internalRoom.activeGrenades[0].type).toBe('he');
    expect(he.players.find(candidate => candidate.id === 'attacker')?.grenades?.he).toBe(0);
  });

  it('only reduces headshot damage with armor when the target has a helmet', () => {
    vi.useFakeTimers();
    let duel = createLiveDuel('defusal');
    duel.rooms.getRoom(duel.room.id)!.players.get('p2')!.armor = 100;
    duel.rooms.shoot('p1', pistolHeadShot);
    let target = snapshotPlayer(duel.rooms, duel.room.id, 'p2');
    expect(target.health).toBe(2);
    expect(target.armor).toBe(100);

    duel = createLiveDuel('defusal');
    const helmetedTarget = duel.rooms.getRoom(duel.room.id)!.players.get('p2')!;
    helmetedTarget.armor = 100;
    helmetedTarget.hasHelmet = true;
    duel.rooms.shoot('p1', pistolHeadShot);
    target = snapshotPlayer(duel.rooms, duel.room.id, 'p2');
    expect(target.health).toBe(36);
    expect(target.armor).toBe(48);
  });

  it('freezes defusal player movement during buy phase but still accepts look direction', () => {
    const rooms = new RoomManager();
    const room = rooms.createRoom({ mode: 'defusal', maxPlayers: 2 });
    rooms.addPlayerToRoom(room.id, 'attacker', 'Alpha');
    rooms.addPlayerToRoom(room.id, 'defender', 'Bravo');

    const spawn = snapshotPlayer(rooms, room.id, 'attacker').position;
    rooms.applyInput('attacker', {
      position: { x: spawn.x + 5, y: spawn.y, z: spawn.z + 5 },
      rotation: { x: 0.2, y: 1.1, z: 0 },
      seq: 1
    });
    let attacker = snapshotPlayer(rooms, room.id, 'attacker');
    expect(attacker.position).toEqual(spawn);
    expect(attacker.rotation.y).toBe(1.1);

    rooms.setReady('attacker', true);
    rooms.setReady('defender', true);
    rooms.applyInput('attacker', {
      position: { x: spawn.x + 5, y: spawn.y, z: spawn.z + 5 },
      rotation: { x: 0.2, y: 1.1, z: 0 },
      seq: 2
    });
    attacker = snapshotPlayer(rooms, room.id, 'attacker');
    expect(attacker.position.x).toBeCloseTo(spawn.x + 5);
    expect(attacker.position.z).toBeCloseTo(spawn.z + 5);
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

  it('counts defusal score by round win rather than by kills', () => {
    vi.useFakeTimers();
    const { rooms, room } = createLiveDuel('defusal');
    rooms.getRoom(room.id)!.players.get('p1')!.ownedWeapons = ['pistol', 'knife', 'operator'];
    rooms.switchWeapon('p1', 'operator');
    rooms.shoot('p1', headShot);

    let snapshot = rooms.getSnapshot(room.id)!;
    expect(snapshot.players.find(player => player.id === 'p1')!.kills).toBe(1);
    expect(snapshot.players.find(player => player.id === 'p2')!.isAlive).toBe(false);
    expect(snapshot.score.attackers).toBe(0);
    expect(snapshot.score.defenders).toBe(0);

    rooms.tick();
    snapshot = rooms.getSnapshot(room.id)!;
    expect(snapshot.phase).toBe('roundEnd');
    expect(snapshot.score.attackers).toBe(1);
    expect(snapshot.score.defenders).toBe(0);
    expect(snapshot.players.find(player => player.id === 'p1')!.money).toBe(4150);
    expect(snapshot.players.find(player => player.id === 'p2')!.money).toBe(2200);
  });

  it('keeps separate ammo for owned weapons when switching in defusal', () => {
    vi.useFakeTimers();
    const { rooms, room } = createLiveDuel('defusal');
    const internalRoom = rooms.getRoom(room.id)!;
    internalRoom.players.get('p1')!.ownedWeapons = ['pistol', 'knife', 'operator'];

    rooms.switchWeapon('p1', 'operator');
    rooms.shoot('p1', headShot);
    let player = snapshotPlayer(rooms, room.id, 'p1');
    expect(player.weaponId).toBe('operator');
    expect(player.ammo).toBe(4);

    rooms.switchWeapon('p1', 'pistol');
    player = snapshotPlayer(rooms, room.id, 'p1');
    expect(player.weaponId).toBe('pistol');
    expect(player.ammo).toBe(20);

    rooms.switchWeapon('p1', 'operator');
    player = snapshotPlayer(rooms, room.id, 'p1');
    expect(player.weaponId).toBe('operator');
    expect(player.ammo).toBe(4);
  });

  it('caps defusal money at sixteen thousand after round rewards', () => {
    vi.useFakeTimers();
    const { rooms, room } = createLiveDuel('defusal');
    const internalRoom = rooms.getRoom(room.id)!;
    internalRoom.players.get('p1')!.money = 15_900;
    internalRoom.players.get('p1')!.ownedWeapons = ['pistol', 'knife', 'operator'];
    internalRoom.players.get('p2')!.money = 15_900;
    rooms.switchWeapon('p1', 'operator');
    rooms.shoot('p1', headShot);
    rooms.tick();

    const snapshot = rooms.getSnapshot(room.id)!;
    expect(snapshot.players.find(player => player.id === 'p1')!.money).toBe(16_000);
    expect(snapshot.players.find(player => player.id === 'p2')!.money).toBe(16_000);
  });

  it('resets dead defusal players to default gear while survivors keep equipment', () => {
    vi.useFakeTimers();
    const rooms = new RoomManager();
    const room = rooms.createRoom({ mode: 'defusal', maxPlayers: 2, startingMoney: 10_000 });
    rooms.addPlayerToRoom(room.id, 'attacker', 'Attacker');
    rooms.addPlayerToRoom(room.id, 'defender', 'Defender');
    rooms.buyWeapon('attacker', { weaponId: 'awp' });
    rooms.buyWeapon('attacker', { armor: true });
    rooms.buyWeapon('defender', { weaponId: 'm4a1' });
    rooms.buyWeapon('defender', { armor: true });
    rooms.buyWeapon('defender', { defuseKit: true });
    rooms.setReady('attacker', true);
    rooms.setReady('defender', true);
    rooms.applyInput('attacker', { position: { x: 0, y: 1.7, z: 0 }, rotation: { x: 0, y: 0, z: 0 } });
    rooms.applyInput('defender', { position: { x: 0, y: 1.7, z: -8 }, rotation: { x: 0, y: 0, z: 0 } });
    rooms.shoot('attacker', awpHeadShot);
    rooms.tick();

    vi.advanceTimersByTime(5000);
    rooms.tick();
    const snapshot = rooms.getSnapshot(room.id)!;
    const attacker = snapshot.players.find(player => player.id === 'attacker')!;
    const defender = snapshot.players.find(player => player.id === 'defender')!;
    expect(snapshot.phase).toBe('buy');
    expect(attacker.weaponId).toBe('awp');
    expect(attacker.ownedWeapons).toContain('awp');
    expect(attacker.armor).toBe(100);
    expect(attacker.ammo).toBe(9);
    expect(defender.weaponId).toBe('usp');
    expect(defender.ownedWeapons).toEqual(['usp', 'knife']);
    expect(defender.armor).toBe(0);
    expect(defender.hasDefuseKit).toBe(false);
    expect(defender.ammo).toBe(12);
  });

  it('drops the bomb on carrier death and lets another attacker pick it up', () => {
    vi.useFakeTimers();
    const rooms = new RoomManager();
    const room = rooms.createRoom({ mode: 'defusal', maxPlayers: 4, mapId: 'warehouse' });
    rooms.addPlayerToRoom(room.id, 'carrier', { name: 'Carrier', preferredTeam: 'attackers' });
    rooms.addPlayerToRoom(room.id, 'defender', { name: 'Defender', preferredTeam: 'defenders' });
    rooms.addPlayerToRoom(room.id, 'support', { name: 'Support', preferredTeam: 'attackers' });
    rooms.setReady('carrier', true);
    rooms.setReady('defender', true);
    rooms.setReady('support', true);

    const bombSite = { x: -24, y: 1.7, z: -27 };
    rooms.applyInput('carrier', { position: bombSite, rotation: { x: 0, y: 0, z: 0 } });
    rooms.applyInput('support', { position: { x: -20, y: 1.7, z: -27 }, rotation: { x: 0, y: 0, z: 0 } });
    rooms.applyInput('defender', { position: { x: -24, y: 1.7, z: -35 }, rotation: { x: 0, y: 0, z: 0 } });
    rooms.getRoom(room.id)!.players.get('defender')!.ownedWeapons = ['usp', 'knife', 'operator'];
    rooms.switchWeapon('defender', 'operator');
    rooms.shoot('defender', {
      origin: { x: -24, y: 1.7, z: -35 },
      direction: { x: 0, y: 0, z: 1 },
      weaponId: 'operator',
      clientTime: Date.now()
    });

    let snapshot = rooms.getSnapshot(room.id)!;
    expect(snapshot.bomb?.carrierId).toBeUndefined();
    expect(snapshot.bomb?.position).toEqual(bombSite);
    expect(snapshot.players.find(player => player.id === 'carrier')!.isAlive).toBe(false);

    rooms.applyInput('support', { position: bombSite, rotation: { x: 0, y: 0, z: 0 } });
    snapshot = rooms.plantBomb('support', { site: 'A' })!;

    expect(snapshot.bomb?.carrierId).toBe('support');
    expect(snapshot.bomb?.position).toBeUndefined();
    expect(snapshot.bomb?.plantingPlayerId).toBe('support');
    expect(snapshot.bomb?.plantedAt).toBeUndefined();
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
    const room = rooms.createRoom({ mode: 'tdm', maxPlayers: 2, mapId: 'warehouse' });
    rooms.addPlayerToRoom(room.id, 'p1', 'Alpha');
    rooms.addPlayerToRoom(room.id, 'p2', 'Bravo');

    const snapshot = rooms.getSnapshot(room.id)!;
    const attacker = snapshot.players.find(player => player.team === 'attackers')!;
    const defender = snapshot.players.find(player => player.team === 'defenders')!;

    expect(Math.hypot(attacker.position.x - defender.position.x, attacker.position.z - defender.position.z)).toBeGreaterThan(45);
  });

  it('requires held bomb plant and defuse timing in defusal rounds', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    const rooms = new RoomManager();
    const room = rooms.createRoom({ mode: 'defusal', maxPlayers: 2, mapId: 'warehouse' });
    rooms.addPlayerToRoom(room.id, 'attacker', 'Attacker');
    rooms.addPlayerToRoom(room.id, 'defender', 'Defender');
    rooms.setReady('attacker', true);
    rooms.setReady('defender', true);

    rooms.applyInput('attacker', { position: { x: -24, y: 1.7, z: -27 }, rotation: { x: 0, y: 0, z: 0 } });
    const holdPlant = (durationMs: number) => {
      for (let elapsed = 0; elapsed < durationMs; elapsed += 100) {
        rooms.plantBomb('attacker', { site: 'A' });
        vi.advanceTimersByTime(Math.min(100, durationMs - elapsed));
        rooms.tick();
      }
      return rooms.getSnapshot(room.id)!;
    };
    let planted = holdPlant(2900);
    expect(planted.phase).toBe('live');
    expect(planted.bomb?.plantingPlayerId).toBe('attacker');
    expect(planted.bomb?.plantedAt).toBeUndefined();

    planted = holdPlant(100);
    expect(planted.bomb?.site).toBe('A');
    expect(planted.bomb?.plantedAt).toBeDefined();

    rooms.applyInput('defender', { position: { x: -24, y: 1.7, z: -27 }, rotation: { x: 0, y: 0, z: 0 } });
    const holdDefuse = (durationMs: number) => {
      for (let elapsed = 0; elapsed < durationMs; elapsed += 100) {
        rooms.defuseBomb('defender');
        vi.advanceTimersByTime(Math.min(100, durationMs - elapsed));
        rooms.tick();
      }
      return rooms.getSnapshot(room.id)!;
    };
    let defused = holdDefuse(9900);
    expect(defused.phase).toBe('live');
    expect(defused.bomb?.defusingPlayerId).toBe('defender');
    expect(defused.score.defenders).toBe(0);

    defused = holdDefuse(100);
    expect(defused.phase).toBe('roundEnd');
    expect(defused.score.defenders).toBe(1);
  });

  it('lets defenders with a defuse kit defuse in five seconds', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    const rooms = new RoomManager();
    const room = rooms.createRoom({ mode: 'defusal', maxPlayers: 2, mapId: 'warehouse', startingMoney: 5000 });
    rooms.addPlayerToRoom(room.id, 'attacker', 'Attacker');
    rooms.addPlayerToRoom(room.id, 'defender', 'Defender');
    rooms.buyWeapon('defender', { defuseKit: true });
    rooms.setReady('attacker', true);
    rooms.setReady('defender', true);

    rooms.applyInput('attacker', { position: { x: -24, y: 1.7, z: -27 }, rotation: { x: 0, y: 0, z: 0 } });
    for (let elapsed = 0; elapsed < 3000; elapsed += 100) {
      rooms.plantBomb('attacker', { site: 'A' });
      vi.advanceTimersByTime(100);
      rooms.tick();
    }

    rooms.applyInput('defender', { position: { x: -24, y: 1.7, z: -27 }, rotation: { x: 0, y: 0, z: 0 } });
    for (let elapsed = 0; elapsed < 4900; elapsed += 100) {
      rooms.defuseBomb('defender');
      vi.advanceTimersByTime(100);
      rooms.tick();
    }
    let snapshot = rooms.getSnapshot(room.id)!;
    expect(snapshot.phase).toBe('live');
    expect(snapshot.bomb?.defusingPlayerId).toBe('defender');

    rooms.defuseBomb('defender');
    vi.advanceTimersByTime(100);
    rooms.tick();
    snapshot = rooms.getSnapshot(room.id)!;
    expect(snapshot.phase).toBe('roundEnd');
    expect(snapshot.score.defenders).toBe(1);
  });

  it('cancels bomb use when the player moves or tries to shoot', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    const rooms = new RoomManager();
    const room = rooms.createRoom({ mode: 'defusal', maxPlayers: 2, mapId: 'warehouse' });
    rooms.addPlayerToRoom(room.id, 'attacker', 'Attacker');
    rooms.addPlayerToRoom(room.id, 'defender', 'Defender');
    rooms.setReady('attacker', true);
    rooms.setReady('defender', true);

    const plantPosition = { x: -24, y: 1.7, z: -27 };
    rooms.applyInput('attacker', { position: plantPosition, rotation: { x: 0, y: 0, z: 0 } });
    rooms.plantBomb('attacker', { site: 'A' });
    vi.advanceTimersByTime(100);
    rooms.applyInput('attacker', { position: { x: -23.7, y: 1.7, z: -27 }, rotation: { x: 0, y: 0, z: 0 } });
    rooms.plantBomb('attacker', { site: 'A' });

    let snapshot = rooms.getSnapshot(room.id)!;
    expect(snapshot.bomb?.plantingPlayerId).toBeUndefined();
    expect(snapshot.bomb?.plantedAt).toBeUndefined();

    rooms.applyInput('attacker', { position: plantPosition, rotation: { x: 0, y: 0, z: 0 } });
    rooms.plantBomb('attacker', { site: 'A' });
    snapshot = rooms.shoot('attacker', {
      origin: { x: plantPosition.x, y: plantPosition.y, z: plantPosition.z },
      direction: { x: 0, y: 0, z: -1 },
      weaponId: 'glock',
      clientTime: Date.now()
    })!;

    expect(snapshot.bomb?.plantingPlayerId).toBeUndefined();
    expect(snapshot.bomb?.plantedAt).toBeUndefined();
    expect(snapshot.players.find(player => player.id === 'attacker')?.ammo).toBe(20);
  });

  it('preserves player state when a disconnected session reconnects', () => {
    const rooms = new RoomManager();
    const room = rooms.createRoom({ mode: 'tdm', maxPlayers: 2 });
    rooms.addPlayerToRoom(room.id, 'socket-old', 'Alpha');
    const sessionId = rooms.getPlayerSessionId('socket-old')!;
    rooms.buyWeapon('socket-old', { weaponId: 'p228' });
    rooms.applyInput('socket-old', { position: { x: 4, y: 1.7, z: 6 }, rotation: { x: 0, y: 0.5, z: 0 }, seq: 7 });

    const disconnected = rooms.markPlayerDisconnected('socket-old')!;
    expect(disconnected.players.find(player => player.id === 'socket-old')?.disconnected).toBe(true);

    const resumed = rooms.reconnectPlayer(room.id, 'socket-old', sessionId, 'socket-new')!;
    const player = resumed.players.find(candidate => candidate.id === 'socket-new')!;

    expect(resumed.players.some(candidate => candidate.id === 'socket-old')).toBe(false);
    expect(player.name).toBe('Alpha');
    expect(player.weaponId).toBe('p228');
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
    const room = rooms.createRoom({ mode: 'tdm', maxPlayers: 2, mapId: 'warehouse', roundLimit: 1, startingMoney: 10_000 });
    rooms.addPlayerToRoom(room.id, 'p1', 'Alpha');
    rooms.addPlayerToRoom(room.id, 'p2', 'Bravo');
    rooms.setReady('p1', true);
    rooms.setReady('p2', true);
    rooms.applyInput('p1', { position: { x: 0, y: 1.7, z: 0 }, rotation: { x: 0, y: 0, z: 0 } });
    rooms.applyInput('p2', { position: { x: 0, y: 1.7, z: -8 }, rotation: { x: 0, y: 0, z: 0 } });
    rooms.buyWeapon('p1', { weaponId: 'awp' });

    rooms.shoot('p1', awpHeadShot);
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
