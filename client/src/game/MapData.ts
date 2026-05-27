import * as THREE from 'three';
import { EnemyType } from './Enemy.js';
import type { MapId } from './types.js';
import { DUST2_COLLIDERS } from './Dust2Layout.js';
import { MIRAGE_COLLIDERS, MIRAGE_SPAWNS, MIRAGE_BOMB_SITES } from './MirageLayout.js';
import { INFERNO_COLLIDERS, INFERNO_SPAWNS, INFERNO_BOMB_SITES } from './InfernoLayout.js';
import { TRAIN_COLLIDERS, TRAIN_SPAWNS, TRAIN_BOMB_SITES } from './TrainLayout.js';
import { OVERPASS_COLLIDERS, OVERPASS_SPAWNS, OVERPASS_BOMB_SITES } from './OverpassLayout.js';
import { NUKE_COLLIDERS, NUKE_SPAWNS, NUKE_BOMB_SITES } from './NukeLayout.js';
import { ITALY_COLLIDERS, ITALY_SPAWNS, ITALY_BOMB_SITES } from './ItalyLayout.js';
import { WAREHOUSE_COLLIDERS, WAREHOUSE_SPAWNS, WAREHOUSE_BOMB_SITES } from './WarehouseLayout.js';
import {
  DUST2_GAME_BOUNDS,
  PLAYER_EYE_HEIGHT
} from './constants/MapUnits.js';
import {
  DUST2_SPAWNS
} from './constants/Dust2HammerData.js';

export interface BoxSpec {
  position: THREE.Vector3;
  size: THREE.Vector3;
  color: number;
  metalness?: number;
  roughness?: number;
  opacity?: number;
  name?: string;
  rotation?: { x: number; y: number; z: number };
  textureKey?: 'sand' | 'concrete' | 'wood' | 'metal' | 'plaster';
}

export interface EnemySpawnPoint {
  position: THREE.Vector3;
  type: EnemyType;
}

export type SurfaceMaterial = 'sand' | 'stone' | 'concrete' | 'metal' | 'wood' | 'rubber' | 'cobblestone' | 'tile' | 'glass';

export interface MaterialZone {
  name: string;
  material: SurfaceMaterial;
  position: THREE.Vector3;
  size: THREE.Vector3;
}

export interface ArenaData {
  name: string;
  playerSpawn: THREE.Vector3;
  bounds: { width: number; depth: number; centerZ: number };
  enemySpawns: EnemySpawnPoint[];
  colliders: BoxSpec[];
  props: BoxSpec[];
  materialZones?: MaterialZone[];
}

const box = (
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
  color = 0x6f737a,
  name?: string,
  metalness = 0.22,
  roughness = 0.58,
  opacity?: number
): BoxSpec => ({
  position: new THREE.Vector3(x, y, z),
  size: new THREE.Vector3(sx, sy, sz),
  color,
  metalness,
  roughness,
  opacity,
  name
});

