export type {
  BombActionRequest,
  BombState,
  BuyRequest,
  MapId,
  MatchMode,
  MatchPhase,
  MatchSnapshot,
  PlayerInputRequest,
  PlayerSnapshot,
  RoomConfig,
  RoomListItem,
  ShootRequest,
  Team,
  Vector3,
  WeaponId
} from '../../../shared/types.js';

import { Vector3 } from '../../../shared/types.js';

export type GameMode = 'solo' | 'multiplayer';

export interface PlayerState {
  id: string;
  position: Vector3;
  rotation: Vector3;
  health: number;
  isDead: boolean;
}

export interface Weapon {
  id: string;
  name: string;
  damage: number;
  fireRate: number;
  magazineSize: number;
  reloadTime: number;
  spread: number;
  projectileSpeed: number;
}

export interface BoundingBox {
  min: Vector3;
  max: Vector3;
}

export interface MapData {
  name: string;
  walls: BoundingBox[];
  spawnPoints: Vector3[];
  enemySpawns: Array<{
    type: 'patrol' | 'shooter' | 'assault';
    position: Vector3;
    count: number;
    patrolPath?: Vector3[];
  }>;
  objectives?: Array<{
    type: 'eliminate' | 'reach';
    target: Vector3;
    required: number;
  }>;
}
