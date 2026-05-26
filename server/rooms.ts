import {
  BombActionRequest,
  BombState,
  BuyRequest,
  GrenadeId,
  GrenadeThrowRequest,
  HitRegion,
  HitResult,
  MatchEvent,
  MatchMode,
  MatchPhase,
  MatchSnapshot,
  MapId,
  MatchSummary,
  PlayerInputRequest,
  PlayerSnapshot,
  RoomConfig,
  RoomListItem,
  ShootRequest,
  Team,
  Vector3,
  WeaponBalance,
  WeaponId
} from './types.js';
import { randomUUID } from 'node:crypto';
import { DEFAULT_ROOM_CONFIGS } from './config.js';
import { MAP_CONFIGS, WEAPON_BALANCE } from './gameConfig.js';

const ARMOR_PRICE = 650;
const ARMOR_VALUE = 100;
const TDM_RESPAWN_DELAY_MS = 2500;
const MAX_BACKTRACK_MS = 200;
const RECONNECT_GRACE_MS = 30_000;

const GRENADE_BALANCE: Record<GrenadeId, { price: number; max: number }> = {
  he: { price: 300, max: 1 },
  flashbang: { price: 200, max: 2 },
  smoke: { price: 300, max: 1 },
  incendiary: { price: 600, max: 1 },
  decoy: { price: 50, max: 1 }
};

const GRENADE_TIMERS: Record<GrenadeId, number> = {
  he: 1.8,
  flashbang: 1.3,
  smoke: 1.6,
  incendiary: 1.8,
  decoy: 1.8
};

const GRENADE_DAMAGE: Record<GrenadeId, { base: number; radius: number; falloff: number }> = {
  he: { base: 65, radius: 7, falloff: 0.6 },
  flashbang: { base: 0, radius: 18, falloff: 0 },
  smoke: { base: 0, radius: 6, falloff: 0 },
  incendiary: { base: 8, radius: 5, falloff: 0.3 },
  decoy: { base: 0, radius: 0, falloff: 0 }
};

interface PositionRecord {
  time: number;
  position: Vector3;
}

interface ActiveGrenade {
  id: string;
  type: GrenadeId;
  throwerId: string;
  origin: Vector3;
  velocity: Vector3;
  thrownAt: number;
  exploded: boolean;
}

interface MatchRoom {
  id: string;
  config: RoomConfig;
  phase: MatchPhase;
  round: number;
  phaseStartedAt: number;
  roundEndsAt: number;
  score: Record<Team, number>;
  players: Map<string, PlayerSnapshot>;
  spectators: Set<string>;
  killFeed: string[];
  events: MatchEvent[];
  securityEvents: string[];
  createdAt: number;
  winner?: Team;
  lastHit?: HitResult;
  bomb?: BombState;
  lastActivityAt: number;
  spawnCursor: Record<Team, number>;
  positionHistory: Map<string, PositionRecord[]>;
  activeGrenades: ActiveGrenade[];
  lastInputSeq: Map<string, number>;
  sessionByPlayerId: Map<string, string>;
  disconnectedAt: Map<string, number>;
}

const now = () => Date.now();
const cloneVector = (value: Vector3): Vector3 => ({ x: value.x, y: value.y, z: value.z });
const distance = (a: Vector3, b: Vector3): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
const add = (a: Vector3, b: Vector3): Vector3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const scale = (a: Vector3, value: number): Vector3 => ({ x: a.x * value, y: a.y * value, z: a.z * value });
const normalize = (a: Vector3): Vector3 => {
  const len = Math.hypot(a.x, a.y, a.z) || 1;
  return { x: a.x / len, y: a.y / len, z: a.z / len };
};
const reserveFor = (weaponId: WeaponId): number => WEAPON_BALANCE[weaponId].maxReserveAmmo;
const defaultOwnedWeapons = (weaponId: WeaponId): WeaponId[] => Array.from(new Set<WeaponId>([weaponId, 'knife']));
const defaultWeaponForTeam = (team: Team): WeaponId => team === 'defenders' ? 'usp_s' : 'pistol';
const sanitizeFeedPart = (value: string): string => value.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();

export class RoomManager {
  private rooms = new Map<string, MatchRoom>();

  createRoom(modeOrConfig: MatchMode | Partial<RoomConfig> = 'tdm', maxPlayers?: number): MatchRoom {
    const config = this.normalizeConfig(modeOrConfig, maxPlayers);
    const id = `${config.mode}_${now()}_${Math.random().toString(36).slice(2, 8)}`;
    const room: MatchRoom = {
      id,
      config,
      phase: config.mode === 'defusal' ? 'buy' : 'warmup',
      round: 1,
      phaseStartedAt: now(),
      roundEndsAt: now() + (config.mode === 'defusal' ? 35_000 : config.warmupSeconds * 1000),
      score: { attackers: 0, defenders: 0 },
      players: new Map(),
      spectators: new Set(),
      killFeed: [],
      events: [],
      securityEvents: [],
      createdAt: now(),
      bomb: config.mode === 'defusal' ? {} : undefined,
      lastActivityAt: now(),
      spawnCursor: { attackers: 0, defenders: 0 },
      positionHistory: new Map(),
      activeGrenades: [],
      lastInputSeq: new Map(),
      sessionByPlayerId: new Map(),
      disconnectedAt: new Map()
    };
    this.rooms.set(id, room);
    return room;
  }