export const INDUSTRIAL_ARENA: ArenaData = {
  name: 'Forgepoint Works',
  playerSpawn: new THREE.Vector3(0, 1.7, 28),
  bounds: { width: 78, depth: 92, centerZ: -8 },
  enemySpawns: [
    { position: new THREE.Vector3(-24, 1.7, -30), type: 'patrol' },
    { position: new THREE.Vector3(24, 1.7, -30), type: 'patrol' },
    { position: new THREE.Vector3(-29, 1.7, -4), type: 'assault' },
    { position: new THREE.Vector3(29, 1.7, -4), type: 'assault' },
    { position: new THREE.Vector3(0, 1.7, -42), type: 'shooter' },
    { position: new THREE.Vector3(-14, 1.7, -18), type: 'shooter' },
    { position: new THREE.Vector3(14, 1.7, -18), type: 'shooter' },
    { position: new THREE.Vector3(-7, 1.7, 7), type: 'patrol' },
    { position: new THREE.Vector3(7, 1.7, 7), type: 'patrol' }
  ],
  materialZones: [
    { name: 'main-concrete-floor', material: 'concrete', position: new THREE.Vector3(0, 0, -8), size: new THREE.Vector3(78, 0.1, 92) },
    { name: 'a-metal-catwalk-surface', material: 'metal', position: new THREE.Vector3(-18, 2.85, -40), size: new THREE.Vector3(10, 0.1, 12) },
    { name: 'b-metal-catwalk-surface', material: 'metal', position: new THREE.Vector3(18, 2.85, -40), size: new THREE.Vector3(10, 0.1, 12) },
    { name: 'mid-wood-crate-surface', material: 'wood', position: new THREE.Vector3(0, 1.4, -18), size: new THREE.Vector3(12, 0.1, 12) }
  ],
  colliders: [
    box(0, 2.4, -54, 78, 4.8, 1.2, 0x424950, 'north-wall'),
    box(0, 2.4, 38, 78, 4.8, 1.2, 0x424950, 'south-wall'),
    box(-39, 2.4, -8, 1.2, 4.8, 92, 0x424950, 'west-wall'),
    box(39, 2.4, -8, 1.2, 4.8, 92, 0x424950, 'east-wall'),

    box(-24, 2, 17, 20, 4, 1.1, 0x69717a, 't-spawn-left-wall'),
    box(24, 2, 17, 20, 4, 1.1, 0x69717a, 't-spawn-right-wall'),
    box(-11, 2, 18, 1.1, 4, 18, 0x69717a, 'left-mid-entry'),
    box(11, 2, 18, 1.1, 4, 18, 0x69717a, 'right-mid-entry'),

    box(-29, 1.8, -18, 1.1, 3.6, 28, 0x5f6871, 'a-long-wall'),
    box(-17, 1.8, -31, 24, 3.6, 1.1, 0x5f6871, 'a-site-back'),
    box(-20, 1.2, -15, 8, 2.4, 1.1, 0xb57b36, 'a-crate-cover'),
    box(-31, 1.1, -5, 5, 2.2, 7, 0x52606d, 'a-stack'),

    box(29, 1.8, -18, 1.1, 3.6, 28, 0x5f6871, 'b-long-wall'),
    box(17, 1.8, -31, 24, 3.6, 1.1, 0x5f6871, 'b-site-back'),
    box(20, 1.2, -15, 8, 2.4, 1.1, 0xb57b36, 'b-crate-cover'),
    box(31, 1.1, -5, 5, 2.2, 7, 0x52606d, 'b-stack'),

    box(0, 1.2, -8, 4.6, 2.4, 6.5, 0x737b84, 'mid-box'),
    box(-8, 0.65, -8, 7, 1.3, 1.1, 0x9b6a2d, 'mid-low-left'),
    box(8, 0.65, -8, 7, 1.3, 1.1, 0x9b6a2d, 'mid-low-right'),
    box(0, 1.5, -23, 2.2, 3, 12, 0x4b5563, 'ct-pillar'),

    box(-19, 1.2, 3, 10, 2.4, 1.1, 0x6b7280, 'left-catwalk-cover'),
    box(19, 1.2, 3, 10, 2.4, 1.1, 0x6b7280, 'right-catwalk-cover'),
    box(-6, 0.6, 5, 5, 1.2, 5, 0x9b6a2d, 'mid-crate-left'),
    box(6, 0.6, 5, 5, 1.2, 5, 0x9b6a2d, 'mid-crate-right'),

    box(0, 5.2, 23.5, 26, 1.2, 1.2, 0x4d5763, 'main-gate-wall'),
    box(-14.2, 2.4, 23.5, 1.2, 4.8, 9, 0x4d5763, 'left-gate-jamb'),
    box(14.2, 2.4, 23.5, 1.2, 4.8, 9, 0x4d5763, 'right-gate-jamb'),
    box(-24, 2.1, -2, 12, 4.2, 1, 0x586473, 'a-room-front'),
    box(-18, 2.1, 4, 1, 4.2, 12, 0x586473, 'a-room-inner-wall'),
    box(-30, 2.1, 4, 1, 4.2, 12, 0x586473, 'a-closed-room-outer-wall'),
    box(-24, 2.1, 10, 12, 4.2, 1, 0x586473, 'a-closed-room-back-wall'),
    box(-21, 4.45, 4, 7.5, 0.5, 12, 0x303943, 'a-closed-room-ceiling'),
    box(24, 2.1, -2, 12, 4.2, 1, 0x586473, 'b-room-front'),
    box(18, 2.1, 4, 1, 4.2, 12, 0x586473, 'b-room-inner-wall'),
    box(30, 2.1, 4, 1, 4.2, 12, 0x586473, 'b-closed-room-outer-wall'),
    box(24, 2.1, 10, 12, 4.2, 1, 0x586473, 'b-closed-room-back-wall'),
    box(21, 4.45, 4, 7.5, 0.5, 12, 0x303943, 'b-closed-room-ceiling'),
    box(-12, 0.85, -20, 6, 1.7, 3, 0x9b6a2d, 'a-crouch-jump-crate'),
    box(12, 0.85, -20, 6, 1.7, 3, 0x9b6a2d, 'b-crouch-jump-crate'),

    box(-18, 2.55, -40, 10, 0.55, 12, 0x4f5964, 'a-second-floor-collider'),
    box(18, 2.55, -40, 10, 0.55, 12, 0x4f5964, 'b-second-floor-collider'),
    box(0, 2.65, -35, 9, 0.5, 18, 0x53606c, 'mid-bridge-second-floor'),
    box(-8.5, 2.45, -31, 1, 3.2, 10, 0x5f6871, 'upper-window-left-wall'),
    box(8.5, 2.45, -31, 1, 3.2, 10, 0x5f6871, 'upper-window-right-wall'),
    box(0, 4.15, -45, 28, 3.1, 1, 0x5f6871, 'upper-back-room-wall'),
    box(-18, 3.25, -46, 10, 2.4, 1, 0x5f6871, 'a-upper-closed-room-back-wall'),
    box(-23.5, 3.25, -40, 1, 2.4, 12, 0x5f6871, 'a-upper-closed-room-side-wall'),
    box(18, 3.25, -46, 10, 2.4, 1, 0x5f6871, 'b-upper-closed-room-back-wall'),
    box(23.5, 3.25, -40, 1, 2.4, 12, 0x5f6871, 'b-upper-closed-room-side-wall'),
    box(-18, 0.2, -27, 3.6, 0.4, 2.2, 0x7d8792, 'a-stair-step-1'),
    box(-18, 0.55, -28.6, 3.6, 0.4, 2.2, 0x7d8792, 'a-stair-step-2'),
    box(-18, 0.9, -30.2, 3.6, 0.4, 2.2, 0x7d8792, 'a-stair-step-3'),
    box(-18, 1.25, -31.8, 3.6, 0.4, 2.2, 0x7d8792, 'a-stair-step-4'),
    box(-18, 1.6, -33.4, 3.6, 0.4, 2.2, 0x7d8792, 'a-stair-step-5'),
    box(-18, 1.95, -35, 3.6, 0.4, 2.2, 0x7d8792, 'a-stair-step-6'),
    box(18, 0.2, -27, 3.6, 0.4, 2.2, 0x7d8792, 'b-stair-step-1'),
    box(18, 0.55, -28.6, 3.6, 0.4, 2.2, 0x7d8792, 'b-stair-step-2'),
    box(18, 0.9, -30.2, 3.6, 0.4, 2.2, 0x7d8792, 'b-stair-step-3'),
    box(18, 1.25, -31.8, 3.6, 0.4, 2.2, 0x7d8792, 'b-stair-step-4'),
    box(18, 1.6, -33.4, 3.6, 0.4, 2.2, 0x7d8792, 'b-stair-step-5'),
    box(18, 1.95, -35, 3.6, 0.4, 2.2, 0x7d8792, 'b-stair-step-6'),
    box(-4, 0.62, -16, 4, 1.24, 4, 0xa06b2c, 'mid-jump-box-low'),
    box(0, 1.05, -18.7, 4, 2.1, 4, 0x8a5d25, 'mid-jump-box-high'),
    box(4, 1.35, -22, 4, 2.7, 4, 0x6f4d24, 'upper-route-jump-box')
  ],
  props: [
    box(0, 2.9, 23.9, 9, 5.8, 0.45, 0x7d8792, 'main-sliding-door', 0.35, 0.38),
    box(0, 5.9, 23.9, 31, 0.55, 0.55, 0xd6a84f, 'main-gate-header'),
    box(-24, 4.6, -2.6, 13, 0.45, 0.45, 0xd6a84f, 'a-room-header'),
    box(24, 4.6, -2.6, 13, 0.45, 0.45, 0xd6a84f, 'b-room-header'),
    box(0, 5.8, 28, 70, 0.45, 18, 0x303943, 't-spawn-roof'),
    box(-24, 5.7, -6, 18, 0.42, 48, 0x303943, 'a-warehouse-roof'),
    box(24, 5.7, -6, 18, 0.42, 48, 0x303943, 'b-warehouse-roof'),
    box(0, 6.3, -23, 13, 0.34, 42, 0x8fa3b4, 'mid-skylight-frame', 0.25, 0.32),
    box(-13, 3.3, 18.6, 1.3, 6.6, 0.7, 0xd6a84f, 'left-entry-door-frame'),
    box(13, 3.3, 18.6, 1.3, 6.6, 0.7, 0xd6a84f, 'right-entry-door-frame'),
    box(0, 4.9, 18.6, 28, 0.8, 0.7, 0xd6a84f, 'spawn-entry-header'),
    box(-35.5, 3.4, -11, 0.5, 1.2, 55, 0x8fc7ff, 'west-glass-window-band', 0.05, 0.08, 0.32),
    box(35.5, 3.4, -11, 0.5, 1.2, 55, 0x8fc7ff, 'east-glass-window-band', 0.05, 0.08, 0.32),
    box(-23.5, 2.2, -31.6, 12, 4.4, 0.5, 0x7d8792, 'a-rollup-door'),
    box(23.5, 2.2, -31.6, 12, 4.4, 0.5, 0x7d8792, 'b-rollup-door'),
    box(-29.5, 3.6, -31.2, 0.35, 4.2, 0.6, 0x2f343b, 'a-door-rail-left'),
    box(-17.5, 3.6, -31.2, 0.35, 4.2, 0.6, 0x2f343b, 'a-door-rail-right'),
    box(17.5, 3.6, -31.2, 0.35, 4.2, 0.6, 0x2f343b, 'b-door-rail-left'),
    box(29.5, 3.6, -31.2, 0.35, 4.2, 0.6, 0x2f343b, 'b-door-rail-right'),
    box(-34, 4.2, -38, 1.4, 8.4, 1.4, 0x2f343b, 'a-industrial-column'),
    box(34, 4.2, -38, 1.4, 8.4, 1.4, 0x2f343b, 'b-industrial-column'),
    box(-34, 4.2, 26, 1.4, 8.4, 1.4, 0x2f343b, 't-left-column'),
    box(34, 4.2, 26, 1.4, 8.4, 1.4, 0x2f343b, 't-right-column'),
    box(0, 6.2, -38, 66, 0.45, 0.45, 0x6b7280, 'north-truss'),
    box(0, 6.2, 26, 66, 0.45, 0.45, 0x6b7280, 'south-truss'),
    box(-34, 6.2, -6, 0.45, 0.45, 70, 0x6b7280, 'west-truss'),
    box(34, 6.2, -6, 0.45, 0.45, 70, 0x6b7280, 'east-truss'),
    box(-18, 2.9, -40, 10, 0.28, 12, 0x4f5964, 'a-catwalk', 0.35, 0.45),
    box(18, 2.9, -40, 10, 0.28, 12, 0x4f5964, 'b-catwalk', 0.35, 0.45),
    box(0, 3.05, -35, 9, 0.28, 18, 0x53606c, 'mid-bridge'),
    box(-5, 3.9, -32, 0.35, 1.7, 5.4, 0x8fc7ff, 'upper-glass-window-frame-left', 0.05, 0.08, 0.32),
    box(5, 3.9, -32, 0.35, 1.7, 5.4, 0x8fc7ff, 'upper-glass-window-frame-right', 0.05, 0.08, 0.32),
    box(-18, 1.25, -36, 6, 2.5, 0.4, 0xd6a84f, 'a-site-sign', 0.1, 0.4),
    box(18, 1.25, -36, 6, 2.5, 0.4, 0xd6a84f, 'b-site-sign', 0.1, 0.4),
    box(-27, 0.55, 9, 6, 1.1, 6, 0x9b6a2d, 'left-storage-crate'),
    box(27, 0.55, 9, 6, 1.1, 6, 0x9b6a2d, 'right-storage-crate'),
    box(-6, 3.9, 6, 0.35, 0.35, 28, 0x2f343b, 'left-overhead-pipe', 0.45, 0.35),
    box(6, 3.9, 6, 0.35, 0.35, 28, 0x2f343b, 'right-overhead-pipe', 0.45, 0.35)
  ]
};

