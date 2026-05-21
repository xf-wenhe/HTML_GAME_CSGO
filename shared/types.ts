export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export type MatchMode = 'tdm' | 'defusal';
export type Team = 'attackers' | 'defenders';
export type MatchPhase = 'warmup' | 'buy' | 'live' | 'roundEnd' | 'matchEnd';
export type WeaponId = 'sidearm' | 'heavy_pistol' | 'vandal' | 'sentinel' | 'operator' | 'specter' | 'bulldog' | 'knife';
export type MapId = 'forgepoint';

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
  damage: number;
  fireRate: number;
  magazineSize: number;
  reloadTime: number;
  spread: number;
  movementSpeedMultiplier: number;
  armorPenetration: number;
  headshotMultiplier: number;
  range: number;
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
  ammo: number;
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
}

export interface ShootRequest {
  origin: Vector3;
  direction: Vector3;
  weaponId: WeaponId;
  clientTime: number;
}

export interface BuyRequest {
  weaponId: WeaponId;
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
