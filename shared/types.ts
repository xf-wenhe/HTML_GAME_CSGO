export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export type MatchMode = 'tdm' | 'defusal';
export type Team = 'attackers' | 'defenders';
export type MatchPhase = 'warmup' | 'buy' | 'live' | 'roundEnd' | 'matchEnd';
export type WeaponId =
  | 'pistol' | 'usp_s' | 'p250' | 'five_seven' | 'deagle' | 'dual_berettas' | 'r8' | 'cz75' | 'tec9' | 'p2000'
  | 'mp9' | 'mac10' | 'pp_bizon' | 'mp7' | 'ump45' | 'p90'
  | 'm4a1s' | 'm4a4' | 'ak47' | 'famas' | 'galil' | 'sg553' | 'aug'
  | 'awp' | 'ssg08' | 'scar20' | 'g3sg1'
  | 'nova' | 'mag7' | 'xm1014' | 'm249' | 'negev'
  | 'knife'
  | 'sidearm' | 'heavy_pistol' | 'vandal' | 'sentinel' | 'operator' | 'specter' | 'bulldog'
  | 'rifle' | 'sniper' | 'shotgun' | 'smg' | 'defender_rifle';
export type MapId = 'dust2' | 'warehouse' | 'italy' | 'mirage' | 'inferno' | 'nuke' | 'train' | 'overpass';
export type BuyCategory = 'pistol' | 'smg' | 'rifle' | 'shotgun' | 'sniper' | 'melee';
export type GrenadeId = 'he' | 'flashbang' | 'smoke' | 'incendiary' | 'decoy';
export type HitRegion = 'head' | 'body';

export interface RoomConfig {
  mode: MatchMode;
  mapId: MapId;
  maxPlayers: number;
  tickRate: number;
  isPrivate: boolean;
  friendlyFire: boolean;
  roundLimit: number;
  warmupSeconds: number;
}

export interface WeaponBalance {
  id: WeaponId;
  name: string;
  price: number;
  teams: Team[] | 'both';
  buyCategory: BuyCategory;
  killReward: number;
  damage: number;
  fireRate: number;
  magazineSize: number;
  maxReserveAmmo: number;
  reloadTime: number;
  spread: number;
  movementSpeedMultiplier: number;
  armorPenetration: number;
  headshotMultiplier: number;
  range: number;
  recoilKick?: number;
  moveInaccuracy?: number;
}

export interface PlayerSnapshot {
  id: string;
  name: string;
  team: Team;
  position: Vector3;
  rotation: Vector3;
  health: number;
  armor: number;
  money: number;
  weaponId: WeaponId;
  ownedWeapons?: WeaponId[];
  ammo: number;
  reserveAmmo: number;
  isReloading?: boolean;
  reloadCompleteAt?: number;
  nextFireAt?: number;
  respawnAt?: number;
  grenades?: Partial<Record<GrenadeId, number>>;
  kills: number;
  deaths: number;
  assists: number;
  ping: number;
  isAlive: boolean;
  isReady: boolean;
}

export interface BombState {
  carrierId?: string;
  plantedBy?: string;
  site?: 'A' | 'B';
  position?: Vector3;
  plantedAt?: number;
  defuseStartedAt?: number;
  defusingPlayerId?: string;
}

export interface MatchSnapshot {
  roomId: string;
  config: RoomConfig;
  phase: MatchPhase;
  serverTime: number;
  round: number;
  roundTimeRemaining: number;
  score: Record<Team, number>;
  players: PlayerSnapshot[];
  bomb?: BombState;
  killFeed: string[];
  lastHit?: HitResult;
}

export interface HitResult {
  shooterId: string;
  victimId?: string;
  weaponId: WeaponId;
  region?: HitRegion;
  damage: number;
  killed: boolean;
  serverTime: number;
  position?: Vector3;
}

export interface ShootRequest {
  origin: Vector3;
  direction: Vector3;
  weaponId: WeaponId;
  clientTime: number;
}

export interface BuyRequest {
  weaponId?: WeaponId;
  armor?: boolean;
  grenadeId?: GrenadeId;
}

export interface BombActionRequest {
  site?: 'A' | 'B';
}

export interface PlayerInputRequest {
  position: Vector3;
  rotation: Vector3;
}

export interface RoomListItem {
  id: string;
  mode: MatchMode;
  mapId: MapId;
  playerCount: number;
  maxPlayers: number;
  phase: MatchPhase;
}