const cloneBox = (spec: BoxSpec): BoxSpec => ({
  ...spec,
  position: spec.position.clone(),
  size: spec.size.clone()
});

const cloneZone = (zone: MaterialZone): MaterialZone => ({
  ...zone,
  position: zone.position.clone(),
  size: zone.size.clone()
});

const cloneArena = (arena: ArenaData, name: string, playerSpawn: THREE.Vector3): ArenaData => ({
  ...arena,
  name,
  playerSpawn: playerSpawn.clone(),
  enemySpawns: arena.enemySpawns.map(spawn => ({ ...spawn, position: spawn.position.clone() })),
  colliders: arena.colliders.map(cloneBox),
  props: arena.props.map(cloneBox),
  materialZones: arena.materialZones?.map(cloneZone)
});

interface ArenaVariantOptions {
  name: string;
  playerSpawn: THREE.Vector3;
  colliderTint: number;
  propTint: number;
  removeColliders?: RegExp[];
  removeProps?: RegExp[];
  extraColliders?: BoxSpec[];
  extraProps?: BoxSpec[];
  materialZones: MaterialZone[];
  enemySpawns?: EnemySpawnPoint[];
}

const shouldRemove = (name: string | undefined, patterns: RegExp[] = []) => patterns.some(pattern => pattern.test(name ?? ''));