  getRoom(id: string): MatchRoom | undefined {
    return this.rooms.get(id);
  }

  findJoinableRoom(mode: MatchMode, mapId?: MapId): MatchRoom | undefined {
    return Array.from(this.rooms.values()).find(room =>
      room.config.mode === mode &&
      (!mapId || room.config.mapId === mapId) &&
      room.players.size < room.config.maxPlayers
    );
  }

  removeRoom(id: string): void {
    this.rooms.delete(id);
  }

  addPlayerToRoom(roomId: string, playerId: string, nameOrState: string | Partial<PlayerSnapshot> = 'Player'): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.players.size >= room.config.maxPlayers || room.players.has(playerId)) return false;

    const team = this.pickTeam(room);
    const spawn = this.nextSpawn(room, team);
    const name = typeof nameOrState === 'string' ? nameOrState : nameOrState.name ?? 'Player';
    const weaponId: WeaponId = typeof nameOrState === 'string' ? defaultWeaponForTeam(team) : nameOrState.weaponId ?? defaultWeaponForTeam(team);
    const reserveAmmo = reserveFor(weaponId);
    const player: PlayerSnapshot = {
      id: playerId,
      name,
      team,
      position: spawn,
      rotation: { x: 0, y: 0, z: 0 },
      health: 100,
      armor: 0,
      money: room.config.startingMoney,
      weaponId,
      ownedWeapons: defaultOwnedWeapons(weaponId),
      ammo: WEAPON_BALANCE[weaponId].magazineSize,
      reserveAmmo,
      isReloading: false,
      grenades: {},
      kills: 0,
      deaths: 0,
      assists: 0,
      ping: 0,
      isAlive: true,
      isReady: false
    };
    room.players.set(playerId, player);
    room.spectators.delete(playerId);
    room.sessionByPlayerId.set(playerId, randomUUID());
    room.disconnectedAt.delete(playerId);
    this.recordEvent(room, 'join', `${name} joined`, playerId);
    if (room.config.mode === 'defusal' && !room.bomb?.carrierId && team === 'attackers') {
      room.bomb = { ...room.bomb, carrierId: playerId };
    }
    room.lastActivityAt = now();
    return true;
  }

  removePlayer(playerId: string): void {
    for (const room of this.rooms.values()) {
      if (room.players.delete(playerId)) {
        room.sessionByPlayerId.delete(playerId);
        room.disconnectedAt.delete(playerId);
        room.positionHistory.delete(playerId);
        room.lastInputSeq.delete(playerId);
        if (room.bomb?.carrierId === playerId) room.bomb = { ...room.bomb, carrierId: undefined };
        this.recordEvent(room, 'leave', `${playerId} left`, playerId);
        if (room.players.size === 0 && room.spectators.size === 0) this.rooms.delete(room.id);
        return;
      }
      if (room.spectators.delete(playerId)) {
        if (room.players.size === 0 && room.spectators.size === 0) this.rooms.delete(room.id);
        return;
      }
    }
  }

  addSpectatorToRoom(roomId: string, spectatorId: string): MatchSnapshot | undefined {
    const room = this.rooms.get(roomId);
    if (!room) return undefined;
    room.players.delete(spectatorId);
    room.spectators.add(spectatorId);
    room.lastActivityAt = now();
    return this.getSnapshot(room.id);
  }

  removeSpectator(spectatorId: string): MatchSnapshot | undefined {
    const room = this.findRoomBySpectator(spectatorId);
    if (!room) return undefined;
    room.spectators.delete(spectatorId);
    if (room.players.size === 0 && room.spectators.size === 0) {
      this.rooms.delete(room.id);
      return undefined;
    }
    return this.getSnapshot(room.id);
  }

  markPlayerDisconnected(playerId: string): MatchSnapshot | undefined {
    const room = this.findRoomByPlayer(playerId);
    const player = room?.players.get(playerId);
    if (!room || !player) return undefined;
    player.disconnected = true;
    room.disconnectedAt.set(playerId, now());
    room.lastActivityAt = now();
    return this.getSnapshot(room.id);
  }

  reconnectPlayer(roomId: string, oldPlayerId: string, sessionId: string, newPlayerId: string): MatchSnapshot | undefined {
    const room = this.rooms.get(roomId);
    const player = room?.players.get(oldPlayerId);
    if (!room || !player || room.sessionByPlayerId.get(oldPlayerId) !== sessionId) return undefined;
    if (oldPlayerId !== newPlayerId && room.players.has(newPlayerId)) return undefined;

    room.players.delete(oldPlayerId);
    player.id = newPlayerId;
    player.disconnected = false;
    room.players.set(newPlayerId, player);

    this.moveKey(room.sessionByPlayerId, oldPlayerId, newPlayerId);
    room.disconnectedAt.delete(oldPlayerId);
    room.disconnectedAt.delete(newPlayerId);
    this.moveKey(room.positionHistory, oldPlayerId, newPlayerId);
    this.moveKey(room.lastInputSeq, oldPlayerId, newPlayerId);
    if (room.bomb?.carrierId === oldPlayerId) room.bomb = { ...room.bomb, carrierId: newPlayerId };
    if (room.bomb?.plantedBy === oldPlayerId) room.bomb = { ...room.bomb, plantedBy: newPlayerId };
    if (room.bomb?.defusingPlayerId === oldPlayerId) room.bomb = { ...room.bomb, defusingPlayerId: newPlayerId };
    room.activeGrenades.forEach(grenade => {
      if (grenade.throwerId === oldPlayerId) grenade.throwerId = newPlayerId;
    });
    if (room.lastHit?.shooterId === oldPlayerId) room.lastHit.shooterId = newPlayerId;
    if (room.lastHit?.victimId === oldPlayerId) room.lastHit.victimId = newPlayerId;
    room.lastActivityAt = now();
    return this.getSnapshot(room.id);
  }

  getPlayerSessionId(playerId: string): string | undefined {
    const room = this.findRoomByPlayer(playerId);
    return room?.sessionByPlayerId.get(playerId);
  }

  removePlayerFromRoom(roomId: string, playerId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.players.delete(playerId);
    room.spectators.delete(playerId);
    room.sessionByPlayerId.delete(playerId);
    room.disconnectedAt.delete(playerId);
    room.positionHistory.delete(playerId);
    room.lastInputSeq.delete(playerId);
    if (room.players.size === 0 && room.spectators.size === 0) this.rooms.delete(roomId);
  }

  setReady(playerId: string, ready: boolean): MatchSnapshot | undefined {
    const room = this.findRoomByPlayer(playerId);
    const player = room?.players.get(playerId);
    if (!room || !player) return undefined;
    player.isReady = ready;
    if (room.players.size >= 2 && Array.from(room.players.values()).every(p => p.isReady)) {
      this.startLivePhase(room);
    }
    return this.getSnapshot(room.id);
  }

  applyInput(playerId: string, input: PlayerInputRequest): MatchSnapshot | undefined {
    const room = this.findRoomByPlayer(playerId);
    const player = room?.players.get(playerId);
    if (!room || !player || !player.isAlive) return undefined;
    if (!this.isFiniteVector(input.position) || !this.isFiniteVector(input.rotation)) {
      this.recordSecurityEvent(room, `Rejected non-finite input from ${player.name}`);
      return this.getSnapshot(room.id);
    }
    const previousSeq = room.lastInputSeq.get(playerId);
    if (input.seq !== undefined && previousSeq !== undefined && input.seq <= previousSeq) {
      this.recordSecurityEvent(room, `Rejected stale input from ${player.name}`);
      return this.getSnapshot(room.id);
    }
    player.position = cloneVector(input.position);
    player.rotation = cloneVector(input.rotation);
    const seq = input.seq ?? (room.lastInputSeq.get(playerId) ?? 0) + 1;
    room.lastInputSeq.set(playerId, seq);
    this.recordPosition(room, playerId, input.position);
    room.lastActivityAt = now();
    return this.getSnapshot(room.id);
  }

  switchWeapon(playerId: string, weaponId: WeaponId): MatchSnapshot | undefined {
    const room = this.findRoomByPlayer(playerId);
    const player = room?.players.get(playerId);
    if (!room || !player || !this.canUseWeapon(player.team, weaponId)) return undefined;
    if (room.config.mode === 'defusal' && !(player.ownedWeapons ?? []).includes(weaponId)) return undefined;
    player.weaponId = weaponId;
    player.ammo = WEAPON_BALANCE[weaponId].magazineSize;
    player.reserveAmmo = reserveFor(weaponId);
    player.isReloading = false;
    player.reloadCompleteAt = undefined;
    return this.getSnapshot(room.id);
  }

  buyWeapon(playerId: string, request: BuyRequest): MatchSnapshot | undefined {
    const room = this.findRoomByPlayer(playerId);
    const player = room?.players.get(playerId);
    if (!room || !player) return undefined;
    const canBuyNow = room.config.mode !== 'defusal' || room.phase === 'buy';
    if (!canBuyNow) return undefined;

    if (request.armor) {
      if (player.armor >= ARMOR_VALUE || player.money < ARMOR_PRICE) return undefined;
      player.money -= ARMOR_PRICE;
      player.armor = ARMOR_VALUE;
      return this.getSnapshot(room.id);
    }

    if (request.grenadeId) {
      const grenade = GRENADE_BALANCE[request.grenadeId];
      if (!grenade) return undefined;
      const inventory = player.grenades ?? {};
      const current = inventory[request.grenadeId] ?? 0;
      if (current >= grenade.max || player.money < grenade.price) return undefined;
      player.money -= grenade.price;
      player.grenades = { ...inventory, [request.grenadeId]: current + 1 };
      return this.getSnapshot(room.id);
    }

    if (!request.weaponId) return undefined;
    const weapon = WEAPON_BALANCE[request.weaponId];
    if (!weapon || player.money < weapon.price || !this.canUseWeapon(player.team, request.weaponId)) return undefined;
    player.money -= weapon.price;
    player.weaponId = request.weaponId;
    player.ownedWeapons = Array.from(new Set([...(player.ownedWeapons ?? defaultOwnedWeapons('sidearm')), request.weaponId]));
    player.ammo = weapon.magazineSize;
    player.reserveAmmo = weapon.maxReserveAmmo;
    player.isReloading = false;
    player.reloadCompleteAt = undefined;
    return this.getSnapshot(room.id);
  }

  reload(playerId: string): MatchSnapshot | undefined {
    const room = this.findRoomByPlayer(playerId);
    const player = room?.players.get(playerId);
    if (!room || !player || !player.isAlive) return undefined;
    this.processRoomTimers(room, now());
    const weapon = WEAPON_BALANCE[player.weaponId];
    if (player.isReloading || weapon.reloadTime <= 0 || player.ammo >= weapon.magazineSize || player.reserveAmmo <= 0) {
      return undefined;
    }
    player.isReloading = true;
    player.reloadCompleteAt = now() + Math.round(weapon.reloadTime * 1000);
    room.lastActivityAt = now();
    return this.getSnapshot(room.id);
  }

  private finishReload(player: PlayerSnapshot): void {
    const weapon = WEAPON_BALANCE[player.weaponId];
    const needed = weapon.magazineSize - player.ammo;
    const loaded = Math.min(needed, player.reserveAmmo);
    player.ammo += loaded;
    player.reserveAmmo -= loaded;
    player.isReloading = false;
    player.reloadCompleteAt = undefined;
  }

  shoot(playerId: string, request: ShootRequest): MatchSnapshot | undefined {
    const room = this.findRoomByPlayer(playerId);
    const shooter = room?.players.get(playerId);
    if (!room || !shooter) return undefined;
    const currentTime = now();
    this.processRoomTimers(room, currentTime);
    this.processGrenades(room, currentTime);
    if (!this.isFiniteVector(request.origin) || !this.isFiniteVector(request.direction)) {
      this.recordSecurityEvent(room, `Rejected malformed shot from ${shooter.name}`);
      return this.getSnapshot(room.id);
    }
    if (request.weaponId !== shooter.weaponId) {
      this.recordSecurityEvent(room, `Rejected weapon mismatch from ${shooter.name}`);
      return this.getSnapshot(room.id);
    }
    if (
      !shooter.isAlive ||
      room.phase !== 'live' ||
      shooter.ammo <= 0 ||
      shooter.isReloading ||
      (shooter.nextFireAt !== undefined && currentTime < shooter.nextFireAt)
    ) {
      return undefined;
    }

    const weapon = WEAPON_BALANCE[shooter.weaponId];
    shooter.ammo--;
    shooter.nextFireAt = currentTime + Math.round(1000 / weapon.fireRate);
    const direction = normalize(request.direction);

    // Lag compensation: calculate shooter latency from client timestamp
    const shooterLatency = Math.min(request.clientTime > 0 ? currentTime - request.clientTime : 0, MAX_BACKTRACK_MS);
    const backtrackTime = currentTime - shooterLatency;

    let bestTarget: { player: PlayerSnapshot; region: HitRegion; distance: number } | undefined;

    for (const target of room.players.values()) {
      if (target.id === shooter.id || !target.isAlive) continue;
      if (!room.config.friendlyFire && target.team === shooter.team) continue;
      // Use backtracked position for the target
      const targetPos = this.getBacktrackedPosition(room, target.id, backtrackTime) ?? target.position;
      const hit = this.getPlayerRayHit(request.origin, direction, targetPos, weapon.range);
      if (!hit) continue;
      if (!bestTarget || hit.distance < bestTarget.distance) bestTarget = { player: target, ...hit };
    }

    if (bestTarget) {
      room.lastHit = this.damagePlayer(room, shooter, bestTarget.player, weapon, bestTarget.region, currentTime);
    } else {
      room.lastHit = {
        shooterId: shooter.id,
        weaponId: shooter.weaponId,
        damage: 0,
        killed: false,
        serverTime: currentTime
      };
    }
    room.lastActivityAt = currentTime;
    return this.getSnapshot(room.id);
  }

  plantBomb(playerId: string, request: BombActionRequest): MatchSnapshot | undefined {
    const room = this.findRoomByPlayer(playerId);
    const player = room?.players.get(playerId);
    if (!room || !player || room.config.mode !== 'defusal' || room.phase !== 'live' || player.team !== 'attackers') return undefined;
    if (room.bomb?.carrierId !== playerId || room.bomb.plantedAt) return undefined;
    const site = MAP_CONFIGS[room.config.mapId].bombSites.find(candidate => candidate.id === request.site);
    if (!site || distance(player.position, site.position) > site.radius) return undefined;
    room.bomb = { site: site.id, plantedBy: playerId, plantedAt: now(), position: cloneVector(player.position) };
    room.roundEndsAt = now() + 40_000;
    return this.getSnapshot(room.id);
  }

  defuseBomb(playerId: string): MatchSnapshot | undefined {
    const room = this.findRoomByPlayer(playerId);
    const player = room?.players.get(playerId);
    if (!room || !player || room.config.mode !== 'defusal' || player.team !== 'defenders' || !room.bomb?.plantedAt || !room.bomb.position) return undefined;
    if (distance(player.position, room.bomb.position) > 3.2) return undefined;
    this.endRound(room, 'defenders', 'Bomb defused');
    return this.getSnapshot(room.id);
  }

  tick(): MatchSnapshot[] {
    const updates: MatchSnapshot[] = [];
    for (const room of this.rooms.values()) {
      const time = now();
      // Record position history for lag compensation
      room.players.forEach(player => {
        if (player.isAlive) this.recordPosition(room, player.id, player.position);
      });
      this.processRoomTimers(room, time);
      this.removeExpiredDisconnectedPlayers(room, time);
      if (!this.rooms.has(room.id)) continue;
      this.processGrenades(room, time);
      if (room.phase === 'warmup' && time >= room.roundEndsAt) this.startLivePhase(room);
      if (room.phase === 'buy' && time >= room.roundEndsAt) this.startLivePhase(room);
      if (room.phase === 'roundEnd' && time >= room.roundEndsAt) this.startNextRound(room);
      if (room.phase === 'live') this.checkWinConditions(room);
      updates.push(this.snapshot(room));
    }
    return updates;
  }

  getSnapshot(roomId: string): MatchSnapshot | undefined {
    const room = this.rooms.get(roomId);
    return room ? this.snapshot(room) : undefined;
  }

  getSnapshotForPlayer(playerId: string): MatchSnapshot | undefined {
    const room = this.findRoomByPlayer(playerId);
    return room ? this.snapshot(room) : undefined;
  }

  getRoomList(): RoomListItem[] {
    return Array.from(this.rooms.values()).map(room => ({
      id: room.id,
      mode: room.config.mode,
      mapId: room.config.mapId,
      playerCount: room.players.size,
      spectatorCount: room.spectators.size,
      maxPlayers: room.config.maxPlayers,
      phase: room.phase
    }));
  }

  private normalizeConfig(modeOrConfig: MatchMode | Partial<RoomConfig>, maxPlayers?: number): RoomConfig {
    const mode = typeof modeOrConfig === 'string' ? modeOrConfig : modeOrConfig.mode ?? 'tdm';
    return {
      ...DEFAULT_ROOM_CONFIGS[mode],
      ...(typeof modeOrConfig === 'string' ? {} : modeOrConfig),
      maxPlayers: maxPlayers ?? (typeof modeOrConfig === 'string' ? DEFAULT_ROOM_CONFIGS[mode].maxPlayers : modeOrConfig.maxPlayers ?? DEFAULT_ROOM_CONFIGS[mode].maxPlayers),
      startingMoney: typeof modeOrConfig === 'string' ? DEFAULT_ROOM_CONFIGS[mode].startingMoney : modeOrConfig.startingMoney ?? DEFAULT_ROOM_CONFIGS[mode].startingMoney
    };
  }

  private pickTeam(room: MatchRoom): Team {
    const counts = { attackers: 0, defenders: 0 };
    room.players.forEach(player => counts[player.team]++);
    return counts.attackers <= counts.defenders ? 'attackers' : 'defenders';
  }

  private nextSpawn(room: MatchRoom, team: Team): Vector3 {
    const map = MAP_CONFIGS[room.config.mapId] ?? MAP_CONFIGS.dust2;
    const pool = map.spawns[team];
    const index = room.spawnCursor[team]++ % pool.length;
    return cloneVector(pool[index]);
  }

  private findRoomByPlayer(playerId: string): MatchRoom | undefined {
    return Array.from(this.rooms.values()).find(room => room.players.has(playerId));
  }

  private findRoomBySpectator(spectatorId: string): MatchRoom | undefined {
    return Array.from(this.rooms.values()).find(room => room.spectators.has(spectatorId));
  }

  private startLivePhase(room: MatchRoom): void {
    room.phase = 'live';
    room.phaseStartedAt = now();
    room.roundEndsAt = now() + (room.config.mode === 'defusal' ? 115_000 : 10 * 60_000);
  }

  private startNextRound(room: MatchRoom): void {
    room.round++;
    if (room.config.mode === 'defusal' && room.round > room.config.roundLimit) {
      room.phase = 'matchEnd';
      return;
    }
    room.phase = room.config.mode === 'defusal' ? 'buy' : 'live';
    room.phaseStartedAt = now();
    room.roundEndsAt = now() + (room.phase === 'buy' ? 20_000 : 115_000);
    room.bomb = room.config.mode === 'defusal' ? {} : undefined;
    room.players.forEach(player => {
      player.isAlive = true;
      player.health = 100;
      player.armor = room.config.mode === 'defusal' ? player.armor : 50;
      player.position = this.nextSpawn(room, player.team);
      player.ammo = WEAPON_BALANCE[player.weaponId].magazineSize;
      player.reserveAmmo = reserveFor(player.weaponId);
      player.isReloading = false;
      player.reloadCompleteAt = undefined;
      player.respawnAt = undefined;
      player.nextFireAt = undefined;
      player.disconnected = false;
      if (room.config.mode === 'defusal' && !room.bomb?.carrierId && player.team === 'attackers') room.bomb = { carrierId: player.id };
    });
  }

  private checkWinConditions(room: MatchRoom): void {
    const alive = { attackers: 0, defenders: 0 };
    room.players.forEach(player => {
      if (player.isAlive) alive[player.team]++;
    });
    if (room.config.mode === 'tdm') {
      if (room.score.attackers >= room.config.roundLimit || room.score.defenders >= room.config.roundLimit) {
        room.winner = room.score.attackers >= room.config.roundLimit ? 'attackers' : 'defenders';
        room.phase = 'matchEnd';
      }
      return;
    }
    if (room.bomb?.plantedAt && now() - room.bomb.plantedAt >= 40_000) this.endRound(room, 'attackers', 'Bomb detonated');
    else if (alive.attackers === 0 && !room.bomb?.plantedAt) this.endRound(room, 'defenders', 'Attackers eliminated');
    else if (alive.defenders === 0) this.endRound(room, 'attackers', 'Defenders eliminated');
    else if (now() >= room.roundEndsAt && !room.bomb?.plantedAt) this.endRound(room, 'defenders', 'Time expired');
  }

  private getPlayerRayHit(origin: Vector3, direction: Vector3, targetPos: Vector3, range: number): { region: HitRegion; distance: number } | undefined {
    const zones: Array<{ region: HitRegion; center: Vector3; radius: number }> = [
      { region: 'head', center: targetPos, radius: 0.34 },
      { region: 'body', center: { x: targetPos.x, y: targetPos.y - 0.58, z: targetPos.z }, radius: 0.5 },
      { region: 'body', center: { x: targetPos.x, y: targetPos.y - 1.05, z: targetPos.z }, radius: 0.46 }
    ];
    let best: { region: 'head' | 'body'; distance: number } | undefined;
    for (const zone of zones) {
      const toZone = { x: zone.center.x - origin.x, y: zone.center.y - origin.y, z: zone.center.z - origin.z };
      const t = toZone.x * direction.x + toZone.y * direction.y + toZone.z * direction.z;
      if (t < 0 || t > range) continue;
      const closest = add(origin, scale(direction, t));
      if (distance(closest, zone.center) > zone.radius) continue;
      if (!best || t < best.distance) best = { region: zone.region, distance: t };
    }
    return best;
  }

  private damagePlayer(room: MatchRoom, shooter: PlayerSnapshot, target: PlayerSnapshot, weapon: WeaponBalance, region: HitRegion, serverTime: number): HitResult {
    const rawDamage = Math.round(weapon.damage * (region === 'head' ? weapon.headshotMultiplier : 1));
    const armorBlocked = Math.min(target.armor, Math.round(rawDamage * (1 - weapon.armorPenetration)));
    target.armor -= armorBlocked;
    const damage = Math.max(1, rawDamage - Math.round(armorBlocked * 0.65));
    target.health -= damage;
    if (target.health > 0) {
      return {
        shooterId: shooter.id,
        victimId: target.id,
        weaponId: weapon.id,
        region,
        damage,
        killed: false,
        serverTime,
        position: cloneVector(target.position)
      };
    }
    target.health = 0;
    target.isAlive = false;
    target.isReloading = false;
    target.reloadCompleteAt = undefined;
    target.respawnAt = room.config.mode === 'tdm' ? serverTime + TDM_RESPAWN_DELAY_MS : undefined;
    target.deaths++;
    shooter.kills++;
    shooter.money += room.config.mode === 'defusal' ? weapon.killReward : 0;
    room.score[shooter.team]++;
    const marker = region === 'head' ? ' HEADSHOT' : '';
    room.killFeed.unshift(`${sanitizeFeedPart(shooter.name)} [${sanitizeFeedPart(weapon.name)}]${marker} ${sanitizeFeedPart(target.name)}`);
    room.killFeed = room.killFeed.slice(0, 5);
    this.recordEvent(room, 'kill', room.killFeed[0], shooter.id);
    return {
      shooterId: shooter.id,
      victimId: target.id,
      weaponId: weapon.id,
      region,
      damage,
      killed: true,
      serverTime,
      position: cloneVector(target.position)
    };
  }

  private processRoomTimers(room: MatchRoom, time: number): void {
    room.players.forEach(player => {
      if (player.isReloading && player.reloadCompleteAt !== undefined && time >= player.reloadCompleteAt) {
        this.finishReload(player);
      }
      if (!player.isAlive && player.respawnAt !== undefined && time >= player.respawnAt && room.config.mode === 'tdm') {
        this.respawnPlayer(room, player);
      }
    });
  }

  private respawnPlayer(room: MatchRoom, player: PlayerSnapshot): void {
    player.isAlive = true;
    player.health = 100;
    player.armor = 50;
    player.position = this.nextSpawn(room, player.team);
    player.ammo = WEAPON_BALANCE[player.weaponId].magazineSize;
    player.reserveAmmo = reserveFor(player.weaponId);
    player.isReloading = false;
    player.reloadCompleteAt = undefined;
    player.respawnAt = undefined;
    player.nextFireAt = undefined;
  }

  private endRound(room: MatchRoom, winner: Team, reason: string): void {
    room.score[winner]++;
    room.winner = winner;
    room.phase = 'roundEnd';
    room.roundEndsAt = now() + 5000;
    room.killFeed.unshift(reason);
    this.recordEvent(room, 'objective', reason);
  }

  private canUseWeapon(team: Team, weaponId: WeaponId): boolean {
    const teams = WEAPON_BALANCE[weaponId].teams;
    return teams === 'both' || teams.includes(team);
  }

  private snapshot(room: MatchRoom): MatchSnapshot {
    return {
      roomId: room.id,
      config: room.config,
      phase: room.phase,
      serverTime: now(),
      round: room.round,
      roundTimeRemaining: Math.max(0, (room.roundEndsAt - now()) / 1000),
      score: { ...room.score },
      players: Array.from(room.players.values()).map(player => ({
        ...player,
        ownedWeapons: player.ownedWeapons ? [...player.ownedWeapons] : undefined,
        position: { ...player.position },
        rotation: { ...player.rotation },
        lastProcessedSeq: room.lastInputSeq.get(player.id)
      })),
      spectatorCount: room.spectators.size,
      bomb: room.bomb ? { ...room.bomb, position: room.bomb.position ? { ...room.bomb.position } : undefined } : undefined,
      killFeed: [...room.killFeed],
      lastHit: room.lastHit ? { ...room.lastHit, position: room.lastHit.position ? { ...room.lastHit.position } : undefined } : undefined,
      events: [...room.events],
      securityEvents: [...room.securityEvents],
      summary: room.phase === 'matchEnd' ? this.buildSummary(room) : undefined
    };
  }

  private recordEvent(room: MatchRoom, type: MatchEvent['type'], message: string, playerId?: string): void {
    room.events.unshift({ time: now(), type, message, playerId });
    room.events = room.events.slice(0, 20);
  }

  private recordSecurityEvent(room: MatchRoom, message: string): void {
    room.securityEvents.unshift(message);
    room.securityEvents = room.securityEvents.slice(0, 10);
    this.recordEvent(room, 'security', message);
  }

  private isFiniteVector(value: Vector3): boolean {
    return Number.isFinite(value.x) && Number.isFinite(value.y) && Number.isFinite(value.z);
  }

  private buildSummary(room: MatchRoom): MatchSummary {
    const topPlayer = Array.from(room.players.values()).sort((a, b) => b.kills - a.kills || a.deaths - b.deaths)[0];
    return {
      winner: room.winner,
      topPlayer: topPlayer ? { id: topPlayer.id, name: topPlayer.name, kills: topPlayer.kills, deaths: topPlayer.deaths } : undefined,
      finalScore: { ...room.score },
      durationSeconds: Math.max(0, Math.round((now() - room.createdAt) / 1000))
    };
  }

  private recordPosition(room: MatchRoom, playerId: string, position: Vector3): void {
    const history = room.positionHistory.get(playerId) ?? [];
    history.push({ time: now(), position: cloneVector(position) });
    // Keep only last MAX_BACKTRACK_MS + 50ms of history (~16 records at 64Hz)
    const cutoff = now() - MAX_BACKTRACK_MS - 50;
    while (history.length > 0 && history[0].time < cutoff) history.shift();
    if (history.length > 64) history.splice(0, history.length - 64);
    room.positionHistory.set(playerId, history);
  }

  private removeExpiredDisconnectedPlayers(room: MatchRoom, time: number): void {
    let removedExpiredPlayer = false;
    for (const [playerId, disconnectedAt] of room.disconnectedAt.entries()) {
      if (time - disconnectedAt < RECONNECT_GRACE_MS) continue;
      room.players.delete(playerId);
      room.sessionByPlayerId.delete(playerId);
      room.disconnectedAt.delete(playerId);
      room.positionHistory.delete(playerId);
      room.lastInputSeq.delete(playerId);
      if (room.bomb?.carrierId === playerId) room.bomb = { ...room.bomb, carrierId: undefined };
      removedExpiredPlayer = true;
    }
    if (removedExpiredPlayer && room.players.size === 0 && room.spectators.size === 0) this.rooms.delete(room.id);
  }

  private moveKey<T>(map: Map<string, T>, oldKey: string, newKey: string): void {
    const value = map.get(oldKey);
    map.delete(oldKey);
    if (value !== undefined) map.set(newKey, value);
  }

  private getBacktrackedPosition(room: MatchRoom, playerId: string, targetTime: number): Vector3 | null {
    const history = room.positionHistory.get(playerId);
    if (!history || history.length === 0) return null;
    if (targetTime < history[0].time - 10) return null; // Too far back
    let best = history[0];
    for (const record of history) {
      if (record.time <= targetTime) best = record;
      else break;
    }
    return best.position;
  }

  private processGrenades(room: MatchRoom, time: number): void {
    for (const grenade of room.activeGrenades) {
      if (grenade.exploded) continue;
      const elapsed = (time - grenade.thrownAt) / 1000;
      const timer = GRENADE_TIMERS[grenade.type];
      if (elapsed >= timer) {
        grenade.exploded = true;
        // Grenade detonation - apply damage to players in range
        const damageCfg = GRENADE_DAMAGE[grenade.type];
        if (damageCfg.base <= 0) continue;
        const gpos = this.simulateGrenadePosition(grenade, time);
        for (const player of room.players.values()) {
          if (!player.isAlive || player.id === grenade.throwerId) continue;
          const dist = distance(player.position, gpos);
          if (dist > damageCfg.radius) continue;
          const dmg = Math.round(damageCfg.base * (1 - dist / damageCfg.radius));
          if (dmg <= 0) continue;
          player.health = Math.max(0, player.health - dmg);
          if (player.health <= 0) {
            player.isAlive = false;
            player.deaths++;
            const thrower = room.players.get(grenade.throwerId);
            if (thrower) thrower.kills++;
          }
        }
        if (grenade.type === 'flashbang') {
          // Flashbang effect: apply to all players in range (server validated)
          for (const player of room.players.values()) {
            if (!player.isAlive || player.id === grenade.throwerId) continue;
            const dist = distance(player.position, gpos);
            if (dist < GRENADE_DAMAGE.flashbang.radius) {
              player.flashIntensity = Math.max(player.flashIntensity ?? 0, 1 - dist / GRENADE_DAMAGE.flashbang.radius);
            }
          }
        }
      }
    }
    room.activeGrenades = room.activeGrenades.filter(g => !g.exploded || (time - g.thrownAt) < 10000);
  }

  private simulateGrenadePosition(grenade: ActiveGrenade, time: number): { x: number; y: number; z: number } {
    const elapsed = Math.min((time - grenade.thrownAt) / 1000, GRENADE_TIMERS[grenade.type]);
    const vel = { ...grenade.velocity };
    const pos = { ...grenade.origin };
    const dt = 0.02;
    let simTime = 0;
    while (simTime < elapsed) {
      const step = Math.min(dt, elapsed - simTime);
      vel.y -= 18 * step;
      pos.x += vel.x * step;
      pos.y += vel.y * step;
      pos.z += vel.z * step;
      if (pos.y < 0.13) {
        pos.y = 0.13;
        vel.y = Math.abs(vel.y) * 0.34;
        vel.x *= 0.62;
        vel.z *= 0.62;
      }
      simTime += step;
    }
    return pos;
  }

  handleGrenadeThrow(playerId: string, request: GrenadeThrowRequest): MatchSnapshot | undefined {
    const room = this.findRoomByPlayer(playerId);
    const player = room?.players.get(playerId);
    if (!room || !player || !player.isAlive || room.phase !== 'live') return undefined;
    const inventory = player.grenades ?? {};
    const count = (inventory as Record<string, number>)[request.type] ?? 0;
    if (count <= 0) return undefined;
    player.grenades = { ...inventory, [request.type]: count - 1 };
    room.activeGrenades.push({
      id: `gren_${now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: request.type,
      throwerId: playerId,
      origin: cloneVector(request.origin),
      velocity: cloneVector(request.velocity),
      thrownAt: now(),
      exploded: false
    });
    room.lastActivityAt = now();
    return this.getSnapshot(room.id);
  }
}
