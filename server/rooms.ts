import {
  BombActionRequest,
  BombState,
  BuyRequest,
  GrenadeId,
  HitRegion,
  HitResult,
  MatchMode,
  MatchPhase,
  MatchSnapshot,
  MapId,
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
import { DEFAULT_ROOM_CONFIGS } from './config.js';
import { MAP_CONFIGS, WEAPON_BALANCE } from './gameConfig.js';

const ARMOR_PRICE = 650;
const ARMOR_VALUE = 100;
const TDM_RESPAWN_DELAY_MS = 2500;

const GRENADE_BALANCE: Record<GrenadeId, { price: number; max: number }> = {
  he: { price: 300, max: 1 },
  flashbang: { price: 200, max: 2 },
  smoke: { price: 300, max: 1 },
  incendiary: { price: 600, max: 1 },
  decoy: { price: 50, max: 1 }
};

interface MatchRoom {
  id: string;
  config: RoomConfig;
  phase: MatchPhase;
  round: number;
  phaseStartedAt: number;
  roundEndsAt: number;
  score: Record<Team, number>;
  players: Map<string, PlayerSnapshot>;
  killFeed: string[];
  lastHit?: HitResult;
  bomb?: BombState;
  lastActivityAt: number;
  spawnCursor: Record<Team, number>;
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
      killFeed: [],
      bomb: config.mode === 'defusal' ? {} : undefined,
      lastActivityAt: now(),
      spawnCursor: { attackers: 0, defenders: 0 }
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
    const weaponId: WeaponId = typeof nameOrState === 'string' ? 'sidearm' : nameOrState.weaponId ?? 'sidearm';
    const reserveAmmo = reserveFor(weaponId);
    const player: PlayerSnapshot = {
      id: playerId,
      name,
      team,
      position: spawn,
      rotation: { x: 0, y: 0, z: 0 },
      health: 100,
      armor: 0,
      money: room.config.mode === 'defusal' ? 800 : 3200,
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
    if (room.config.mode === 'defusal' && !room.bomb?.carrierId && team === 'attackers') {
      room.bomb = { ...room.bomb, carrierId: playerId };
    }
    room.lastActivityAt = now();
    return true;
  }

  removePlayer(playerId: string): void {
    for (const room of this.rooms.values()) {
      if (room.players.delete(playerId)) {
        if (room.bomb?.carrierId === playerId) room.bomb = { ...room.bomb, carrierId: undefined };
        if (room.players.size === 0) this.rooms.delete(room.id);
        return;
      }
    }
  }

  removePlayerFromRoom(roomId: string, playerId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.players.delete(playerId);
    if (room.players.size === 0) this.rooms.delete(roomId);
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
    player.position = cloneVector(input.position);
    player.rotation = cloneVector(input.rotation);
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
    if (
      !shooter.isAlive ||
      room.phase !== 'live' ||
      shooter.ammo <= 0 ||
      shooter.isReloading ||
      request.weaponId !== shooter.weaponId ||
      (shooter.nextFireAt !== undefined && currentTime < shooter.nextFireAt)
    ) {
      return undefined;
    }

    const weapon = WEAPON_BALANCE[shooter.weaponId];
    shooter.ammo--;
    shooter.nextFireAt = currentTime + Math.round(1000 / weapon.fireRate);
    const direction = normalize(request.direction);
    let bestTarget: { player: PlayerSnapshot; region: HitRegion; distance: number } | undefined;

    for (const target of room.players.values()) {
      if (target.id === shooter.id || !target.isAlive) continue;
      if (!room.config.friendlyFire && target.team === shooter.team) continue;
      const hit = this.getPlayerRayHit(request.origin, direction, target, weapon.range);
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
      this.processRoomTimers(room, time);
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
      maxPlayers: room.config.maxPlayers,
      phase: room.phase
    }));
  }

  private normalizeConfig(modeOrConfig: MatchMode | Partial<RoomConfig>, maxPlayers?: number): RoomConfig {
    const mode = typeof modeOrConfig === 'string' ? modeOrConfig : modeOrConfig.mode ?? 'tdm';
    return {
      ...DEFAULT_ROOM_CONFIGS[mode],
      ...(typeof modeOrConfig === 'string' ? {} : modeOrConfig),
      maxPlayers: maxPlayers ?? (typeof modeOrConfig === 'string' ? DEFAULT_ROOM_CONFIGS[mode].maxPlayers : modeOrConfig.maxPlayers ?? DEFAULT_ROOM_CONFIGS[mode].maxPlayers)
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
        room.phase = 'matchEnd';
      }
      return;
    }
    if (room.bomb?.plantedAt && now() - room.bomb.plantedAt >= 40_000) this.endRound(room, 'attackers', 'Bomb detonated');
    else if (alive.attackers === 0 && !room.bomb?.plantedAt) this.endRound(room, 'defenders', 'Attackers eliminated');
    else if (alive.defenders === 0) this.endRound(room, 'attackers', 'Defenders eliminated');
    else if (now() >= room.roundEndsAt && !room.bomb?.plantedAt) this.endRound(room, 'defenders', 'Time expired');
  }

  private getPlayerRayHit(origin: Vector3, direction: Vector3, target: PlayerSnapshot, range: number): { region: HitRegion; distance: number } | undefined {
    const zones: Array<{ region: HitRegion; center: Vector3; radius: number }> = [
      { region: 'head', center: target.position, radius: 0.34 },
      { region: 'body', center: { x: target.position.x, y: target.position.y - 0.58, z: target.position.z }, radius: 0.5 },
      { region: 'body', center: { x: target.position.x, y: target.position.y - 1.05, z: target.position.z }, radius: 0.46 }
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
    room.phase = 'roundEnd';
    room.roundEndsAt = now() + 5000;
    room.killFeed.unshift(reason);
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
        rotation: { ...player.rotation }
      })),
      bomb: room.bomb ? { ...room.bomb, position: room.bomb.position ? { ...room.bomb.position } : undefined } : undefined,
      killFeed: [...room.killFeed],
      lastHit: room.lastHit ? { ...room.lastHit, position: room.lastHit.position ? { ...room.lastHit.position } : undefined } : undefined
    };
  }
}