const tintBox = (spec: BoxSpec, tint: number): BoxSpec => ({
  ...spec,
  color: spec.name?.includes('glass') ? spec.color : new THREE.Color(spec.color).lerp(new THREE.Color(tint), 0.34).getHex()
});

const variantArena = (base: ArenaData, options: ArenaVariantOptions): ArenaData => ({
  ...cloneArena(base, options.name, options.playerSpawn),
  enemySpawns: options.enemySpawns?.map(spawn => ({ ...spawn, position: spawn.position.clone() }))
    ?? base.enemySpawns.map(spawn => ({ ...spawn, position: spawn.position.clone() })),
  colliders: [
    ...base.colliders
      .filter(collider => !shouldRemove(collider.name, options.removeColliders))
      .map(cloneBox)
      .map(collider => tintBox(collider, options.colliderTint)),
    ...(options.extraColliders ?? []).map(cloneBox)
  ],
  props: [
    ...base.props
      .filter(prop => !shouldRemove(prop.name, options.removeProps))
      .map(cloneBox)
      .map(prop => tintBox(prop, options.propTint)),
    ...(options.extraProps ?? []).map(cloneBox)
  ],
  materialZones: options.materialZones.map(cloneZone)
});

const materialZone = (
  name: string,
  material: SurfaceMaterial,
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number
): MaterialZone => ({
  name,
  material,
  position: new THREE.Vector3(x, y, z),
  size: new THREE.Vector3(sx, sy, sz)
});

type AnyCollider = { position: { x: number; y: number; z: number }; size: { x: number; y: number; z: number }; rotation?: { x: number; y: number; z: number }; name?: string };

function buildMapArena(
  name: string,
  colliders: AnyCollider[],
  color: number,
  playerSpawn: THREE.Vector3,
  boundsWidth: number,
  boundsDepth: number,
  centerZ: number,
  props: BoxSpec[] = [],
  materialZonesList: MaterialZone[] = [],
  enemySpawnsList: EnemySpawnPoint[] = []
): ArenaData {
  const colliderBoxes: BoxSpec[] = colliders.map(c => ({
    position: new THREE.Vector3(c.position.x, c.position.y, c.position.z),
    size: new THREE.Vector3(c.size.x, c.size.y, c.size.z),
    rotation: c.rotation ? { ...c.rotation } : undefined,
    color,
    metalness: 0.22,
    roughness: 0.58,
    name: c.name
  }));
  return {
    name,
    playerSpawn,
    bounds: { width: boundsWidth, depth: boundsDepth, centerZ },
    enemySpawns: enemySpawnsList,
    colliders: colliderBoxes,
    props,
    materialZones: materialZonesList
  };
}

