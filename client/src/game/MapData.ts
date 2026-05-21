import * as THREE from 'three';
import { EnemyType } from './Enemy.js';

export interface BoxSpec {
  position: THREE.Vector3;
  size: THREE.Vector3;
  color: number;
  metalness?: number;
  roughness?: number;
  name?: string;
}

export interface EnemySpawnPoint {
  position: THREE.Vector3;
  type: EnemyType;
}

export interface ArenaData {
  name: string;
  playerSpawn: THREE.Vector3;
  enemySpawns: EnemySpawnPoint[];
  colliders: BoxSpec[];
  props: BoxSpec[];
}

const cover = (x: number, y: number, z: number, sx: number, sy: number, sz: number, color = 0x6f737a): BoxSpec => ({
  position: new THREE.Vector3(x, y, z),
  size: new THREE.Vector3(sx, sy, sz),
  color,
  metalness: 0.25,
  roughness: 0.55
});

export const INDUSTRIAL_ARENA: ArenaData = {
  name: 'Forgepoint Survival Yard',
  playerSpawn: new THREE.Vector3(0, 1.7, 11),
  enemySpawns: [
    { position: new THREE.Vector3(-13, 1.2, -16), type: 'patrol' },
    { position: new THREE.Vector3(13, 1.2, -16), type: 'patrol' },
    { position: new THREE.Vector3(-18, 1.2, 2), type: 'assault' },
    { position: new THREE.Vector3(18, 1.2, 2), type: 'assault' },
    { position: new THREE.Vector3(0, 1.2, -22), type: 'shooter' },
    { position: new THREE.Vector3(-7, 1.2, -9), type: 'shooter' },
    { position: new THREE.Vector3(7, 1.2, -9), type: 'shooter' }
  ],
  colliders: [
    cover(0, 1.8, -27, 42, 3.6, 1.2, 0x3d4148),
    cover(-21, 1.8, -6, 1.2, 3.6, 44, 0x3d4148),
    cover(21, 1.8, -6, 1.2, 3.6, 44, 0x3d4148),
    cover(0, 1.8, 16, 42, 3.6, 1.2, 0x3d4148),
    cover(-8, 1.2, 3, 6, 2.4, 1.1),
    cover(8, 1.2, 3, 6, 2.4, 1.1),
    cover(0, 0.8, -4, 4, 1.6, 2.2, 0xb57b36),
    cover(-13, 0.7, -8, 2.4, 1.4, 5, 0xb57b36),
    cover(13, 0.7, -8, 2.4, 1.4, 5, 0xb57b36),
    cover(-5.5, 0.55, -15, 4.2, 1.1, 1.2, 0x52606d),
    cover(5.5, 0.55, -15, 4.2, 1.1, 1.2, 0x52606d),
    cover(0, 1.5, -18.5, 2.5, 3, 2.5, 0x4b5563)
  ],
  props: [
    cover(-17, 3, -20, 1.5, 6, 1.5, 0x2f343b),
    cover(17, 3, -20, 1.5, 6, 1.5, 0x2f343b),
    cover(-17, 3, 10, 1.5, 6, 1.5, 0x2f343b),
    cover(17, 3, 10, 1.5, 6, 1.5, 0x2f343b),
    cover(0, 5.2, -20, 35, 0.45, 0.45, 0x58606b),
    cover(0, 5.2, 10, 35, 0.45, 0.45, 0x58606b),
    cover(-17, 5.2, -5, 0.45, 0.45, 32, 0x58606b),
    cover(17, 5.2, -5, 0.45, 0.45, 32, 0x58606b)
  ]
};
