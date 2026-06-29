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
import {
  getCs16BurstTiming,
  getCs16PrimaryFireCycleSeconds,
  getCs16SilencerTiming,
  getCs16ShotgunReloadTiming,
  isCs16BurstWeapon,
  isCs16SilencerWeapon,
  isCs16ScopedWeapon,
  PLAYER_INPUT_BUTTON_BURST,
  PLAYER_INPUT_BUTTON_SCOPE,
  PLAYER_INPUT_BUTTON_SILENCER
} from '../shared/cs16WeaponTiming.js';
import { randomUUID } from 'node:crypto';
import { DEFAULT_ROOM_CONFIGS } from './config.js';
import { CS16_DEFUSAL_WEAPON_IDS, MAP_CONFIGS, WEAPON_BALANCE } from './gameConfig.js';

const ARMOR_PRICE = 650;
const ARMOR_HELMET_PRICE = 1000;
const HELMET_UPGRADE_PRICE = 350;
const ARMOR_VALUE = 100;
const DEFUSE_KIT_PRICE = 200;
const TDM_RESPAWN_DELAY_MS = 2500;
const MAX_BACKTRACK_MS = 200;
const RECONNECT_GRACE_MS = 30_000;
const BOMB_PLANT_TIME_MS = 3000;
const BOMB_DEFUSE_TIME_MS = 10_000;
const BOMB_DEFUSE_KIT_TIME_MS = 5000;
const BOMB_ACTION_HEARTBEAT_GRACE_MS = 350;
const BOMB_FUSE_TIME_MS = 40_000;
const BOMB_ACTION_MOVE_CANCEL_DISTANCE = 0.18;
const BOMB_PICKUP_RADIUS = 1.2;
const DEFUSAL_BUY_ZONE_RADIUS = 8;
const DEFUSAL_WIN_REWARD = 3250;
const DEFUSAL_LOSS_REWARDS = [1400, 1900, 2400, 2900, 3400] as const;
const DEFUSAL_MAX_MONEY = 16_000;

const GRENADE_BALANCE: Record<GrenadeId, { price: number; max: number }> = {
  he: { price: 300, max: 1 },
  flashbang: { price: 200, max: 2 },
  smoke: { price: 300, max: 1 },
  incendiary: { price: 600, max: 1 },
  decoy: { price: 50, max: 1 }
};

const CS16_GRENADE_IDS = new Set<GrenadeId>(['he', 'flashbang', 'smoke']);

const GRENADE_TIMERS: Record<GrenadeId, number> = {
  he: 1.8,
  flashbang: 1.3,
  smoke: 1.6,
  incendiary: 1.8,
  decoy: 1.8
};

const GRENADE_DAMAGE: Record<GrenadeId, { base: number; radius: number; falloff: number }> = {
  he: { base: WEAPON_BALANCE.hegrenade.damage, radius: 7, falloff: 0.6 },
  flashbang: { base: 0, radius: 18, falloff: 0 },
  smoke: { base: 0, radius: 6, falloff: 0 },
  incendiary: { base: 8, radius: 5, falloff: 0.3 },
  decoy: { base: 0, radius: 0, falloff: 0 }
};
const FLASH_MAX_DURATION_MS = 5000;

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
  explodedAt?: number;
}

interface JoinPlayerOptions extends Partial<PlayerSnapshot> {
  preferredTeam?: Team;
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
  bombActionLastSeenAt?: number;
  bombActionAnchor?: Vector3;
  lossStreak: Record<Team, number>;
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
const defaultWeaponForTeam = (team: Team): WeaponId => team === 'defenders' ? 'usp' : 'glock';
const sanitizeFeedPart = (value: string): string => value.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();
const defaultAmmoFor = (weaponId: WeaponId) => ({
  ammo: WEAPON_BALANCE[weaponId].magazineSize,
  reserveAmmo: reserveFor(weaponId)
});

const usesCs16WeaponEconomy = (room: MatchRoom): boolean => room.config.mapId === 'dust2';
const saveCurrentWeaponAmmo = (player: PlayerSnapshot): void => {
  player.weaponAmmo = {
    ...(player.weaponAmmo ?? {}),
    [player.weaponId]: { ammo: player.ammo, reserveAmmo: player.reserveAmmo }
  };
};
const loadWeaponAmmo = (player: PlayerSnapshot, weaponId: WeaponId): void => {
  const ammo = player.weaponAmmo?.[weaponId] ?? defaultAmmoFor(weaponId);
  player.ammo = ammo.ammo;
  player.reserveAmmo = ammo.reserveAmmo;
};
const resetWeaponAmmo = (player: PlayerSnapshot, weaponId: WeaponId): void => {
  const ammo = defaultAmmoFor(weaponId);
  player.weaponAmmo = { ...(player.weaponAmmo ?? {}), [weaponId]: ammo };
  player.ammo = ammo.ammo;
  player.reserveAmmo = ammo.reserveAmmo;
};

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
      disconnectedAt: new Map(),
      bombActionLastSeenAt: undefined,
      bombActionAnchor: undefined,
      lossStreak: { attackers: 0, defenders: 0 }
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