function buildMirageArena(): ArenaData {
  return buildMapArena(
    'Mirage',
    MIRAGE_COLLIDERS,
    0xc4a96b,
    new THREE.Vector3(0, PLAYER_EYE_HEIGHT, 40.96),
    76.8, 92.16,
    (MIRAGE_SPAWNS.attackers[0].z + MIRAGE_SPAWNS.defenders[0].z) / 2,
    [
      box(MIRAGE_BOMB_SITES.A.position.x, MIRAGE_BOMB_SITES.A.position.y, MIRAGE_BOMB_SITES.A.position.z, 3.84, 0.04, 3.84, 0xd4a017, 'mirage-a-bomb-marker', 0.1, 0.6),
      box(MIRAGE_BOMB_SITES.B.position.x, MIRAGE_BOMB_SITES.B.position.y, MIRAGE_BOMB_SITES.B.position.z, 3.84, 0.04, 3.84, 0xd4a017, 'mirage-b-bomb-marker', 0.1, 0.6),
      box(0, 0.01, 0, 76.8, 0.02, 92.16, 0xd4b87a, 'mirage-sand-floor', 0.05, 0.75),
      box(0, 1.92, -15.36, 19.2, 1.92, 0.16, 0x9edcff, 'mirage-ct-window-glass', 0.03, 0.06, 0.3)
    ],
    [
      materialZone('mirage-sand', 'sand', 0, 0, 0, 76.8, 0.1, 92.16),
      materialZone('mirage-stone-mid', 'stone', 0, 0, 0, 10.24, 0.1, 30.72),
      materialZone('mirage-metal-catwalk', 'metal', -20.48, 2, 0, 10.24, 0.1, 30.72)
    ],
    [
      { position: new THREE.Vector3(MIRAGE_BOMB_SITES.A.position.x, PLAYER_EYE_HEIGHT, MIRAGE_BOMB_SITES.A.position.z), type: 'shooter' },
      { position: new THREE.Vector3(MIRAGE_BOMB_SITES.B.position.x, PLAYER_EYE_HEIGHT, MIRAGE_BOMB_SITES.B.position.z), type: 'shooter' },
      { position: new THREE.Vector3(0, PLAYER_EYE_HEIGHT, 0), type: 'patrol' }
    ]
  );
}

function buildInfernoArena(): ArenaData {
  return buildMapArena(
    'Inferno',
    INFERNO_COLLIDERS,
    0xb08c58,
    new THREE.Vector3(-3.2, PLAYER_EYE_HEIGHT, 30.4),
    71.68, 81.92,
    (INFERNO_SPAWNS.attackers[0].z + INFERNO_SPAWNS.defenders[0].z) / 2,
    [
      box(INFERNO_BOMB_SITES.A.position.x, INFERNO_BOMB_SITES.A.position.y, INFERNO_BOMB_SITES.A.position.z, 3.84, 0.04, 3.84, 0xd4a017, 'inferno-a-bomb-marker', 0.1, 0.6),
      box(INFERNO_BOMB_SITES.B.position.x, INFERNO_BOMB_SITES.B.position.y, INFERNO_BOMB_SITES.B.position.z, 3.84, 0.04, 3.84, 0xd4a017, 'inferno-b-bomb-marker', 0.1, 0.6),
      box(0, 0.01, 0, 71.68, 0.02, 81.92, 0xc8a260, 'inferno-cobblestone-floor', 0.05, 0.8),
      box(-15.36, 2.56, -5.12, 12.8, 2.56, 0.16, 0xa6dfff, 'inferno-apartment-window-glass', 0.03, 0.06, 0.3)
    ],
    [
      materialZone('inferno-cobblestone', 'cobblestone', 0, 0, 0, 71.68, 0.1, 81.92),
      materialZone('inferno-tile-apartments', 'tile', -15.36, 2, -5.12, 20.48, 0.1, 15.36),
      materialZone('inferno-metal-catwalk', 'metal', -15.36, 2.56, -5.12, 20.48, 0.1, 5.12)
    ],
    [
      { position: new THREE.Vector3(INFERNO_BOMB_SITES.A.position.x, PLAYER_EYE_HEIGHT, INFERNO_BOMB_SITES.A.position.z), type: 'shooter' },
      { position: new THREE.Vector3(INFERNO_BOMB_SITES.B.position.x, PLAYER_EYE_HEIGHT, INFERNO_BOMB_SITES.B.position.z), type: 'shooter' },
      { position: new THREE.Vector3(-28.16, PLAYER_EYE_HEIGHT, 0), type: 'patrol' }
    ]
  );
}

function buildTrainArena(): ArenaData {
  return buildMapArena(
    'Train',
    TRAIN_COLLIDERS,
    0x6a6872,
    new THREE.Vector3(0, PLAYER_EYE_HEIGHT, 38.4),
    71.68, 97.28,
    (TRAIN_SPAWNS.attackers[0].z + TRAIN_SPAWNS.defenders[0].z) / 2,
    [
      box(TRAIN_BOMB_SITES.A.position.x, TRAIN_BOMB_SITES.A.position.y, TRAIN_BOMB_SITES.A.position.z, 3.84, 0.04, 3.84, 0xd4a017, 'train-a-bomb-marker', 0.1, 0.6),
      box(TRAIN_BOMB_SITES.B.position.x, TRAIN_BOMB_SITES.B.position.y, TRAIN_BOMB_SITES.B.position.z, 3.84, 0.04, 3.84, 0xd4a017, 'train-b-bomb-marker', 0.1, 0.6),
      box(0, 0.01, 0, 71.68, 0.02, 97.28, 0x8a8898, 'train-concrete-floor', 0.1, 0.65),
      box(0, 2.56, 8.96, 18.0, 2.56, 0.16, 0xa6dfff, 'train-platform-window-glass', 0.03, 0.06, 0.3)
    ],
    [
      materialZone('train-concrete', 'concrete', 0, 0, 0, 71.68, 0.1, 97.28),
      materialZone('train-metal-cars', 'metal', 0, 1.92, 0, 5.12, 0.1, 1.28),
      materialZone('train-stone-spawn', 'stone', 5.12, 0, 38.4, 10.24, 0.1, 10.24)
    ],
    [
      { position: new THREE.Vector3(TRAIN_BOMB_SITES.A.position.x, PLAYER_EYE_HEIGHT, TRAIN_BOMB_SITES.A.position.z), type: 'shooter' },
      { position: new THREE.Vector3(TRAIN_BOMB_SITES.B.position.x, PLAYER_EYE_HEIGHT, TRAIN_BOMB_SITES.B.position.z), type: 'shooter' },
      { position: new THREE.Vector3(-17.92, 1.92, 0), type: 'patrol' }
    ]
  );
}

