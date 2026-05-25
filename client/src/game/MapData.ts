import * as THREE from 'three';
import { EnemyType } from './Enemy.js';
import type { MapId } from './types.js';

export interface BoxSpec {
  position: THREE.Vector3;
  size: THREE.Vector3;
  color: number;
  metalness?: number;
  roughness?: number;
  opacity?: number;
  name?: string;
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

export const ARENA_MAPS: Record<MapId, ArenaData> = {
  dust2: variantArena(INDUSTRIAL_ARENA, {
    name: 'Dust2',
    playerSpawn: new THREE.Vector3(0, 1.7, 28),
    colliderTint: 0xb99b64,
    propTint: 0xd2b47a,
    removeProps: [/warehouse-roof/, /overhead-pipe/, /industrial-column/],
    extraColliders: [
      box(-33, 1.55, 6, 8, 3.1, 1.1, 0x9f8252, 'dust2-a-long-double-door'),
      box(-27.5, 1.4, 11, 1.1, 2.8, 10, 0x9a7b4f, 'dust2-a-long-corner-wall'),
      box(14, 1.2, 11, 8, 2.4, 1.1, 0x8c7046, 'dust2-b-tunnel-cover'),
      box(4, 2.65, -33, 9, 0.45, 11, 0x8f7650, 'dust2-short-upper-platform'),
      box(9, 2.1, -28, 1, 3.2, 10, 0x927650, 'dust2-short-upper-rail-wall')
    ],
    extraProps: [
      box(-31, 2.35, 6.6, 5.4, 3.1, 0.35, 0x9edcff, 'dust2-a-long-window-glass', 0.03, 0.06, 0.3),
      box(13.8, 2.2, 11.6, 6.5, 2.6, 0.35, 0x9edcff, 'dust2-b-tunnel-window-glass', 0.03, 0.06, 0.3),
      box(-24, 0.5, -24, 6, 1, 3, 0x7d5e35, 'dust2-a-site-sandbag'),
      box(24, 0.5, -24, 6, 1, 3, 0x7d5e35, 'dust2-b-site-sandbag'),
      box(0, 0.04, -8, 9, 0.04, 31, 0xc9a96d, 'dust2-mid-sand-runner', 0.08, 0.72)
    ],
    materialZones: [
      materialZone('dust2-sandy-spawn', 'sand', 0, 0, 22, 28, 0.1, 26),
      materialZone('dust2-mid-stone', 'stone', 0, 0, -8, 20, 0.1, 38),
      materialZone('dust2-cat-metal', 'metal', 4, 2.9, -33, 9, 0.1, 11),
      materialZone('dust2-long-wood-doors', 'wood', -33, 0, 6, 9, 0.1, 4)
    ],
    enemySpawns: [
      { position: new THREE.Vector3(-27, 1.7, -29), type: 'shooter' },
      { position: new THREE.Vector3(27, 1.7, -29), type: 'shooter' },
      { position: new THREE.Vector3(-33, 1.7, 2), type: 'patrol' },
      { position: new THREE.Vector3(17, 1.7, 8), type: 'assault' },
      { position: new THREE.Vector3(0, 1.7, -42), type: 'shooter' }
    ]
  }),
  warehouse: variantArena(INDUSTRIAL_ARENA, {
    name: 'Warehouse',
    playerSpawn: new THREE.Vector3(-20, 1.7, 28),
    colliderTint: 0x596673,
    propTint: 0x7f8b95,
    extraColliders: [
      box(-32, 1.6, 0, 1.2, 3.2, 15, 0x3f4b55, 'warehouse-left-storage-rack'),
      box(32, 1.6, -20, 1.2, 3.2, 15, 0x3f4b55, 'warehouse-right-storage-rack'),
      box(0, 2.9, -2, 34, 0.35, 5, 0x46535f, 'warehouse-central-catwalk-deck'),
      box(0, 3.75, -2, 34, 1.7, 0.35, 0x303943, 'warehouse-central-catwalk-rail'),
      box(-7, 1.2, -25, 6, 2.4, 4, 0x6b4c2c, 'warehouse-a-forklift-cover'),
      box(7, 1.2, -25, 6, 2.4, 4, 0x6b4c2c, 'warehouse-b-forklift-cover')
    ],
    extraProps: [
      box(0, 3.6, -2, 14, 1.6, 0.35, 0x8fc7ff, 'warehouse-office-window-glass', 0.04, 0.08, 0.28),
      box(-32, 3.4, 0, 0.4, 0.45, 15, 0xd6a84f, 'warehouse-left-rack-safety-rail'),
      box(32, 3.4, -20, 0.4, 0.45, 15, 0xd6a84f, 'warehouse-right-rack-safety-rail'),
      box(0, 6.6, -2, 42, 0.3, 0.3, 0xd6a84f, 'warehouse-overhead-crane-beam'),
      box(-9, 0.55, 13, 5, 1.1, 5, 0x9b6a2d, 'warehouse-spawn-pallet-stack')
    ],
    materialZones: [
      materialZone('warehouse-polished-concrete', 'concrete', 0, 0, -8, 78, 0.1, 92),
      materialZone('warehouse-upper-metal-grating', 'metal', 0, 3.1, -2, 34, 0.1, 5),
      materialZone('warehouse-loading-rubber-mats', 'rubber', 22, 0, -42, 20, 0.1, 10),
      materialZone('warehouse-pallet-wood', 'wood', -9, 0, 13, 8, 0.1, 8)
    ],
    enemySpawns: [
      { position: new THREE.Vector3(-28, 1.7, -28), type: 'patrol' },
      { position: new THREE.Vector3(28, 1.7, -28), type: 'patrol' },
      { position: new THREE.Vector3(-32, 1.7, -4), type: 'assault' },
      { position: new THREE.Vector3(32, 1.7, -18), type: 'assault' },
      { position: new THREE.Vector3(0, 1.7, -42), type: 'shooter' }
    ]
  }),
  italy: variantArena(INDUSTRIAL_ARENA, {
    name: 'Italy',
    playerSpawn: new THREE.Vector3(20, 1.7, 28),
    colliderTint: 0x9a8f78,
    propTint: 0xb4aa8c,
    removeProps: [/warehouse-roof/, /rollup-door/, /door-rail/, /truss/, /overhead-pipe/],
    extraColliders: [
      box(0, 2.05, 12, 12, 4.1, 1.1, 0x9b8e71, 'italy-market-arch-wall'),
      box(-12, 2.05, -2, 1.1, 4.1, 18, 0x8f836c, 'italy-apartment-hall-wall'),
      box(12, 2.05, -2, 1.1, 4.1, 18, 0x8f836c, 'italy-courtyard-balcony-wall'),
      box(0, 2.8, -14, 16, 0.45, 6, 0x7f7462, 'italy-apartment-upper-floor'),
      box(0, 3.75, -11, 16, 1.9, 0.35, 0x6c6253, 'italy-apartment-upper-rail'),
      box(-6, 1.05, 18, 6, 2.1, 3, 0x7c5131, 'italy-market-stall-cover')
    ],
    extraProps: [
      box(6, 2.75, -5, 0.35, 2.2, 10, 0xa6dfff, 'italy-apartment-window-glass', 0.03, 0.06, 0.3),
      box(-6, 2.6, 12.6, 4.8, 2.2, 0.35, 0xa6dfff, 'italy-market-window-glass', 0.03, 0.06, 0.32),
      box(0, 0.04, -4, 13, 0.04, 38, 0x9c8a6f, 'italy-mid-cobblestone-runner', 0.05, 0.8),
      box(-24, 1.15, -24, 4, 2.3, 3, 0x6f7158, 'italy-a-site-planter'),
      box(24, 1.15, -24, 4, 2.3, 3, 0x6f7158, 'italy-b-site-planter')
    ],
    materialZones: [
      materialZone('italy-cobblestone-mid', 'cobblestone', 0, 0, -4, 28, 0.1, 48),
      materialZone('italy-apartment-tile-upper', 'tile', 0, 3, -14, 16, 0.1, 6),
      materialZone('italy-balcony-metal-rail', 'metal', 0, 3.8, -11, 16, 0.1, 1),
      materialZone('italy-market-wood-stalls', 'wood', -6, 0, 18, 8, 0.1, 6)
    ],
    enemySpawns: [
      { position: new THREE.Vector3(-24, 1.7, -30), type: 'shooter' },
      { position: new THREE.Vector3(24, 1.7, -30), type: 'shooter' },
      { position: new THREE.Vector3(-10, 1.7, -2), type: 'patrol' },
      { position: new THREE.Vector3(10, 1.7, -2), type: 'patrol' },
      { position: new THREE.Vector3(0, 1.7, -42), type: 'assault' }
    ]
  })
};