  addPlayerToRoom(roomId: string, playerId: string, nameOrState: string | JoinPlayerOptions = 'Player'): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.players.size >= room.config.maxPlayers || room.players.has(playerId)) return false;

    const team = this.pickTeam(room, typeof nameOrState === 'string' ? undefined : nameOrState.preferredTeam ?? nameOrState.team);
    const spawn = this.nextSpawn(room, team);
    const name = typeof nameOrState === 'string' ? nameOrState : nameOrState.name ?? 'Player';
    const weaponId: WeaponId = typeof nameOrState === 'string' ? defaultWeaponForTeam(team) : nameOrState.weaponId ?? defaultWeaponForTeam(team);
    const ammo = defaultAmmoFor(weaponId);
    const player: PlayerSnapshot = {
      id: playerId,
      name,
      team,
      position: spawn,
      rotation: { x: 0, y: 0, z: 0 },
      health: 100,
      armor: 0,
      hasHelmet: false,
      hasDefuseKit: false,
      money: room.config.startingMoney,
      weaponId,
      ownedWeapons: defaultOwnedWeapons(weaponId),
      weaponAmmo: { [weaponId]: ammo },
      weaponSilenced: {},
      ammo: ammo.ammo,
      reserveAmmo: ammo.reserveAmmo,
      isReloading: false,
      isScoped: false,
      isSilenced: false,
      isBurstMode: false,
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
    if (room.config.mode === 'defusal' && !room.bomb?.carrierId && !room.bomb?.position && room.bomb?.plantedAt === undefined && team === 'attackers') {
      room.bomb = { ...room.bomb, carrierId: playerId };
    }
    room.lastActivityAt = now();
    return true;
  }

  removePlayer(playerId: string): void {
    for (const room of this.rooms.values()) {
      const player = room.players.get(playerId);
      if (player && room.players.delete(playerId)) {
        room.sessionByPlayerId.delete(playerId);
        room.disconnectedAt.delete(playerId);
        room.positionHistory.delete(playerId);
        room.lastInputSeq.delete(playerId);
        this.dropBombFromCarrier(room, player);
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
    if (room.config.mode === 'defusal' && room.phase === 'buy') {
      player.rotation = cloneVector(input.rotation);
      this.applyWeaponInputState(player, input.buttons, now());
      const seq = input.seq ?? (room.lastInputSeq.get(playerId) ?? 0) + 1;
      room.lastInputSeq.set(playerId, seq);
      room.lastActivityAt = now();
      return this.getSnapshot(room.id);
    }
    player.position = cloneVector(input.position);
    player.rotation = cloneVector(input.rotation);
    this.applyWeaponInputState(player, input.buttons, now());
    this.pickupDroppedBomb(room, player);
    const seq = input.seq ?? (room.lastInputSeq.get(playerId) ?? 0) + 1;
    room.lastInputSeq.set(playerId, seq);
    this.recordPosition(room, playerId, input.position);
    room.lastActivityAt = now();
    return this.getSnapshot(room.id);
  }

  switchWeapon(playerId: string, weaponId: WeaponId): MatchSnapshot | undefined {
    const room = this.findRoomByPlayer(playerId);
    const player = room?.players.get(playerId);
    const weapon = weaponId ? WEAPON_BALANCE[weaponId] : undefined;
    if (!room || !player || !weapon || !this.canUseWeapon(player.team, weaponId)) return undefined;
    if (this.isPlayerUsingBomb(room, playerId)) {
      this.clearBombActionForPlayer(room, playerId);
      return this.getSnapshot(room.id);
    }
    if (usesCs16WeaponEconomy(room) && !CS16_DEFUSAL_WEAPON_IDS.has(weaponId)) return undefined;
    if (usesCs16WeaponEconomy(room) && !(player.ownedWeapons ?? []).includes(weaponId)) return undefined;
    saveCurrentWeaponAmmo(player);
    this.saveCurrentWeaponMode(player);
    player.weaponId = weaponId;
    loadWeaponAmmo(player, weaponId);
    player.isSilenced = Boolean(player.weaponSilenced?.[weaponId]);
    player.isBurstMode = false;
    this.clearBurstQueue(player);
    player.isReloading = false;
    player.reloadCompleteAt = undefined;
    player.reloadAttackUnlockAt = undefined;
    player.isScoped = false;
    return this.getSnapshot(room.id);
  }

  buyWeapon(playerId: string, request: BuyRequest): MatchSnapshot | undefined {
    const room = this.findRoomByPlayer(playerId);
    const player = room?.players.get(playerId);
    if (!room || !player) return undefined;
    const canBuyNow = room.config.mode !== 'defusal' || room.phase === 'buy';
    if (!canBuyNow) return undefined;
    if (usesCs16WeaponEconomy(room) && !this.isInBuyZone(room, player)) return undefined;

    if (request.armor) {
      if (player.armor >= ARMOR_VALUE || player.money < ARMOR_PRICE) return undefined;
      player.money -= ARMOR_PRICE;
      player.armor = ARMOR_VALUE;
      return this.getSnapshot(room.id);
    }

    if (request.helmet) {
      if (player.hasHelmet && player.armor >= ARMOR_VALUE) return undefined;
      const price = player.armor >= ARMOR_VALUE ? HELMET_UPGRADE_PRICE : ARMOR_HELMET_PRICE;
      if (player.money < price) return undefined;
      player.money -= price;
      player.armor = ARMOR_VALUE;
      player.hasHelmet = true;
      return this.getSnapshot(room.id);
    }

    if (request.defuseKit) {
      if (room.config.mode !== 'defusal' || player.team !== 'defenders' || player.hasDefuseKit || player.money < DEFUSE_KIT_PRICE) return undefined;
      player.money -= DEFUSE_KIT_PRICE;
      player.hasDefuseKit = true;
      return this.getSnapshot(room.id);
    }

    if (request.grenadeId) {
      if (usesCs16WeaponEconomy(room) && !CS16_GRENADE_IDS.has(request.grenadeId)) return undefined;
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
    if (usesCs16WeaponEconomy(room) && !CS16_DEFUSAL_WEAPON_IDS.has(request.weaponId)) return undefined;
    if (!weapon || player.money < weapon.price || !this.canUseWeapon(player.team, request.weaponId)) return undefined;
    saveCurrentWeaponAmmo(player);
    player.money -= weapon.price;
    player.weaponId = request.weaponId;
    player.ownedWeapons = Array.from(new Set([...(player.ownedWeapons ?? defaultOwnedWeapons(defaultWeaponForTeam(player.team))), request.weaponId]));
    resetWeaponAmmo(player, request.weaponId);
    player.isSilenced = Boolean(player.weaponSilenced?.[request.weaponId]);
    player.isBurstMode = false;
    this.clearBurstQueue(player);
    player.isScoped = false;
    player.isReloading = false;
    player.reloadCompleteAt = undefined;
    player.reloadAttackUnlockAt = undefined;
    return this.getSnapshot(room.id);
  }

  reload(playerId: string): MatchSnapshot | undefined {
    const room = this.findRoomByPlayer(playerId);
    const player = room?.players.get(playerId);
    if (!room || !player || !player.isAlive) return undefined;
    if (this.isPlayerUsingBomb(room, playerId)) {
      this.clearBombActionForPlayer(room, playerId);
      return this.getSnapshot(room.id);
    }
    this.processRoomTimers(room, now());
    const weapon = WEAPON_BALANCE[player.weaponId];
    if (player.isReloading || weapon.reloadTime <= 0 || player.ammo >= weapon.magazineSize || player.reserveAmmo <= 0) {
      return undefined;
    }
    player.isReloading = true;
    player.isScoped = false;
    const currentTime = now();
    const shotgunReload = getCs16ShotgunReloadTiming(player.weaponId);
    if (shotgunReload) {
      player.reloadAttackUnlockAt = currentTime + Math.round(shotgunReload.startSeconds * 1000);
      player.reloadCompleteAt = player.reloadAttackUnlockAt + Math.round(shotgunReload.shellSeconds * 1000);
    } else {
      player.reloadCompleteAt = currentTime + Math.round(weapon.reloadTime * 1000);
    }
    room.lastActivityAt = now();
    return this.getSnapshot(room.id);
  }

  private finishReload(player: PlayerSnapshot): void {
    const weapon = WEAPON_BALANCE[player.weaponId];
    const shotgunReload = getCs16ShotgunReloadTiming(player.weaponId);
    if (shotgunReload) {
      while (
        player.isReloading &&
        player.reloadCompleteAt !== undefined &&
        player.ammo < weapon.magazineSize &&
        player.reserveAmmo > 0
      ) {
        player.ammo++;
        player.reserveAmmo--;
        saveCurrentWeaponAmmo(player);
        if (player.ammo >= weapon.magazineSize || player.reserveAmmo <= 0) {
          player.isReloading = false;
          player.reloadCompleteAt = undefined;
          player.reloadAttackUnlockAt = undefined;
          return;
        }
        player.reloadCompleteAt += Math.round(shotgunReload.shellSeconds * 1000);
        if (player.reloadCompleteAt > now()) return;
      }
      return;
    }
    const needed = weapon.magazineSize - player.ammo;
    const loaded = Math.min(needed, player.reserveAmmo);
    player.ammo += loaded;
    player.reserveAmmo -= loaded;
    saveCurrentWeaponAmmo(player);
    player.isReloading = false;
    player.reloadCompleteAt = undefined;
    player.reloadAttackUnlockAt = undefined;
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
    const shotgunReload = getCs16ShotgunReloadTiming(shooter.weaponId);
    const shotgunCanInterruptReload =
      Boolean(shotgunReload) &&
      shooter.isReloading &&
      shooter.ammo > 0 &&
      currentTime >= (shooter.reloadAttackUnlockAt ?? Number.POSITIVE_INFINITY);
    if (
      !shooter.isAlive ||
      room.phase !== 'live' ||
      shooter.ammo <= 0 ||
      (shooter.isReloading && !shotgunCanInterruptReload) ||
      (shooter.nextFireAt !== undefined && currentTime < shooter.nextFireAt)
    ) {
      return undefined;
    }
    if (this.isPlayerUsingBomb(room, playerId)) {
      this.clearBombActionForPlayer(room, playerId);
      return this.getSnapshot(room.id);
    }

    const burstTiming = shooter.isBurstMode ? getCs16BurstTiming(shooter.weaponId) : undefined;
    const silencerTiming = getCs16SilencerTiming(shooter.weaponId);
    const baseWeapon = WEAPON_BALANCE[shooter.weaponId];
    const weapon = silencerTiming
      ? { ...baseWeapon, damage: shooter.isSilenced ? silencerTiming.silencedDamage : silencerTiming.unsilencedDamage }
      : burstTiming?.primaryDamage !== undefined
        ? { ...baseWeapon, damage: burstTiming.primaryDamage }
      : baseWeapon;
    if (shotgunCanInterruptReload) {
      shooter.isReloading = false;
      shooter.reloadCompleteAt = undefined;
      shooter.reloadAttackUnlockAt = undefined;
    }
    const fireCycleSeconds = getCs16PrimaryFireCycleSeconds(shooter.weaponId, shooter.isScoped) ?? 1 / weapon.fireRate;
    shooter.ammo--;
    saveCurrentWeaponAmmo(shooter);
    shooter.nextFireAt = currentTime + Math.round((burstTiming?.primaryCycleSeconds ?? fireCycleSeconds) * 1000);
    if (burstTiming) {
      shooter.pendingBurstShots = Math.min(2, shooter.ammo);
      shooter.nextBurstShotAt = shooter.pendingBurstShots > 0
        ? currentTime + Math.round(burstTiming.firstDelaySeconds * 1000)
        : undefined;
      shooter.burstOrigin = cloneVector(request.origin);
      shooter.burstDirection = cloneVector(request.direction);
      shooter.burstClientTime = request.clientTime;
    }
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
    if (!room || !player || room.config.mode !== 'defusal' || room.phase !== 'live' || player.team !== 'attackers' || !player.isAlive) return undefined;
    this.pickupDroppedBomb(room, player);
    if (room.bomb?.carrierId !== playerId || room.bomb.plantedAt !== undefined) return undefined;
    const site = MAP_CONFIGS[room.config.mapId].bombSites.find(candidate => candidate.id === request.site);
    if (!site || distance(player.position, site.position) > site.radius) {
      if (room.bomb?.plantingPlayerId !== playerId) return undefined;
      this.clearBombPlant(room);
      return this.getSnapshot(room.id);
    }
    const time = now();
    if (room.bomb.plantingPlayerId !== playerId || room.bomb.plantStartedAt === undefined) {
      room.bomb = {
        ...room.bomb,
        site: site.id,
        plantStartedAt: time,
        plantingPlayerId: playerId,
        defuseStartedAt: undefined,
        defusingPlayerId: undefined
      };
      room.bombActionAnchor = cloneVector(player.position);
    }
    room.bombActionLastSeenAt = time;
    this.processBombActions(room, time);
    return this.getSnapshot(room.id);
  }

  defuseBomb(playerId: string): MatchSnapshot | undefined {
    const room = this.findRoomByPlayer(playerId);
    const player = room?.players.get(playerId);
    if (!room || !player || room.config.mode !== 'defusal' || room.phase !== 'live' || player.team !== 'defenders' || !player.isAlive || room.bomb?.plantedAt === undefined || !room.bomb.position) return undefined;
    if (distance(player.position, room.bomb.position) > 3.2) {
      if (room.bomb.defusingPlayerId !== playerId) return undefined;
      this.clearBombDefuse(room);
      return this.getSnapshot(room.id);
    }
    const time = now();
    if (room.bomb.defusingPlayerId !== playerId || room.bomb.defuseStartedAt === undefined) {
      room.bomb = {
        ...room.bomb,
        defuseStartedAt: time,
        defusingPlayerId: playerId,
        plantStartedAt: undefined,
        plantingPlayerId: undefined
      };
      room.bombActionAnchor = cloneVector(player.position);
    }
    room.bombActionLastSeenAt = time;
    this.processBombActions(room, time);
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
      if (room.phase === 'live') this.processBombActions(room, time);
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
    const overrides = typeof modeOrConfig === 'string' ? {} : modeOrConfig;
    const mapId = overrides.mapId ?? DEFAULT_ROOM_CONFIGS[mode].mapId;
    const defaultStartingMoney = mapId === 'dust2' ? 800 : DEFAULT_ROOM_CONFIGS[mode].startingMoney;
    return {
      ...DEFAULT_ROOM_CONFIGS[mode],
      ...overrides,
      maxPlayers: maxPlayers ?? (overrides.maxPlayers ?? DEFAULT_ROOM_CONFIGS[mode].maxPlayers),
      startingMoney: overrides.startingMoney ?? defaultStartingMoney
    };
  }

  private pickTeam(room: MatchRoom, preferredTeam?: Team): Team {
    const counts = { attackers: 0, defenders: 0 };
    room.players.forEach(player => counts[player.team]++);
    const maxPerTeam = Math.ceil(room.config.maxPlayers / 2);
    if (preferredTeam && counts[preferredTeam] < maxPerTeam) return preferredTeam;
    return counts.attackers <= counts.defenders ? 'attackers' : 'defenders';
  }

  private nextSpawn(room: MatchRoom, team: Team): Vector3 {
    const map = MAP_CONFIGS[room.config.mapId] ?? MAP_CONFIGS.dust2;
    const pool = map.spawns[team];
    const index = room.spawnCursor[team]++ % pool.length;
    return cloneVector(pool[index]);
  }

  private isInBuyZone(room: MatchRoom, player: PlayerSnapshot): boolean {
    const map = MAP_CONFIGS[room.config.mapId] ?? MAP_CONFIGS.dust2;
    return map.spawns[player.team].some(spawn => distance(player.position, spawn) <= DEFUSAL_BUY_ZONE_RADIUS);
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
    room.bombActionLastSeenAt = undefined;
    room.bombActionAnchor = undefined;
    room.players.forEach(player => {
      const survivedRound = player.isAlive;
      if (room.config.mode === 'defusal' && !survivedRound) {
        const defaultWeapon = defaultWeaponForTeam(player.team);
        player.weaponId = defaultWeapon;
        player.ownedWeapons = defaultOwnedWeapons(defaultWeapon);
        player.weaponAmmo = {};
        resetWeaponAmmo(player, defaultWeapon);
        player.armor = 0;
        player.hasHelmet = false;
        player.hasDefuseKit = false;
      } else if (room.config.mode === 'defusal') {
        saveCurrentWeaponAmmo(player);
      }
      player.isAlive = true;
      player.health = 100;
      player.armor = room.config.mode === 'defusal' || usesCs16WeaponEconomy(room) ? player.armor : 50;
      player.position = this.nextSpawn(room, player.team);
      if (room.config.mode !== 'defusal') resetWeaponAmmo(player, player.weaponId);
      player.isReloading = false;
      player.reloadCompleteAt = undefined;
      player.reloadAttackUnlockAt = undefined;
      player.respawnAt = undefined;
      player.nextFireAt = undefined;
      player.isScoped = false;
      this.clearBurstQueue(player);
      player.disconnected = false;
      if (room.config.mode === 'defusal' && !room.bomb?.carrierId && !room.bomb?.position && room.bomb?.plantedAt === undefined && player.team === 'attackers') room.bomb = { carrierId: player.id };
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
    if (room.bomb?.plantedAt !== undefined && now() - room.bomb.plantedAt >= BOMB_FUSE_TIME_MS) this.endRound(room, 'attackers', 'Bomb detonated');
    else if (alive.attackers === 0 && room.bomb?.plantedAt === undefined) this.endRound(room, 'defenders', 'Attackers eliminated');
    else if (alive.defenders === 0) this.endRound(room, 'attackers', 'Defenders eliminated');
    else if (now() >= room.roundEndsAt && room.bomb?.plantedAt === undefined) this.endRound(room, 'defenders', 'Time expired');
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
    const armorApplies = target.armor > 0 && (region !== 'head' || target.hasHelmet === true);
    const armorBlocked = armorApplies ? Math.min(target.armor, Math.round(rawDamage * (1 - weapon.armorPenetration))) : 0;
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
    target.reloadAttackUnlockAt = undefined;
    target.isScoped = false;
    this.clearBurstQueue(target);
    this.clearBurstQueue(target);
    target.respawnAt = room.config.mode === 'tdm' ? serverTime + TDM_RESPAWN_DELAY_MS : undefined;
    if (room.config.mode === 'defusal') target.hasDefuseKit = false;
    if (room.bomb?.plantingPlayerId === target.id) this.clearBombPlant(room);
    if (room.bomb?.defusingPlayerId === target.id) this.clearBombDefuse(room);
    this.dropBombFromCarrier(room, target);
    target.deaths++;
    shooter.kills++;
    if (room.config.mode === 'defusal' || (room.config.mode === 'tdm' && usesCs16WeaponEconomy(room))) {
      shooter.money = this.addMoney(shooter.money, weapon.killReward);
    }
    if (room.config.mode === 'tdm') room.score[shooter.team]++;
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
      this.processBurstShots(room, player, time);
      if (player.isReloading && player.reloadCompleteAt !== undefined && time >= player.reloadCompleteAt) {
        this.finishReload(player);
      }
      if (!player.isAlive && player.respawnAt !== undefined && time >= player.respawnAt && room.config.mode === 'tdm') {
        this.respawnPlayer(room, player);
      }
      if (player.flashEndsAt !== undefined) {
        player.flashIntensity = Math.max(0, Math.min(1, (player.flashEndsAt - time) / FLASH_MAX_DURATION_MS));
        if (player.flashIntensity <= 0) player.flashEndsAt = undefined;
      }
    });
  }

  private processBombActions(room: MatchRoom, time: number): void {
    if (room.config.mode !== 'defusal' || room.phase !== 'live' || !room.bomb) return;
    if (room.bomb.plantingPlayerId && room.bomb.plantStartedAt !== undefined) {
      const player = room.players.get(room.bomb.plantingPlayerId);
      const site = MAP_CONFIGS[room.config.mapId].bombSites.find(candidate => candidate.id === room.bomb?.site);
      const heartbeatAlive = room.bombActionLastSeenAt !== undefined && time - room.bombActionLastSeenAt <= BOMB_ACTION_HEARTBEAT_GRACE_MS;
      const anchorHeld = Boolean(player && room.bombActionAnchor && distance(player.position, room.bombActionAnchor) <= BOMB_ACTION_MOVE_CANCEL_DISTANCE);
      const stillPlanting = Boolean(player?.isAlive && site && anchorHeld && room.bomb.carrierId === player.id && distance(player.position, site.position) <= site.radius);
      if (!heartbeatAlive || !stillPlanting) {
        this.clearBombPlant(room);
        return;
      }
      if (time - room.bomb.plantStartedAt >= BOMB_PLANT_TIME_MS) {
        room.bomb = {
          site: site!.id,
          plantedBy: player!.id,
          plantedAt: time,
          position: cloneVector(player!.position)
        };
        room.bombActionLastSeenAt = undefined;
        room.roundEndsAt = time + BOMB_FUSE_TIME_MS;
      }
      return;
    }

    if (room.bomb.defusingPlayerId && room.bomb.defuseStartedAt !== undefined && room.bomb.plantedAt !== undefined && room.bomb.position) {
      const player = room.players.get(room.bomb.defusingPlayerId);
      const heartbeatAlive = room.bombActionLastSeenAt !== undefined && time - room.bombActionLastSeenAt <= BOMB_ACTION_HEARTBEAT_GRACE_MS;
      const anchorHeld = Boolean(player && room.bombActionAnchor && distance(player.position, room.bombActionAnchor) <= BOMB_ACTION_MOVE_CANCEL_DISTANCE);
      const stillDefusing = Boolean(player?.isAlive && anchorHeld && player.team === 'defenders' && distance(player.position, room.bomb.position) <= 3.2);
      if (!heartbeatAlive || !stillDefusing) {
        this.clearBombDefuse(room);
        return;
      }
      const defuseTime = player?.hasDefuseKit ? BOMB_DEFUSE_KIT_TIME_MS : BOMB_DEFUSE_TIME_MS;
      if (time - room.bomb.defuseStartedAt >= defuseTime) {
        this.endRound(room, 'defenders', 'Bomb defused');
      }
    }
  }

  private clearBombPlant(room: MatchRoom): void {
    if (!room.bomb) return;
    room.bomb = {
      ...room.bomb,
      site: room.bomb.plantedAt !== undefined ? room.bomb.site : undefined,
      plantStartedAt: undefined,
      plantingPlayerId: undefined
    };
    room.bombActionLastSeenAt = undefined;
    room.bombActionAnchor = undefined;
  }

  private clearBombDefuse(room: MatchRoom): void {
    if (!room.bomb) return;
    room.bomb = {
      ...room.bomb,
      defuseStartedAt: undefined,
      defusingPlayerId: undefined
    };
    room.bombActionLastSeenAt = undefined;
    room.bombActionAnchor = undefined;
  }

  private dropBombFromCarrier(room: MatchRoom, player: PlayerSnapshot): void {
    if (room.config.mode !== 'defusal' || room.bomb?.carrierId !== player.id || room.bomb.plantedAt !== undefined) return;
    this.clearBombActionForPlayer(room, player.id);
    room.bomb = {
      ...room.bomb,
      carrierId: undefined,
      position: cloneVector(player.position),
      site: undefined
    };
    this.recordEvent(room, 'objective', `${player.name} dropped the bomb`, player.id);
  }

  private pickupDroppedBomb(room: MatchRoom, player: PlayerSnapshot): void {
    if (
      room.config.mode !== 'defusal'
      || player.team !== 'attackers'
      || !player.isAlive
      || !room.bomb?.position
      || room.bomb.carrierId
      || room.bomb.plantedAt !== undefined
      || distance(player.position, room.bomb.position) > BOMB_PICKUP_RADIUS
    ) {
      return;
    }
    room.bomb = {
      ...room.bomb,
      carrierId: player.id,
      position: undefined,
      site: undefined
    };
    this.recordEvent(room, 'objective', `${player.name} picked up the bomb`, player.id);
  }

  private respawnPlayer(room: MatchRoom, player: PlayerSnapshot): void {
    player.isAlive = true;
    player.health = 100;
    player.armor = usesCs16WeaponEconomy(room) ? 0 : 50;
    if (usesCs16WeaponEconomy(room)) player.hasHelmet = false;
    player.position = this.nextSpawn(room, player.team);
    resetWeaponAmmo(player, player.weaponId);
    player.isReloading = false;
    player.reloadCompleteAt = undefined;
    player.reloadAttackUnlockAt = undefined;
    player.respawnAt = undefined;
    player.nextFireAt = undefined;
    player.isScoped = false;
    this.clearBurstQueue(player);
  }

  private endRound(room: MatchRoom, winner: Team, reason: string): void {
    this.clearBombPlant(room);
    this.clearBombDefuse(room);
    if (room.config.mode === 'defusal') this.awardDefusalRoundMoney(room, winner);
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

  private applyWeaponInputState(player: PlayerSnapshot, buttons = 0, time: number): void {
    player.isScoped = isCs16ScopedWeapon(player.weaponId) && Boolean(buttons & PLAYER_INPUT_BUTTON_SCOPE);
    const wantsBurst = isCs16BurstWeapon(player.weaponId) && Boolean(buttons & PLAYER_INPUT_BUTTON_BURST);
    if (isCs16BurstWeapon(player.weaponId)) {
      if (wantsBurst !== Boolean(player.isBurstMode) && time >= (player.nextSecondaryAt ?? 0)) {
        player.isBurstMode = wantsBurst;
        player.nextSecondaryAt = time + 300;
      }
    } else {
      player.isBurstMode = false;
      this.clearBurstQueue(player);
    }
    const silencerTiming = getCs16SilencerTiming(player.weaponId);
    if (!silencerTiming) {
      player.isSilenced = false;
      return;
    }

    const wantsSilencer = Boolean(buttons & PLAYER_INPUT_BUTTON_SILENCER);
    if (wantsSilencer === Boolean(player.isSilenced) || time < (player.nextSecondaryAt ?? 0)) return;
    player.isSilenced = wantsSilencer;
    player.weaponSilenced = { ...(player.weaponSilenced ?? {}), [player.weaponId]: wantsSilencer };
    const adjustMs = Math.round(silencerTiming.adjustSeconds * 1000);
    player.nextSecondaryAt = time + adjustMs;
    player.nextFireAt = Math.max(player.nextFireAt ?? 0, time + adjustMs);
  }

  private saveCurrentWeaponMode(player: PlayerSnapshot): void {
    if (!isCs16SilencerWeapon(player.weaponId)) return;
    player.weaponSilenced = { ...(player.weaponSilenced ?? {}), [player.weaponId]: Boolean(player.isSilenced) };
  }

  private processBurstShots(room: MatchRoom, shooter: PlayerSnapshot, time: number): void {
    while (
      shooter.isAlive &&
      isCs16BurstWeapon(shooter.weaponId) &&
      (shooter.pendingBurstShots ?? 0) > 0 &&
      shooter.nextBurstShotAt !== undefined &&
      time >= shooter.nextBurstShotAt
    ) {
      if (shooter.ammo <= 0 || !shooter.burstOrigin || !shooter.burstDirection) {
        this.clearBurstQueue(shooter);
        return;
      }
      const burstTiming = getCs16BurstTiming(shooter.weaponId);
      if (!burstTiming) {
        this.clearBurstQueue(shooter);
        return;
      }
      const shotTime = shooter.nextBurstShotAt;
      const baseWeapon = WEAPON_BALANCE[shooter.weaponId];
      const weapon = burstTiming.followupDamage !== undefined
        ? { ...baseWeapon, damage: burstTiming.followupDamage }
        : baseWeapon;
      shooter.ammo--;
      saveCurrentWeaponAmmo(shooter);
      this.applyServerShot(
        room,
        shooter,
        shooter.burstOrigin,
        shooter.burstDirection,
        weapon,
        shotTime,
        shooter.burstClientTime ?? 0
      );
      shooter.pendingBurstShots = Math.max(0, (shooter.pendingBurstShots ?? 0) - 1);
      shooter.nextBurstShotAt = shooter.pendingBurstShots > 0
        ? shotTime + Math.round(burstTiming.followupDelaySeconds * 1000)
        : undefined;
    }
  }

  private applyServerShot(
    room: MatchRoom,
    shooter: PlayerSnapshot,
    origin: Vector3,
    directionVector: Vector3,
    weapon: WeaponBalance,
    fireTime: number,
    clientTime: number
  ): void {
    const direction = normalize(directionVector);
    const shooterLatency = Math.min(clientTime > 0 ? fireTime - clientTime : 0, MAX_BACKTRACK_MS);
    const backtrackTime = fireTime - shooterLatency;
    let bestTarget: { player: PlayerSnapshot; region: HitRegion; distance: number } | undefined;

    for (const target of room.players.values()) {
      if (target.id === shooter.id || !target.isAlive) continue;
      if (!room.config.friendlyFire && target.team === shooter.team) continue;
      const targetPos = this.getBacktrackedPosition(room, target.id, backtrackTime) ?? target.position;
      const hit = this.getPlayerRayHit(origin, direction, targetPos, weapon.range);
      if (!hit) continue;
      if (!bestTarget || hit.distance < bestTarget.distance) bestTarget = { player: target, ...hit };
    }

    room.lastHit = bestTarget
      ? this.damagePlayer(room, shooter, bestTarget.player, weapon, bestTarget.region, fireTime)
      : {
          shooterId: shooter.id,
          weaponId: shooter.weaponId,
          damage: 0,
          killed: false,
          serverTime: fireTime
        };
    room.lastActivityAt = fireTime;
  }

  private clearBurstQueue(player: PlayerSnapshot): void {
    player.pendingBurstShots = 0;
    player.nextBurstShotAt = undefined;
    player.burstOrigin = undefined;
    player.burstDirection = undefined;
    player.burstClientTime = undefined;
  }

  private isPlayerUsingBomb(room: MatchRoom, playerId: string): boolean {
    return room.bomb?.plantingPlayerId === playerId || room.bomb?.defusingPlayerId === playerId;
  }

  private clearBombActionForPlayer(room: MatchRoom, playerId: string): void {
    if (room.bomb?.plantingPlayerId === playerId) this.clearBombPlant(room);
    if (room.bomb?.defusingPlayerId === playerId) this.clearBombDefuse(room);
  }

  private awardDefusalRoundMoney(room: MatchRoom, winner: Team): void {
    const loser = winner === 'attackers' ? 'defenders' : 'attackers';
    room.lossStreak[winner] = 0;
    room.lossStreak[loser] = Math.min(room.lossStreak[loser] + 1, DEFUSAL_LOSS_REWARDS.length);
    const loserReward = DEFUSAL_LOSS_REWARDS[room.lossStreak[loser] - 1] ?? DEFUSAL_LOSS_REWARDS[DEFUSAL_LOSS_REWARDS.length - 1];
    room.players.forEach(player => {
      player.money = this.addMoney(player.money, player.team === winner ? DEFUSAL_WIN_REWARD : loserReward);
    });
  }

  private addMoney(current: number, amount: number): number {
    return Math.min(DEFUSAL_MAX_MONEY, current + amount);
  }

  // server/rooms.ts
  private snapshot(room: MatchRoom): MatchSnapshot {
    return {
      roomId: room.id,
      config: room.config,
      phase: room.phase,
      serverTime: now(),
      round: room.round,
      roundTimeRemaining: Math.max(0, (room.roundEndsAt - now()) / 1000),
      score: room.score, // 【优化 3】移除 { ...room.score }，直接传引用，交由底层序列化
      players: Array.from(room.players.values()).map(player => ({
        ...player, // 外层对象浅拷贝即可
        // 移除 [...player.ownedWeapons] 和 { ...player.position } 的高频解构
        ownedWeapons: player.ownedWeapons,
        position: player.position,
        rotation: player.rotation,
        lastProcessedSeq: room.lastInputSeq.get(player.id)
      })),
      grenades: room.activeGrenades.map(grenade => ({
        id: grenade.id,
        type: grenade.type,
        throwerId: grenade.throwerId,
        position: this.simulateGrenadePosition(grenade, now()),
        exploded: grenade.exploded
      })),
      spectatorCount: room.spectators.size,
      // 简化 Bomb 对象的解构
      bomb: room.bomb,
      killFeed: room.killFeed,
      lastHit: room.lastHit,
      events: room.events,
      securityEvents: room.securityEvents,
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
      const player = room.players.get(playerId);
      room.players.delete(playerId);
      room.sessionByPlayerId.delete(playerId);
      room.disconnectedAt.delete(playerId);
      room.positionHistory.delete(playerId);
      room.lastInputSeq.delete(playerId);
      if (player) this.dropBombFromCarrier(room, player);
      removedExpiredPlayer = true;
    }
    if (removedExpiredPlayer && room.players.size === 0 && room.spectators.size === 0) this.rooms.delete(room.id);
  }

  private moveKey<T>(map: Map<string, T>, oldKey: string, newKey: string): void {
    const value = map.get(oldKey);
    map.delete(oldKey);
    if (value !== undefined) map.set(newKey, value);
  }

  // server/rooms.ts
  private getBacktrackedPosition(room: MatchRoom, playerId: string, targetTime: number): Vector3 | null {
    const history = room.positionHistory.get(playerId);
    if (!history || history.length === 0) return null;
    if (targetTime < history[0].time - 10) return null; // Too far back

    // 【优化 2：二分查找】利用时间戳的有序性，快速定位延迟补偿的对应帧
    let left = 0;
    let right = history.length - 1;
    let best = history[0];

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (history[mid].time <= targetTime) {
        best = history[mid]; // 记录当前最接近的值
        left = mid + 1;      // 继续向后找看看有没有更接近的
      } else {
        right = mid - 1;     // 时间超前了，往前找
      }
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
        grenade.explodedAt = time;
        // Grenade detonation - apply damage to players in range
        const damageCfg = GRENADE_DAMAGE[grenade.type];
        const gpos = this.simulateGrenadePosition(grenade, time);
        const thrower = room.players.get(grenade.throwerId);
        if (damageCfg.base > 0) {
          for (const player of room.players.values()) {
            if (!player.isAlive) continue;
            if (
              player.id !== grenade.throwerId
              && thrower
              && !room.config.friendlyFire
              && player.team === thrower.team
            ) continue;
            const dist = distance(player.position, gpos);
            if (dist > damageCfg.radius) continue;
            const dmg = Math.round(damageCfg.base * (1 - dist / damageCfg.radius));
            if (dmg <= 0) continue;
            this.applyGrenadeDamage(room, thrower, player, grenade.type, dmg, time);
          }
        }
        if (grenade.type === 'flashbang') {
          // Flashbang effect: apply to all players in range (server validated)
          for (const player of room.players.values()) {
            if (!player.isAlive) continue;
            const dist = distance(player.position, gpos);
            if (dist < GRENADE_DAMAGE.flashbang.radius) {
              const intensity = 1 - dist / GRENADE_DAMAGE.flashbang.radius;
              player.flashIntensity = Math.max(player.flashIntensity ?? 0, intensity);
              player.flashEndsAt = Math.max(player.flashEndsAt ?? time, time + intensity * FLASH_MAX_DURATION_MS);
            }
          }
        }
      }
    }
    room.activeGrenades = room.activeGrenades.filter(g => !g.exploded || time - (g.explodedAt ?? time) < 250);
  }

  private applyGrenadeDamage(
    room: MatchRoom,
    thrower: PlayerSnapshot | undefined,
    target: PlayerSnapshot,
    grenadeType: GrenadeId,
    rawDamage: number,
    time: number
  ): void {
    let healthDamage = rawDamage;
    if (grenadeType === 'he' && target.armor > 0) {
      const armorRatio = 0.5;
      const armorBonus = 0.5;
      healthDamage = rawDamage * armorRatio;
      const armorDamage = (rawDamage - healthDamage) * armorBonus;
      if (armorDamage > target.armor) {
        healthDamage = rawDamage - target.armor / armorBonus;
        target.armor = 0;
      } else {
        target.armor = Math.max(0, target.armor - armorDamage);
      }
    }

    target.health = Math.max(0, target.health - Math.round(healthDamage));
    if (target.health > 0) return;

    target.isAlive = false;
    target.isReloading = false;
    target.reloadCompleteAt = undefined;
    target.reloadAttackUnlockAt = undefined;
    target.isScoped = false;
    target.respawnAt = room.config.mode === 'tdm' ? time + TDM_RESPAWN_DELAY_MS : undefined;
    if (room.config.mode === 'defusal') target.hasDefuseKit = false;
    if (room.bomb?.plantingPlayerId === target.id) this.clearBombPlant(room);
    if (room.bomb?.defusingPlayerId === target.id) this.clearBombDefuse(room);
    this.dropBombFromCarrier(room, target);
    target.deaths++;

    if (!thrower || thrower.id === target.id) return;
    thrower.kills++;
    if (room.config.mode === 'defusal' || (room.config.mode === 'tdm' && usesCs16WeaponEconomy(room))) {
      thrower.money = this.addMoney(thrower.money, WEAPON_BALANCE.hegrenade.killReward);
    }
    if (room.config.mode === 'tdm') room.score[thrower.team]++;
    const message = `${sanitizeFeedPart(thrower.name)} [HE Grenade] ${sanitizeFeedPart(target.name)}`;
    room.killFeed.unshift(message);
    room.killFeed = room.killFeed.slice(0, 5);
    this.recordEvent(room, 'kill', message, thrower.id);
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
    if (usesCs16WeaponEconomy(room) && !CS16_GRENADE_IDS.has(request.type)) return undefined;
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