function buildOverpassArena(): ArenaData {
  return buildMapArena(
    'Overpass',
    OVERPASS_COLLIDERS,
    0x6d8060,
    new THREE.Vector3(-2.56, PLAYER_EYE_HEIGHT, 38.0),
    76.8, 97.28,
    (OVERPASS_SPAWNS.attackers[0].z + OVERPASS_SPAWNS.defenders[0].z) / 2,
    [
      box(OVERPASS_BOMB_SITES.A.position.x, OVERPASS_BOMB_SITES.A.position.y, OVERPASS_BOMB_SITES.A.position.z, 3.84, 0.04, 3.84, 0xd4a017, 'overpass-a-bomb-marker', 0.1, 0.6),
      box(OVERPASS_BOMB_SITES.B.position.x, OVERPASS_BOMB_SITES.B.position.y, OVERPASS_BOMB_SITES.B.position.z, 3.84, 0.04, 3.84, 0xd4a017, 'overpass-b-bomb-marker', 0.1, 0.6),
      box(0, 0.01, 0, 76.8, 0.02, 97.28, 0x8a9870, 'overpass-ground-floor', 0.05, 0.75),
      box(0, 2.24, -8.0, 16.0, 2.24, 0.16, 0xa6dfff, 'overpass-bridge-window-glass', 0.03, 0.06, 0.3)
    ],
    [
      materialZone('overpass-stone', 'stone', 0, 0, 0, 76.8, 0.1, 97.28),
      materialZone('overpass-metal-bridge', 'metal', 0, 1.28, -10.24, 35.84, 0.1, 15.36),
      materialZone('overpass-grass', 'rubber', -2.56, 0, -5.12, 15.36, 0.1, 30.72)
    ],
    [
      { position: new THREE.Vector3(OVERPASS_BOMB_SITES.A.position.x, PLAYER_EYE_HEIGHT, OVERPASS_BOMB_SITES.A.position.z), type: 'shooter' },
      { position: new THREE.Vector3(OVERPASS_BOMB_SITES.B.position.x, PLAYER_EYE_HEIGHT, OVERPASS_BOMB_SITES.B.position.z), type: 'shooter' },
      { position: new THREE.Vector3(0, PLAYER_EYE_HEIGHT, 0), type: 'patrol' }
    ]
  );
}

function buildNukeArena(): ArenaData {
  return buildMapArena(
    'Nuke',
    NUKE_COLLIDERS,
    0x607080,
    new THREE.Vector3(22.0, PLAYER_EYE_HEIGHT, 40.0),
    71.68, 87.04,
    (NUKE_SPAWNS.attackers[0].z + NUKE_SPAWNS.defenders[0].z) / 2,
    [
      box(NUKE_BOMB_SITES.A.position.x, NUKE_BOMB_SITES.A.position.y, NUKE_BOMB_SITES.A.position.z, 3.84, 0.04, 3.84, 0xd4a017, 'nuke-a-bomb-marker', 0.1, 0.6),
      box(NUKE_BOMB_SITES.B.position.x, NUKE_BOMB_SITES.B.position.y, NUKE_BOMB_SITES.B.position.z, 3.84, 0.04, 3.84, 0xd4a017, 'nuke-b-bomb-marker', 0.1, 0.6),
      box(0, 0.01, 0, 71.68, 0.02, 87.04, 0x8090a0, 'nuke-concrete-floor', 0.1, 0.65),
      box(0, 2.56, 12.8, 20.48, 2.56, 0.16, 0xa6dfff, 'nuke-control-window-glass', 0.03, 0.06, 0.3)
    ],
    [
      materialZone('nuke-concrete', 'concrete', 0, 0, 0, 71.68, 0.1, 87.04),
      materialZone('nuke-metal-upper', 'metal', 0, 2.56, 10.24, 15.36, 0.1, 20.48),
      materialZone('nuke-rubber-reactor', 'rubber', 0, 0, 0, 15.36, 0.1, 12.8)
    ],
    [
      { position: new THREE.Vector3(NUKE_BOMB_SITES.A.position.x, PLAYER_EYE_HEIGHT, NUKE_BOMB_SITES.A.position.z), type: 'shooter' },
      { position: new THREE.Vector3(NUKE_BOMB_SITES.B.position.x, NUKE_BOMB_SITES.B.position.y + PLAYER_EYE_HEIGHT, NUKE_BOMB_SITES.B.position.z), type: 'shooter' },
      { position: new THREE.Vector3(0, 3.2, 10.24), type: 'patrol' }
    ]
  );
}

function buildItalyArena(): ArenaData {
  return buildMapArena(
    'Italy',
    ITALY_COLLIDERS,
    0x9a8f78,
    new THREE.Vector3(12.0, PLAYER_EYE_HEIGHT, 41.0),
    66.56, 92.16,
    (ITALY_SPAWNS.attackers[0].z + ITALY_SPAWNS.defenders[0].z) / 2,
    [
      box(ITALY_BOMB_SITES.A.position.x, ITALY_BOMB_SITES.A.position.y, ITALY_BOMB_SITES.A.position.z, 3.84, 0.04, 3.84, 0xd4a017, 'italy-a-bomb-marker', 0.1, 0.6),
      box(ITALY_BOMB_SITES.B.position.x, ITALY_BOMB_SITES.B.position.y, ITALY_BOMB_SITES.B.position.z, 3.84, 0.04, 3.84, 0xd4a017, 'italy-b-bomb-marker', 0.1, 0.6),
      box(0, 0.01, 0, 66.56, 0.02, 92.16, 0x9c8a6f, 'italy-cobblestone-floor', 0.05, 0.8),
      box(0, 2.56, 0, 20.48, 2.56, 0.16, 0xa6dfff, 'italy-apartment-window-glass', 0.03, 0.06, 0.3)
    ],
    [
      materialZone('italy-cobblestone', 'cobblestone', 0, 0, 0, 66.56, 0.1, 92.16),
      materialZone('italy-tile-apartments', 'tile', -15.36, 2, 0, 20.48, 0.1, 40.96),
      materialZone('italy-metal-balcony', 'metal', -15.36, 2.56, -5.12, 20.48, 0.1, 5.12),
      materialZone('italy-market-wood', 'wood', 0, 0, 41.0, 20.48, 0.1, 10.24)
    ],
    [
      { position: new THREE.Vector3(ITALY_BOMB_SITES.A.position.x, PLAYER_EYE_HEIGHT, ITALY_BOMB_SITES.A.position.z), type: 'shooter' },
      { position: new THREE.Vector3(ITALY_BOMB_SITES.B.position.x, PLAYER_EYE_HEIGHT, ITALY_BOMB_SITES.B.position.z), type: 'shooter' },
      { position: new THREE.Vector3(0, PLAYER_EYE_HEIGHT, 0), type: 'patrol' }
    ]
  );
}

function buildWarehouseArena(): ArenaData {
  return buildMapArena(
    'Warehouse',
    WAREHOUSE_COLLIDERS,
    0x596673,
    new THREE.Vector3(1.5, PLAYER_EYE_HEIGHT, 22.0),
    61.44, 81.92,
    (WAREHOUSE_SPAWNS.attackers[0].z + WAREHOUSE_SPAWNS.defenders[0].z) / 2,
    [
      box(WAREHOUSE_BOMB_SITES.A.position.x, WAREHOUSE_BOMB_SITES.A.position.y, WAREHOUSE_BOMB_SITES.A.position.z, 3.84, 0.04, 3.84, 0xd4a017, 'warehouse-a-bomb-marker', 0.1, 0.6),
      box(WAREHOUSE_BOMB_SITES.B.position.x, WAREHOUSE_BOMB_SITES.B.position.y, WAREHOUSE_BOMB_SITES.B.position.z, 3.84, 0.04, 3.84, 0xd4a017, 'warehouse-b-bomb-marker', 0.1, 0.6),
      box(0, 0.01, 0, 61.44, 0.02, 81.92, 0x778899, 'warehouse-concrete-floor', 0.1, 0.65),
      box(0, 2.56, 0, 30.72, 2.56, 0.16, 0x8fc7ff, 'warehouse-office-window-glass', 0.04, 0.08, 0.28)
    ],
    [
      materialZone('warehouse-concrete', 'concrete', 0, 0, 0, 61.44, 0.1, 81.92),
      materialZone('warehouse-metal-catwalk', 'metal', 0, 2.56, 0, 30.72, 0.1, 10.24),
      materialZone('warehouse-pallet-wood', 'wood', -10.24, 0, 38.4, 10.24, 0.1, 10.24)
    ],
    [
      { position: new THREE.Vector3(WAREHOUSE_BOMB_SITES.A.position.x, PLAYER_EYE_HEIGHT, WAREHOUSE_BOMB_SITES.A.position.z), type: 'shooter' },
      { position: new THREE.Vector3(WAREHOUSE_BOMB_SITES.B.position.x, PLAYER_EYE_HEIGHT, WAREHOUSE_BOMB_SITES.B.position.z), type: 'shooter' },
      { position: new THREE.Vector3(0, PLAYER_EYE_HEIGHT, 0), type: 'patrol' }
    ]
  );
}

function buildDust2Arena(): ArenaData {
  const colliderBoxes: BoxSpec[] = DUST2_COLLIDERS.map(c => {
    const n = c.name ?? '';
    let color = 0xb8a070;
    let textureKey: BoxSpec['textureKey'] = 'sand';
    let metalness = 0.08;
    let roughness = 0.82;

    if (n.includes('tunnel') || n.includes('dark') || n.includes('upper')) {
      color = 0x9a8878; textureKey = 'concrete'; metalness = 0.05; roughness = 0.90;
    } else if (n.includes('catwalk') || n.includes('stair') || n.includes('ramp')) {
      color = 0x9a9080; textureKey = 'concrete'; metalness = 0.05; roughness = 0.88;
    } else if (n.includes('door') || n.includes('post')) {
      color = 0x7a6040; textureKey = 'metal'; metalness = 0.35; roughness = 0.55;
    } else if (n.includes('box') || n.includes('car') || n.includes('bucket') || n.includes('plat')) {
      color = 0xc4a46b; textureKey = 'sand'; metalness = 0.06; roughness = 0.85;
    } else if (n.includes('a-site') || n.includes('b-site')) {
      color = 0xc8b890; textureKey = 'plaster'; metalness = 0.04; roughness = 0.88;
    } else if (n.includes('boundary')) {
      color = 0xa09070; textureKey = 'sand';
    }

    return {
      position: new THREE.Vector3(c.position.x, c.position.y, c.position.z),
      size: new THREE.Vector3(c.size.x, c.size.y, c.size.z),
      rotation: c.rotation ? { ...c.rotation } : undefined,
      color, textureKey, metalness, roughness,
      name: c.name
    };
  });

  const props: BoxSpec[] = [
    // CT Window 玻璃
    box(0, 1.28, 12.8, 1.28, 0.48, 0.25, 0x9edcff, 'dust2-ct-window-glass', 0.03, 0.06, 0.3),
    // B Window 玻璃
    box(19.2, 1.28, 12.16, 0.96, 0.32, 0.25, 0x9edcff, 'dust2-b-window-glass', 0.03, 0.06, 0.3),
    // A Site 包点地面标记
    box(-25.6, 0.16, 12.8, 3.84, 0.04, 3.84, 0xd4a017, 'dust2-a-bomb-marker', 0.1, 0.6),
    // B Site 包点地面标记
    box(25.6, 0.16, 12.8, 3.84, 0.04, 3.84, 0xd4a017, 'dust2-b-bomb-marker', 0.1, 0.6),
    // 沙地地面（贴图）
    { ...box(0, 0.01, -10.24, 81.92, 0.02, 102.4, 0xffffff, 'dust2-sand-floor', 0.04, 0.88), textureKey: 'sand' as const },

    // ── 木门视觉模型 ──
    // A Long Doors
    { ...box(-26.88, 1.28, -20.48, 0.92, 2.56, 0.10, 0xffffff, 'dust2-a-doors-left', 0.08, 0.88), textureKey: 'wood' as const },
    { ...box(-26.88, 1.28, -19.52, 0.92, 2.56, 0.10, 0xffffff, 'dust2-a-doors-right', 0.08, 0.88), textureKey: 'wood' as const },
    // Mid Doors
    { ...box(-0.48, 1.28, -20.48, 0.92, 2.56, 0.10, 0xffffff, 'dust2-mid-doors-left', 0.08, 0.88), textureKey: 'wood' as const },
    { ...box(0.48, 1.28, -20.48, 0.92, 2.56, 0.10, 0xffffff, 'dust2-mid-doors-right', 0.08, 0.88), textureKey: 'wood' as const },
    // B Doors
    { ...box(18.40, 0.96, 15.36, 0.62, 1.92, 0.10, 0xffffff, 'dust2-b-doors-left', 0.08, 0.88), textureKey: 'wood' as const },
    { ...box(19.12, 0.96, 15.36, 0.62, 1.92, 0.10, 0xffffff, 'dust2-b-doors-right', 0.08, 0.88), textureKey: 'wood' as const },
  ];

  return {
    name: 'Dust2',
    playerSpawn: new THREE.Vector3(0, PLAYER_EYE_HEIGHT, 33.28),
    bounds: {
      width: DUST2_GAME_BOUNDS.width,
      depth: DUST2_GAME_BOUNDS.depth,
      centerZ: DUST2_GAME_BOUNDS.centerZ
    },
    enemySpawns: [
      { position: new THREE.Vector3(-25.6, PLAYER_EYE_HEIGHT, 12.8), type: 'shooter' },
      { position: new THREE.Vector3(25.6, PLAYER_EYE_HEIGHT, 12.8), type: 'shooter' },
      { position: new THREE.Vector3(-33.28, PLAYER_EYE_HEIGHT, -4), type: 'patrol' },
      { position: new THREE.Vector3(33.28, PLAYER_EYE_HEIGHT, -14.08), type: 'assault' },
      { position: new THREE.Vector3(0, PLAYER_EYE_HEIGHT, 0), type: 'shooter' },
      { position: new THREE.Vector3(0, PLAYER_EYE_HEIGHT, 20.48), type: 'patrol' },
      { position: new THREE.Vector3(-15.36, PLAYER_EYE_HEIGHT, -12.8), type: 'assault' },
      { position: new THREE.Vector3(15.36, PLAYER_EYE_HEIGHT, -12.8), type: 'assault' },
    ],
    colliders: colliderBoxes,
    props,
    materialZones: [
      materialZone('dust2-sand', 'sand', 0, 0, -10.24, 81.92, 0.1, 102.4),
      materialZone('dust2-concrete-a', 'concrete', -25.6, 0.01, -12.8, 10.24, 0.1, 12.8),
      materialZone('dust2-concrete-b', 'concrete', 25.6, 0.01, -12.8, 10.24, 0.1, 12.8),
      materialZone('dust2-metal-cat', 'metal', -15.36, 1.28, -12.8, 10.24, 0.1, 12.8),
      materialZone('dust2-concrete-ct', 'concrete', 0, 0.01, -35.84, 10.24, 0.1, 7.68),
    ]
  };
}

export const ARENA_MAPS: Record<MapId, ArenaData> = {
  dust2: buildDust2Arena(),
  warehouse: buildWarehouseArena(),
  italy: buildItalyArena(),
  mirage: buildMirageArena(),
  inferno: buildInfernoArena(),
  nuke: buildNukeArena(),
  train: buildTrainArena(),
  overpass: buildOverpassArena()
};
