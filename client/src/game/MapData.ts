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
  BLOODSTRIKE_COLLIDERS,
  BLOODSTRIKE_TDM_SPAWNS,
  BLOODSTRIKE_BOMB_SITES
} from './BloodStrikeLayout.js';
import {
  DUST2_GAME_BOUNDS,
  PLAYER_EYE_HEIGHT
} from './constants/MapUnits.js';
import {
  DUST2_SPAWNS
} from './constants/Dust2HammerData.js';
import { type Dust2WorldMeshResource, meshSpecFromDust2WorldMeshResource } from './Dust2MeshResource.js';
import { type InfernoWorldMeshResource, meshSpecFromInfernoWorldMeshResource } from './InfernoMeshResource.js';
import dust2WorldMeshResourceJson from './source/dust2-world-mesh.json';
import { INFERNO_WORLD_MESH_RESOURCE as infernoWorldMeshResource } from './generated/inferno-world-mesh.js';

export const DUST2_WORLD_MESH_RESOURCE = dust2WorldMeshResourceJson as Dust2WorldMeshResource;
export const INFERNO_WORLD_MESH_RESOURCE = infernoWorldMeshResource;

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
  physicsOnly?: boolean;
}

export interface MeshSpec {
  name?: string;
  positions: THREE.Vector3[];
  indices: number[];
  collisionPositions?: THREE.Vector3[];
  collisionIndices?: number[];
  color: number;
  metalness?: number;
  roughness?: number;
  opacity?: number;
}

export interface EnemySpawnPoint {
  position: THREE.Vector3;
  type: EnemyType;
}

export type SurfaceMaterial = 'sand' | 'stone' | 'concrete' | 'metal' | 'wood' | 'rubber' | 'cobblestone' | 'tile' | 'glass' | 'plaster';

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
  bombSites?: {
    A: THREE.Vector3;
    B: THREE.Vector3;
  };
  colliders: BoxSpec[];
  props: BoxSpec[];
  meshes?: MeshSpec[];
  materialZones?: MaterialZone[];
  source?: {
    sourceBacked: boolean;
    engine?: 'goldsrc';
    kind?: 'bsp' | 'map';
    path?: string;
    sha256?: string;
    note?: string;
  };
}

const isFiniteVector = (position: THREE.Vector3): boolean =>
  Number.isFinite(position.x) && Number.isFinite(position.y) && Number.isFinite(position.z);

export const resolveDust2SourceGeometry = (
  sourceMeshes: MeshSpec[],
  placeholderColliders: BoxSpec[],
  placeholderProps: BoxSpec[]
) => {
  if (sourceMeshes.length > 0) {
    console.log('[MapData] Using BSP mesh geometry with manual ground colliders');
    // 保留手动定义的地面碰撞体（因为 Trimesh raycasting 在 cannon-es 中有问题）
    const groundColliders = placeholderColliders
      .filter(c => c.name?.includes('-ground') || c.name?.includes('-floor') || c.name?.includes('-wall') || c.name?.includes('-platform'))
      .map(c => ({ ...c, name: `${c.name}-source-walkable`, physicsOnly: true }));
    return { colliders: groundColliders, props: [], meshes: sourceMeshes };
  }
  return { colliders: placeholderColliders, props: placeholderProps, meshes: [] };
};

export const resolveInfernoSourceGeometry = (
  sourceMeshes: MeshSpec[],
  placeholderColliders: BoxSpec[],
  placeholderProps: BoxSpec[]
) => {
  if (sourceMeshes.length > 0) {
    console.log('[MapData] Using BSP mesh geometry with manual ground colliders');
    // 保留手动定义的地面碰撞体（因为 Trimesh raycasting 在 cannon-es 中有问题）
    const groundColliders = placeholderColliders
      .filter(c => c.name?.includes('-ground') || c.name?.includes('-floor') || c.name?.includes('-wall') || c.name?.includes('-platform'))
      .map(c => ({ ...c, name: `${c.name}-source-walkable`, physicsOnly: true }));
    return { colliders: groundColliders, props: [], meshes: sourceMeshes };
  }
  return { colliders: placeholderColliders, props: placeholderProps, meshes: [] };
};

export const resolveInfernoSourceSpawns = (
  resource: InfernoWorldMeshResource | null,
  fallbackPlayerSpawn: THREE.Vector3,
  fallbackEnemySpawns: EnemySpawnPoint[],
  preferredTeam?: 't' | 'ct' | 'auto'
) => {
  const entitySpawns = resource?.source.manifest.entities?.playerSpawns ?? [];
  const toPlayerPosition = (position: { x: number; y: number; z: number }) =>
    new THREE.Vector3(position.x, position.y + PLAYER_EYE_HEIGHT, position.z);
  const tSpawns = entitySpawns
    .filter(spawn => spawn.team === 't' && spawn.gamePosition)
    .map(spawn => toPlayerPosition(spawn.gamePosition!));
  const ctSpawns = entitySpawns
    .filter(spawn => spawn.team === 'ct' && spawn.gamePosition)
    .map(spawn => ({
      position: toPlayerPosition(spawn.gamePosition!),
      type: 'shooter' as const,
    }));

  // 根据玩家选择的队伍决定出生点
  let playerSpawn: THREE.Vector3;
  let enemySpawns: EnemySpawnPoint[];

  if (preferredTeam === 'ct') {
    // 玩家选择 CT: 在 CT 出生点出生，敌人在 T 出生点
    const ctSpawn = ctSpawns.find(s => isFiniteVector(s.position));
    playerSpawn = ctSpawn?.position.clone() ?? fallbackPlayerSpawn;
    enemySpawns = tSpawns.filter(isFiniteVector).map(pos => ({ position: pos, type: 'shooter' as const }));
  } else if (preferredTeam === 't') {
    // 玩家选择 T: 在 T 出生点出生，敌人在 CT 出生点
    playerSpawn = tSpawns.find(isFiniteVector)?.clone() ?? fallbackPlayerSpawn;
    enemySpawns = ctSpawns.some(spawn => isFiniteVector(spawn.position))
      ? ctSpawns.filter(spawn => isFiniteVector(spawn.position))
      : fallbackEnemySpawns;
  } else {
    // 自动选择: 随机选择一个队伍
    const randomIsT = Math.random() > 0.5;
    if (randomIsT && tSpawns.some(isFiniteVector)) {
      playerSpawn = tSpawns.find(isFiniteVector)!.clone();
      enemySpawns = ctSpawns.filter(spawn => isFiniteVector(spawn.position));
    } else {
      const firstCt = ctSpawns.find(s => isFiniteVector(s.position));
      playerSpawn = firstCt?.position.clone() ?? fallbackPlayerSpawn;
      enemySpawns = tSpawns.filter(isFiniteVector).map(pos => ({ position: pos, type: 'shooter' as const }));
    }
  }

  console.log(`[MapData] Spawn resolved: team=${preferredTeam || 'auto'}, player at x=${playerSpawn.x.toFixed(2)}, y=${playerSpawn.y.toFixed(2)}, z=${playerSpawn.z.toFixed(2)}`);

  return {
    playerSpawn,
    enemySpawns: enemySpawns.length > 0 ? enemySpawns : fallbackEnemySpawns,
  };
};

export const resolveInfernoSourceBombSites = (
  resource: InfernoWorldMeshResource | null,
  fallbackBombSites: { A: THREE.Vector3; B: THREE.Vector3 }
) => {
  const bombTargets = resource?.source.manifest.entities?.bombTargets ?? [];
  const modelMeshes = resource?.source.manifest.geometry?.modelMeshes ?? [];
  const centers = bombTargets
    .map(target => {
      const match = target.model?.match(/^\*(\d+)$/);
      const modelIndex = match ? Number(match[1]) : null;
      const modelMesh = modelIndex === null
        ? undefined
        : modelMeshes.find(mesh => mesh.modelIndex === modelIndex);
      const bounds = modelMesh?.gameBounds;
      const mins = bounds?.mins;
      const maxs = bounds?.maxs;
      if (
        typeof mins?.x !== 'number' || typeof mins.y !== 'number' || typeof mins.z !== 'number'
        || typeof maxs?.x !== 'number' || typeof maxs.y !== 'number' || typeof maxs.z !== 'number'
      ) {
        return null;
      }

      return new THREE.Vector3(
        (mins.x + maxs.x) / 2,
        Math.max(0.04, mins.y + 0.04),
        (mins.z + maxs.z) / 2
      );
    })
    .filter((center): center is THREE.Vector3 => center !== null)
    .sort((left, right) => left.x - right.x);

  if (centers.length < 2) {
    return {
      A: fallbackBombSites.A.clone(),
      B: fallbackBombSites.B.clone(),
    };
  }

  return {
    A: centers[0].clone(),
    B: centers[centers.length - 1].clone(),
  };
};

export const resolveDust2SourceSpawns = (
  resource: Dust2WorldMeshResource | null,
  fallbackPlayerSpawn: THREE.Vector3,
  fallbackEnemySpawns: EnemySpawnPoint[],
  preferredTeam?: 't' | 'ct' | 'auto'
) => {
  const entitySpawns = resource?.source.manifest.entities?.playerSpawns ?? [];
  const worldBounds = getDust2WorldBounds(resource);
  const groundYForSpawn = (position: { x: number; y: number; z: number }) => {
    if (position.z > 2 && position.x >= -12 && position.x <= 2) return 1.76; // T spawn ground
    if (position.z < -18 && position.x >= -2 && position.x <= 8) return -0.88; // CT spawn ground
    return position.y;
  };
  const toPlayerPosition = (position: { x: number; y: number; z: number }) =>
    new THREE.Vector3(position.x, groundYForSpawn(position) + PLAYER_EYE_HEIGHT, position.z);
  const toEnemyPosition = (position: { x: number; y: number; z: number }) =>
    new THREE.Vector3(position.x, groundYForSpawn(position), position.z);
  const withinWorld = (position: THREE.Vector3) =>
    isFiniteVector(position)
    && (!worldBounds
    || (
      position.x >= worldBounds.mins.x - 0.5
      && position.x <= worldBounds.maxs.x + 0.5
      && position.z >= worldBounds.mins.z - 0.5
      && position.z <= worldBounds.maxs.z + 0.5
      && position.y >= worldBounds.mins.y - 0.25
      && position.y <= worldBounds.maxs.y + PLAYER_EYE_HEIGHT + 1.5
    ));
  const tSpawns = entitySpawns
    .filter(spawn => spawn.team === 't' && spawn.gamePosition)
    .map(spawn => toPlayerPosition(spawn.gamePosition!))
    .filter(withinWorld);
  const ctSpawns = entitySpawns
    .filter(spawn => spawn.team === 'ct' && spawn.gamePosition)
    .map(spawn => ({
      position: toEnemyPosition(spawn.gamePosition!),
      type: 'shooter' as const,
    }))
    .filter(spawn => withinWorld(spawn.position));

  // 根据玩家选择的队伍决定出生点
  let playerSpawn: THREE.Vector3;
  let enemySpawns: EnemySpawnPoint[];

  if (preferredTeam === 'ct') {
    // 玩家选择 CT: 在 CT 出生点出生，敌人在 T 出生点
    playerSpawn = ctSpawns.find(s => withinWorld(s.position))?.position?.clone() ?? fallbackPlayerSpawn;
    // 需要把playerSpawn改回眼睛高度
    const playerSpawnGround = playerSpawn.clone();
    playerSpawnGround.y = groundYForSpawn(playerSpawnGround) + PLAYER_EYE_HEIGHT;
    playerSpawn = playerSpawnGround;
    enemySpawns = tSpawns.filter(withinWorld).map(pos => {
      const enemyPos = pos.clone();
      enemyPos.y = groundYForSpawn(enemyPos);
      return { position: enemyPos, type: 'shooter' as const };
    });
  } else if (preferredTeam === 't') {
    // 玩家选择 T: 在 T 出生点出生，敌人在 CT 出生点
    playerSpawn = tSpawns.find(withinWorld)?.clone() ?? fallbackPlayerSpawn;
    enemySpawns = ctSpawns.length > 0 ? ctSpawns : fallbackEnemySpawns;
  } else {
    // 自动选择: 随机选择一个队伍
    const randomIsT = Math.random() > 0.5;
    if (randomIsT && tSpawns.some(withinWorld)) {
      playerSpawn = tSpawns.find(withinWorld)!.clone();
      enemySpawns = ctSpawns;
    } else {
      const firstCt = ctSpawns.find(s => withinWorld(s.position));
      playerSpawn = firstCt?.position?.clone() ?? fallbackPlayerSpawn;
      // 把playerSpawn改回眼睛高度
      playerSpawn.y = groundYForSpawn(playerSpawn) + PLAYER_EYE_HEIGHT;
      enemySpawns = tSpawns.filter(withinWorld).map(pos => {
        const enemyPos = pos.clone();
        enemyPos.y = groundYForSpawn(enemyPos);
        return { position: enemyPos, type: 'shooter' as const };
      });
    }
  }

  console.log(`[MapData] Dust2 spawn resolved: team=${preferredTeam || 'auto'}, player at x=${playerSpawn.x.toFixed(2)}, y=${playerSpawn.y.toFixed(2)}, z=${playerSpawn.z.toFixed(2)}`);

  return {
    playerSpawn,
    enemySpawns: enemySpawns.length > 0 ? enemySpawns : fallbackEnemySpawns,
  };
};

function getDust2WorldBounds(resource: Dust2WorldMeshResource | null): { mins: THREE.Vector3; maxs: THREE.Vector3 } | null {
  const bounds = resource?.source.manifest.geometry?.modelMeshes?.find(mesh => mesh.modelIndex === 0)?.gameBounds;
  const mins = bounds?.mins;
  const maxs = bounds?.maxs;
  if (
    typeof mins?.x !== 'number' || typeof mins.y !== 'number' || typeof mins.z !== 'number'
    || typeof maxs?.x !== 'number' || typeof maxs.y !== 'number' || typeof maxs.z !== 'number'
  ) {
    return null;
  }
  return {
    mins: new THREE.Vector3(mins.x, mins.y, mins.z),
    maxs: new THREE.Vector3(maxs.x, maxs.y, maxs.z),
  };
}

function createDust2SourceSafetyColliders(resource: Dust2WorldMeshResource | null): BoxSpec[] {
  const bounds = getDust2WorldBounds(resource);
  if (!bounds) return [];
  const margin = 0.6;
  const thickness = 0.7;
  const height = Math.max(5.0, bounds.maxs.y - bounds.mins.y + 2.0);
  const y = bounds.mins.y + height / 2 - 0.5;
  const centerX = (bounds.mins.x + bounds.maxs.x) / 2;
  const centerZ = (bounds.mins.z + bounds.maxs.z) / 2;
  const width = bounds.maxs.x - bounds.mins.x + margin * 2;
  const depth = bounds.maxs.z - bounds.mins.z + margin * 2;

  return [
    { ...box(centerX, y, bounds.mins.z - margin, width, height, thickness, 0x000000, 'dust2-source-boundary-north', 0, 1, 0), physicsOnly: true },
    { ...box(centerX, y, bounds.maxs.z + margin, width, height, thickness, 0x000000, 'dust2-source-boundary-south', 0, 1, 0), physicsOnly: true },
    { ...box(bounds.mins.x - margin, y, centerZ, thickness, height, depth, 0x000000, 'dust2-source-boundary-west', 0, 1, 0), physicsOnly: true },
    { ...box(bounds.maxs.x + margin, y, centerZ, thickness, height, depth, 0x000000, 'dust2-source-boundary-east', 0, 1, 0), physicsOnly: true },
  ];
}

function createDust2SourceStabilityFloors(): BoxSpec[] {
  const floor = (
    name: string,
    x: number,
    eyeY: number,
    z: number,
    sx: number,
    sz: number
  ): BoxSpec => ({
    ...box(x, eyeY - PLAYER_EYE_HEIGHT - 0.08, z, sx, 0.16, sz, 0x000000, name, 0, 1, 0),
    physicsOnly: true,
  });

  return [
    floor('dust2-source-stable-t-spawn', -7.8, 1.92, 10.8, 8.0, 14.0),
    floor('dust2-source-stable-ct-spawn', 3.2, -0.24, -23.0, 20.0, 30.0),
    floor('dust2-source-stable-a-site', -26.9, 0.36, -12.8, 9.0, 8.0),
    floor('dust2-source-stable-b-site', 25.6, -0.24, -15.4, 9.0, 8.0),
    floor('dust2-source-stable-a-long', -35.2, 0.64, 0, 6.0, 18.0),
  ];
}

function createSourceWalkableColliders(meshes: MeshSpec[], prefix: string): BoxSpec[] {
  const cellSize = 0.96;
  const yStep = 0.16;
  const thickness = 0.16;
  const occupied = new Map<string, { x: number; z: number; y: number }>();
  const edgeA = new THREE.Vector3();
  const edgeB = new THREE.Vector3();
  const normal = new THREE.Vector3();

  meshes.forEach(mesh => {
    const positions = mesh.collisionPositions ?? mesh.positions;
    const indices = mesh.collisionIndices ?? mesh.indices;
    for (let i = 0; i < indices.length; i += 3) {
      const a = positions[indices[i]];
      const b = positions[indices[i + 1]];
      const c = positions[indices[i + 2]];
      if (!a || !b || !c) continue;

      edgeA.subVectors(b, a);
      edgeB.subVectors(c, a);
      normal.crossVectors(edgeA, edgeB);
      if (normal.lengthSq() <= 0.000001) continue;
      normal.normalize();
      if (normal.y < 0.55) continue;

      const minX = Math.min(a.x, b.x, c.x);
      const maxX = Math.max(a.x, b.x, c.x);
      const minZ = Math.min(a.z, b.z, c.z);
      const maxZ = Math.max(a.z, b.z, c.z);
      const surfaceY = (a.y + b.y + c.y) / 3;
      const yKey = Math.round(surfaceY / yStep);
      const x0 = Math.floor(minX / cellSize);
      const x1 = Math.ceil(maxX / cellSize);
      const z0 = Math.floor(minZ / cellSize);
      const z1 = Math.ceil(maxZ / cellSize);

      for (let z = z0; z <= z1; z += 1) {
        for (let x = x0; x <= x1; x += 1) {
          occupied.set(`${yKey}:${z}:${x}`, { x, z, y: yKey * yStep });
        }
      }
    }
  });

  const rows = new Map<string, { y: number; z: number; xs: number[] }>();
  occupied.forEach(cell => {
    const key = `${cell.y}:${cell.z}`;
    const row = rows.get(key) ?? { y: cell.y, z: cell.z, xs: [] };
    row.xs.push(cell.x);
    rows.set(key, row);
  });

  const colliders: BoxSpec[] = [];
  rows.forEach(row => {
    const xs = [...new Set(row.xs)].sort((a, b) => a - b);
    let start = xs[0];
    let prev = xs[0];
    const flush = () => {
      if (start === undefined || prev === undefined) return;
      const cells = prev - start + 1;
      const centerX = (start + cells / 2) * cellSize;
      const centerZ = (row.z + 0.5) * cellSize;
      colliders.push(box(
        centerX,
        row.y - thickness / 2,
        centerZ,
        cells * cellSize,
        thickness,
        cellSize,
        0x000000,
        `${prefix}-source-walkable-${colliders.length}`,
        0,
        1,
        0
      ));
      colliders[colliders.length - 1].physicsOnly = true;
    };

    for (let i = 1; i < xs.length; i += 1) {
      const x = xs[i];
      if (x === prev + 1) {
        prev = x;
        continue;
      }
      flush();
      start = x;
      prev = x;
    }
    flush();
  });

  return colliders;
}

function createNonWalkableCollisionMesh(mesh: MeshSpec): MeshSpec {
  const positions = mesh.collisionPositions ?? mesh.positions;
  const indices = mesh.collisionIndices ?? mesh.indices;
  const filteredIndices: number[] = [];
  const edgeA = new THREE.Vector3();
  const edgeB = new THREE.Vector3();
  const normal = new THREE.Vector3();

  for (let i = 0; i < indices.length; i += 3) {
    const a = positions[indices[i]];
    const b = positions[indices[i + 1]];
    const c = positions[indices[i + 2]];
    if (!a || !b || !c) continue;

    edgeA.subVectors(b, a);
    edgeB.subVectors(c, a);
    normal.crossVectors(edgeA, edgeB);
    if (normal.lengthSq() <= 0.000001) continue;
    normal.normalize();

    if (Math.abs(normal.y) >= 0.2) continue;
    filteredIndices.push(indices[i], indices[i + 1], indices[i + 2]);
  }

  return {
    ...mesh,
    collisionPositions: positions,
    collisionIndices: filteredIndices,
  };
}

function createVisualOnlyMesh(mesh: MeshSpec): MeshSpec {
  return {
    ...mesh,
    collisionPositions: [],
    collisionIndices: [],
  };
}

function createDust2SourceWalkableColliders(meshes: MeshSpec[]): BoxSpec[] {
  return createSourceWalkableColliders(meshes, 'dust2');
}

export const resolveDust2SourceBombSites = (
  resource: Dust2WorldMeshResource | null,
  fallbackBombSites: { A: THREE.Vector3; B: THREE.Vector3 }
) => {
  const bombTargets = resource?.source.manifest.entities?.bombTargets ?? [];
  const modelMeshes = resource?.source.manifest.geometry?.modelMeshes ?? [];
  const centers = bombTargets
    .map(target => {
      const match = target.model?.match(/^\*(\d+)$/);
      const modelIndex = match ? Number(match[1]) : null;
      const modelMesh = modelIndex === null
        ? undefined
        : modelMeshes.find(mesh => mesh.modelIndex === modelIndex);
      const bounds = modelMesh?.gameBounds;
      const mins = bounds?.mins;
      const maxs = bounds?.maxs;
      if (
        typeof mins?.x !== 'number' || typeof mins.y !== 'number' || typeof mins.z !== 'number'
        || typeof maxs?.x !== 'number' || typeof maxs.y !== 'number' || typeof maxs.z !== 'number'
      ) {
        return null;
      }

      return new THREE.Vector3(
        (mins.x + maxs.x) / 2,
        Math.max(0.04, mins.y + 0.04),
        (mins.z + maxs.z) / 2
      );
    })
    .filter((center): center is THREE.Vector3 => center !== null)
    .sort((left, right) => left.x - right.x);

  if (centers.length < 2) {
    return {
      A: fallbackBombSites.A.clone(),
      B: fallbackBombSites.B.clone(),
    };
  }

  return {
    A: centers[0].clone(),
    B: centers[centers.length - 1].clone(),
  };
};

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

const cloneMesh = (mesh: MeshSpec): MeshSpec => ({
  ...mesh,
  positions: mesh.positions.map(position => position.clone()),
  indices: [...mesh.indices],
  collisionPositions: mesh.collisionPositions?.map(position => position.clone()),
  collisionIndices: mesh.collisionIndices ? [...mesh.collisionIndices] : undefined
});

const cloneArena = (arena: ArenaData, name: string, playerSpawn: THREE.Vector3): ArenaData => ({
  ...arena,
  name,
  playerSpawn: playerSpawn.clone(),
  enemySpawns: arena.enemySpawns.map(spawn => ({ ...spawn, position: spawn.position.clone() })),
  bombSites: arena.bombSites
    ? { A: arena.bombSites.A.clone(), B: arena.bombSites.B.clone() }
    : undefined,
  colliders: arena.colliders.map(cloneBox),
  props: arena.props.map(cloneBox),
  meshes: arena.meshes?.map(cloneMesh),
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
  const colliderBoxes: BoxSpec[] = INFERNO_COLLIDERS.map(c => ({
    position: new THREE.Vector3(c.position.x, c.position.y, c.position.z),
    size: new THREE.Vector3(c.size.x, c.size.y, c.size.z),
    rotation: c.rotation ? { ...c.rotation } : undefined,
    color: 0xb08c58,
    metalness: 0.08,
    roughness: 0.82,
    name: c.name
  }));

  const fallbackPlayerSpawn = new THREE.Vector3(-3.2, PLAYER_EYE_HEIGHT, 30.4);
  const fallbackEnemySpawns: EnemySpawnPoint[] = [
    { position: new THREE.Vector3(INFERNO_BOMB_SITES.A.position.x, PLAYER_EYE_HEIGHT, INFERNO_BOMB_SITES.A.position.z), type: 'shooter' as const },
    { position: new THREE.Vector3(INFERNO_BOMB_SITES.B.position.x, PLAYER_EYE_HEIGHT, INFERNO_BOMB_SITES.B.position.z), type: 'shooter' as const },
    { position: new THREE.Vector3(-28.16, PLAYER_EYE_HEIGHT, 0), type: 'patrol' as const },
    { position: new THREE.Vector3(-15.36, PLAYER_EYE_HEIGHT, -10.24), type: 'patrol' as const },
    { position: new THREE.Vector3(15.36, PLAYER_EYE_HEIGHT, -10.24), type: 'patrol' as const },
  ];
  const fallbackBombSites = {
    A: new THREE.Vector3(INFERNO_BOMB_SITES.A.position.x, 0.04, INFERNO_BOMB_SITES.A.position.z),
    B: new THREE.Vector3(INFERNO_BOMB_SITES.B.position.x, 0.04, INFERNO_BOMB_SITES.B.position.z),
  };
  const rawSourceMeshes = INFERNO_WORLD_MESH_RESOURCE
    ? [meshSpecFromInfernoWorldMeshResource(INFERNO_WORLD_MESH_RESOURCE)]
    : [];
  const sourceMeshes = rawSourceMeshes.map(createNonWalkableCollisionMesh);
  const sourceGeometry = resolveInfernoSourceGeometry(sourceMeshes, colliderBoxes, [
    box(INFERNO_BOMB_SITES.A.position.x, INFERNO_BOMB_SITES.A.position.y, INFERNO_BOMB_SITES.A.position.z, 3.84, 0.04, 3.84, 0xd4a017, 'inferno-a-bomb-marker', 0.1, 0.6),
    box(INFERNO_BOMB_SITES.B.position.x, INFERNO_BOMB_SITES.B.position.y, INFERNO_BOMB_SITES.B.position.z, 3.84, 0.04, 3.84, 0xd4a017, 'inferno-b-bomb-marker', 0.1, 0.6),
    box(0, 0.01, 0, 71.68, 0.02, 81.92, 0xc8a260, 'inferno-cobblestone-floor', 0.05, 0.8),
    box(-15.36, 2.56, -5.12, 12.8, 2.56, 0.16, 0xa6dfff, 'inferno-apartment-window-glass', 0.03, 0.06, 0.3),
    box(-28.16, 1.28, -5.12, 12.8, 2.56, 0.16, 0xa6dfff, 'inferno-apartment-window-glass-alt', 0.03, 0.06, 0.3),
    box(-38.4, 0.01, 10.24, 10.24, 0.02, 10.24, 0xd4b87a, 'inferno-a-platform-edge', 0.05, 0.78),
    box(38.4, 0.01, 10.24, 10.24, 0.02, 10.24, 0xd4b87a, 'inferno-b-platform-edge', 0.05, 0.78),
    box(0, 0.01, -28.16, 71.68, 0.02, 10.24, 0xc8b898, 'inferno-mid-floor-accent', 0.05, 0.80),
    box(-15.36, 0.01, -5.12, 20.48, 0.02, 5.12, 0xb8a898, 'inferno-apartment-floor-tile', 0.05, 0.82),
    box(0, 1.28, -10.24, 5.12, 1.28, 0.16, 0xffffff, 'inferno-ct-window-glass', 0.03, 0.06, 0.3),
    box(0, 0.01, 25.6, 71.68, 0.02, 5.12, 0xa89878, 'inferno-b-side-floor-accent', 0.05, 0.80),
    box(-25.6, 0.01, -25.6, 5.12, 0.02, 5.12, 0xa89878, 'inferno-a-long-floor-accent', 0.05, 0.80),
    box(25.6, 0.01, -25.6, 5.12, 0.02, 5.12, 0xa89878, 'inferno-b-short-floor-accent', 0.05, 0.80),
  ]);
  const sourceSpawns = resolveInfernoSourceSpawns(
    INFERNO_WORLD_MESH_RESOURCE,
    fallbackPlayerSpawn,
    fallbackEnemySpawns
  );
  const sourceBombSites = resolveInfernoSourceBombSites(
    INFERNO_WORLD_MESH_RESOURCE,
    fallbackBombSites
  );

  return {
    name: 'Inferno',
    playerSpawn: sourceSpawns.playerSpawn,
    bounds: { width: 71.68, depth: 81.92, centerZ: sourceBombSites.A.z + 1.92 },
    enemySpawns: sourceSpawns.enemySpawns,
    bombSites: sourceBombSites,
    colliders: sourceGeometry.meshes.length > 0
      ? [
          ...createSourceWalkableColliders(rawSourceMeshes, 'inferno'),
          ...sourceGeometry.colliders
        ]
      : sourceGeometry.colliders,
    props: sourceGeometry.props,
    meshes: sourceGeometry.meshes,
    source: INFERNO_WORLD_MESH_RESOURCE
      ? {
          sourceBacked: true,
          engine: 'goldsrc',
          kind: INFERNO_WORLD_MESH_RESOURCE.source.kind,
          path: INFERNO_WORLD_MESH_RESOURCE.source.path,
          sha256: INFERNO_WORLD_MESH_RESOURCE.source.sha256,
        }
      : {
          sourceBacked: false,
          note: 'Inferno is using legacy placeholder geometry until a legal CS1.6 de_inferno.bsp or de_inferno.map is imported.',
        },
    materialZones: [
      materialZone('inferno-cobblestone', 'cobblestone', 0, 0, 0, 71.68, 0.1, 81.92),
      materialZone('inferno-tile-apartments', 'tile', -15.36, 2, -5.12, 20.48, 0.1, 15.36),
      materialZone('inferno-metal-catwalk', 'metal', -15.36, 2.56, -5.12, 20.48, 0.1, 5.12),
      materialZone('inferno-concrete-a', 'concrete', -38.4, 0.01, -25.6, 12.8, 0.1, 12.8),
      materialZone('inferno-concrete-b', 'concrete', 38.4, 0.01, -25.6, 12.8, 0.1, 12.8),
      materialZone('inferno-concrete-mid', 'concrete', 0, 0.01, -28.16, 71.68, 0.1, 10.24),
    ]
  };
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

function buildBloodStrikeArena(): ArenaData {
  return buildMapArena(
    'Blood Strike',
    BLOODSTRIKE_COLLIDERS,
    0x8b2020,
    new THREE.Vector3(0, PLAYER_EYE_HEIGHT, 13.44),
    32, 32, 0,
    [
      box(BLOODSTRIKE_BOMB_SITES.A.position.x, BLOODSTRIKE_BOMB_SITES.A.position.y, BLOODSTRIKE_BOMB_SITES.A.position.z, 1.92, 0.04, 1.92, 0xd4a017, 'bs-a-bomb-marker', 0.1, 0.6),
      box(BLOODSTRIKE_BOMB_SITES.B.position.x, BLOODSTRIKE_BOMB_SITES.B.position.y, BLOODSTRIKE_BOMB_SITES.B.position.z, 1.92, 0.04, 1.92, 0xd4a017, 'bs-b-bomb-marker', 0.1, 0.6),
      box(0, 0.01, 0, 32, 0.02, 32, 0x8a8b85, 'bs-concrete-floor', 0.05, 0.85),    ],
    [
      materialZone('bs-concrete', 'concrete', 0, 0, 0, 32, 0.1, 32),
      materialZone('bs-metal-center', 'metal', 0, 0, 0, 4, 0.1, 4),
    ],
    [
      ...BLOODSTRIKE_TDM_SPAWNS.slice(0, 5).map((s, i) => ({
        position: new THREE.Vector3(s.x, PLAYER_EYE_HEIGHT, s.z),
        type: (['patrol', 'shooter', 'assault', 'patrol', 'shooter'] as const)[i]
      }))
    ]
  );
}

function buildDust2Arena(): ArenaData {
  // This hand-authored Dust2 data is a visual/gameplay fallback. When a
  // validated CS1.6 GoldSrc mesh resource exists, `resolveDust2SourceGeometry`
  // drops these placeholder boxes/props and uses only the imported source mesh.
  const colliderBoxes: BoxSpec[] = DUST2_COLLIDERS.map(c => {
    const n = c.name ?? '';
    let color = 0xb8a070;
    let textureKey: BoxSpec['textureKey'] = 'sand';
    let metalness = 0.08;
    let roughness = 0.82;

    if (n.includes('tunnel') || n.includes('dark') || n.includes('upper')) {
      color = 0x9a8878; textureKey = 'concrete'; metalness = 0.05; roughness = 0.90;
      // 洞内分段微变：入口亮 → 深处暗
      if (n.includes('entrance')) { color = 0xa09280; roughness = 0.88; }
      if (n.includes('narrow') || n.includes('inner')) { color = 0x8e7c6e; roughness = 0.92; }
    } else if (n.includes('catwalk') || n.includes('stair') || n.includes('ramp')) {
      color = 0x9a9080; textureKey = 'concrete'; metalness = 0.05; roughness = 0.88;
      // 楼梯踏步磨损
      if (n.includes('stair')) { color = 0xa69a88; roughness = 0.86; }
    } else if (n.includes('door') || n.includes('post') || n.includes('gateway')) {
      color = 0x7a6040; textureKey = 'metal'; metalness = 0.35; roughness = 0.55;
      // 门框做旧
      if (n.includes('frame') || n.includes('lintel')) { color = 0x6e5640; roughness = 0.62; }
    } else if (n.includes('spiral')) {
      color = 0x9e8e7e; textureKey = 'concrete'; metalness = 0.05; roughness = 0.88;
      if (n.includes('wall') || n.includes('rail')) { color = 0x8a7a6a; roughness = 0.90; }
      if (n.includes('platform')) { color = 0xa09280; roughness = 0.86; }
    } else if (n.includes('box') || n.includes('car') || n.includes('bucket') || n.includes('plat')) {
      color = 0xc4a46b; textureKey = 'sand'; metalness = 0.06; roughness = 0.85;
      // 掩体底部脏污
      if (n.includes('base') || n.includes('lower')) { color = 0xb89a60; roughness = 0.88; }
      if (n.includes('default') || n.includes('double')) { color = 0xc0a06a; roughness = 0.84; }
      if (n.includes('body')) { color = 0x4a3a2a; roughness = 0.65; }
    } else if (n.includes('a-site') || n.includes('b-site')) {
      color = 0xc8b890; textureKey = 'plaster'; metalness = 0.04; roughness = 0.88;
      // 平台前沿/后沿略暗
      if (n.includes('lip') || n.includes('rear')) { color = 0xbaa880; roughness = 0.90; }
    } else if (n.includes('palace')) {
      color = 0xc0b498; textureKey = 'plaster'; metalness = 0.04; roughness = 0.86;
      // Legacy placeholder material variation.
      if (n.includes('outer') || n.includes('wall')) { color = 0xb8aa88; roughness = 0.89; }
    } else if (n.includes('pillar')) {
      color = 0xc8bc98; textureKey = 'plaster'; metalness = 0.03; roughness = 0.85;
    } else if (n.includes('pit')) {
      color = 0xc8a470; textureKey = 'sand'; metalness = 0.06; roughness = 0.86;
      // Pit 深处更暗
      if (n.includes('floor') || n.includes('stair')) { color = 0xb89860; roughness = 0.90; }
    } else if (n.includes('fork')) {
      color = 0x9e8e7e; textureKey = 'concrete'; metalness = 0.05; roughness = 0.88;
    } else if (n.includes('window')) {
      color = 0x887658; textureKey = 'metal'; metalness = 0.28; roughness = 0.60;
      // 窗台磨损
      if (n.includes('sill') || n.includes('side')) { color = 0x7a6850; roughness = 0.65; }
    } else if (n.includes('border') || n.includes('wall') || n.includes('divider')) {
      color = 0xb09870; textureKey = 'sand'; metalness = 0.07; roughness = 0.84;
      // 墙壁微变体：某些墙更偏暖黄，某些更偏灰
      if (n.includes('outer') || n.includes('inner')) { color = 0xbca878; roughness = 0.82; }
      if (n.includes('mid') || n.includes('ct') || n.includes('bs')) { color = 0xa89068; roughness = 0.86; }
      // 分隔墙和建筑体块用混凝土
      if (n.includes('divider') || n.includes('mass') || n.includes('entry')) { textureKey = 'concrete'; color = 0xa09888; roughness = 0.88; }
    } else if (n.includes('boundary')) {
      color = 0xa09070; textureKey = 'sand';
    }
    // 通用老化微调：带有 refined/thickness/mass 后缀的块体略暗
    if (n.includes('refined') || n.includes('thickness') || n.includes('mass')) {
      color = new THREE.Color(color).multiplyScalar(0.92).getHex();
      roughness = Math.min(0.94, roughness + 0.03);
    }

    return {
      position: new THREE.Vector3(c.position.x, c.position.y, c.position.z),
      size: new THREE.Vector3(c.size.x, c.size.y, c.size.z),
      rotation: c.rotation ? { ...c.rotation } : undefined,
      color, textureKey, metalness, roughness,
      name: c.name
    };
  });

  // Hammer→game 比例 0.01
  const H = (v: number) => v * 0.01;

  const props: BoxSpec[] = [
    // ── 大面积沙地地面（最底层 Y=0.00）──
    { ...box(0, 0.00, H(1536), H(8192), 0.02, H(10240), 0xffffff, 'dust2-sand-floor', 0.04, 0.88), textureKey: 'sand' as const },

    // ── A Site 包点地面（混凝土，Y=0.005）+ 标记 ──
    { ...box(H(-2688), 0.005, H(1280), H(1792), 0.02, H(1664), 0xc0b490, 'dust2-a-site-floor', 0.06, 0.82), textureKey: 'plaster' as const },
    box(H(-2560), 0.03, H(1280), H(512), 0.04, H(512), 0xd4a017, 'dust2-a-bomb-marker', 0.1, 0.6),

    // ── B Site 包点地面（混凝土，Y=0.005）+ 标记 ──
    { ...box(H(2560), 0.005, H(1536), H(1792), 0.02, H(1664), 0xc0b490, 'dust2-b-site-floor', 0.06, 0.82), textureKey: 'plaster' as const },
    box(H(2560), 0.03, H(1280), H(512), 0.04, H(512), 0xd4a017, 'dust2-b-bomb-marker', 0.1, 0.6),

    // ── CT Spawn placeholder floor ──
    { ...box(0, 0.005, H(3328), H(1024), 0.02, H(768), 0x4a4038, 'dust2-ct-spawn-floor', 0.05, 0.85), textureKey: 'concrete' as const },

    // ── CT Spawn placeholder room visuals ──
    // 后墙
    { ...box(0, 1.28, H(3712), H(1024), 2.56, H(16), 0x3a3028, 'dust2-ct-spawn-back-wall-visual', 0.3, 0.7), textureKey: 'concrete' as const },
    // 左墙
    { ...box(H(-512), 1.28, H(3328), H(16), 2.56, H(768), 0x3a3028, 'dust2-ct-spawn-left-wall-visual', 0.3, 0.7), textureKey: 'concrete' as const },
    // 右墙
    { ...box(H(512), 1.28, H(3328), H(16), 2.56, H(768), 0x3a3028, 'dust2-ct-spawn-right-wall-visual', 0.3, 0.7), textureKey: 'concrete' as const },
    // 前墙左段
    { ...box(H(-768), 1.28, H(2944), H(256), 2.56, H(16), 0x3a3028, 'dust2-ct-spawn-front-left-visual', 0.3, 0.7), textureKey: 'concrete' as const },
    // 前墙中段
    { ...box(0, 1.28, H(2944), H(256), 2.56, H(16), 0x3a3028, 'dust2-ct-spawn-front-mid-visual', 0.3, 0.7), textureKey: 'concrete' as const },
    // 前墙右段
    { ...box(H(768), 1.28, H(2944), H(256), 2.56, H(16), 0x3a3028, 'dust2-ct-spawn-front-right-visual', 0.3, 0.7), textureKey: 'concrete' as const },
    // Placeholder ceiling from the legacy fallback layout.
    { ...box(0, 2.56, H(3328), H(1040), 0.32, H(784), 0x2a2018, 'dust2-ct-spawn-ceiling-visual', 0.3, 0.7), textureKey: 'concrete' as const },

    // ── T Spawn 地面（沙地延伸，Y=0.005）──
    { ...box(0, 0.005, H(-5632), H(2048), 0.02, H(2048), 0xb09060, 'dust2-t-spawn-floor', 0.04, 0.90), textureKey: 'sand' as const },

    // ── A Long 走廊地面（沙地较暗，Y=0.005）──
    { ...box(H(-3584), 0.005, H(3072), H(576), 0.02, H(6144), 0xb09060, 'dust2-a-long-floor', 0.04, 0.90), textureKey: 'sand' as const },

    // ── A Site 平台边沿与 Goose 区域视觉增强 ──
    { ...box(H(-2688), 0.18, H(1024), H(768), 0.04, H(32), 0xe0c48c, 'dust2-a-site-platform-edge', 0.05, 0.78), textureKey: 'plaster' as const },
    { ...box(H(-1984), 0.18, H(1600), H(224), 0.04, H(224), 0xc8b898, 'dust2-goose-floor-accent', 0.05, 0.80), textureKey: 'plaster' as const },

    // ── B Tunnels 地面（暗色砖面，Y=0.005）──
    { ...box(H(3264), 0.005, H(3072), H(576), 0.02, H(6144), 0x6a5a48, 'dust2-b-tunnel-floor', 0.06, 0.92), textureKey: 'concrete' as const },

    // ── B Site platform edge accent ──
    { ...box(H(2560), 0.18, H(1152), H(512), 0.04, H(32), 0xd0b888, 'dust2-b-site-platform-edge', 0.05, 0.78), textureKey: 'plaster' as const },
    // ── B Default / Double area floor accent ──
    { ...box(H(2368), 0.10, H(1408), H(128), 0.04, H(192), 0xb8a070, 'dust2-b-default-floor-accent', 0.05, 0.82), textureKey: 'plaster' as const },
    // ── Upper Dark floor (darker concrete, Y=0.005) ──
    { ...box(H(3072), 0.005, H(512), H(320), 0.02, H(1536), 0x3a3028, 'dust2-upper-dark-floor', 0.06, 0.95), textureKey: 'concrete' as const },
    // ── B Window threshold ──
    { ...box(H(1920), 0.10, H(1024), H(96), 0.04, H(64), 0x9a8a72, 'dust2-b-window-threshold', 0.05, 0.84), textureKey: 'concrete' as const },
    // ── B Doors threshold ──
    { ...box(H(1920), 0.10, H(1536), H(128), 0.04, H(256), 0x8f7b5e, 'dust2-b-doors-threshold', 0.05, 0.84), textureKey: 'concrete' as const },

    // ════════════════════════════════════════════════════════
    // 墙体底部磨损/脏污带 (wear strips at wall bases)
    // ════════════════════════════════════════════════════════
    // A Site — 平台前沿下方脏污
    { ...box(H(-2688), -0.08, H(1024), H(768), 0.06, H(48), 0x6a5840, 'dust2-wear-a-platform-front', 0.12, 0.94) },
    // A Site — Long Corner 转角墙角脏污
    { ...box(H(-3136), -0.08, H(256), H(32), 0.06, H(48), 0x5a4830, 'dust2-wear-a-long-corner', 0.12, 0.94) },
    // A Site — Goose 下方脏污
    { ...box(H(-1984), -0.08, H(1600), H(224), 0.06, H(96), 0x5a4830, 'dust2-wear-goose', 0.12, 0.94) },
    // A Long — A Doors 门框下方磨损
    { ...box(H(-3584), -0.08, H(1920), H(544), 0.06, H(48), 0x5a4830, 'dust2-wear-a-doors', 0.12, 0.93) },
    // Mid — Mid Doors 下方磨损
    { ...box(H(0), -0.08, H(2048), H(288), 0.06, H(48), 0x5a4830, 'dust2-wear-mid-doors', 0.12, 0.93) },
    // Mid — Xbox 下方暗区
    { ...box(H(0), -0.08, H(1024), H(96), 0.06, H(64), 0x4a3828, 'dust2-wear-xbox', 0.14, 0.94) },
    // B Tunnels — 入口地面磨损
    { ...box(H(3264), -0.08, H(5760), H(576), 0.06, H(128), 0x4a3828, 'dust2-wear-b-tunnel-entrance', 0.12, 0.94) },
    // B Tunnels — 出口地面磨损
    { ...box(H(3264), -0.08, H(1984), H(576), 0.06, H(128), 0x4a3828, 'dust2-wear-b-tunnel-exit', 0.12, 0.94) },
    // B Site — Car 下方暗区
    { ...box(H(2688), -0.08, H(1408), H(128), 0.06, H(64), 0x3a2a1a, 'dust2-wear-b-car', 0.14, 0.94) },
    // B Site — Default 箱下方
    { ...box(H(2368), -0.08, H(1472), H(64), 0.06, H(64), 0x4a3828, 'dust2-wear-b-default', 0.14, 0.94) },
    // B Site — B Doors 门框下方
    { ...box(H(1920), -0.08, H(1536), H(128), 0.06, H(48), 0x5a4830, 'dust2-wear-b-doors', 0.12, 0.93) },
    // CT Mid — 走廊地面暗痕
    { ...box(H(0), -0.08, H(1792), H(512), 0.06, H(128), 0x6a5840, 'dust2-wear-ct-mid', 0.10, 0.92) },
    // Suicide — 角落暗区
    { ...box(H(512), -0.08, H(3072), H(256), 0.06, H(128), 0x4a3828, 'dust2-wear-suicide', 0.14, 0.95) },
    // Pit — 坑底角落暗斑
    { ...box(H(-3584), -0.70, H(256), H(576), 0.06, H(256), 0x3a2818, 'dust2-wear-pit', 0.14, 0.96) },

    // ════════════════════════════════════════════════════════
    // 地面脏污/色差斑块 (dirt patches on floors)
    // ════════════════════════════════════════════════════════
    // A Site 平台角落暗斑
    { ...box(H(-2816), 0.02, H(-1408), H(64), 0.02, H(64), 0x8a7850, 'dust2-dirt-a-platform-1', 0.10, 0.90) },
    { ...box(H(-2560), 0.02, H(-1536), H(48), 0.02, H(48), 0x8a7850, 'dust2-dirt-a-platform-2', 0.10, 0.90) },
    // B Site 平台角落暗斑
    { ...box(H(2240), 0.02, H(-1408), H(48), 0.02, H(48), 0x8a7850, 'dust2-dirt-b-platform-1', 0.10, 0.90) },
    { ...box(H(2688), 0.02, H(-1664), H(48), 0.02, H(48), 0x8a7850, 'dust2-dirt-b-platform-2', 0.10, 0.90) },
    // Mid 地面暗斑
    { ...box(H(-384), 0.02, H(-512), H(48), 0.02, H(48), 0x6a5840, 'dust2-dirt-mid-1', 0.10, 0.92) },
    { ...box(H(384), 0.02, H(-512), H(48), 0.02, H(48), 0x6a5840, 'dust2-dirt-mid-2', 0.10, 0.92) },
    // Long 地面暗斑
    { ...box(H(-3520), 0.02, H(4096), H(48), 0.02, H(48), 0x7a6850, 'dust2-dirt-a-long-1', 0.10, 0.90) },
    { ...box(H(-3520), 0.02, H(2304), H(48), 0.02, H(48), 0x7a6850, 'dust2-dirt-a-long-2', 0.10, 0.90) },
    // B Tunnels 地面暗斑
    { ...box(H(3264), 0.02, H(4352), H(48), 0.02, H(48), 0x4a3830, 'dust2-dirt-b-tunnel-1', 0.10, 0.94) },
    { ...box(H(3200), 0.02, H(2432), H(48), 0.02, H(48), 0x4a3830, 'dust2-dirt-b-tunnel-2', 0.10, 0.94) },
    // CT Spawn 地面暗斑
    { ...box(H(-384), 0.02, H(3136), H(48), 0.02, H(48), 0x7a7060, 'dust2-dirt-ct-spawn-1', 0.08, 0.90) },
    { ...box(H(384), 0.02, H(3136), H(48), 0.02, H(48), 0x7a7060, 'dust2-dirt-ct-spawn-2', 0.08, 0.90) },

    // ── Mid / CT Mid 地面层次（Y=0.005）──
    { ...box(H(0), 0.005, H(-1024), H(1024), 0.02, H(2048), 0xb89e6a, 'dust2-mid-tone-floor', 0.05, 0.86), textureKey: 'sand' as const },
    { ...box(H(-64), 0.10, H(-2048), H(384), 0.04, H(128), 0x9a8a72, 'dust2-mid-doors-threshold', 0.05, 0.84), textureKey: 'concrete' as const },
    { ...box(H(0), 0.10, H(-1664), H(256), 0.04, H(512), 0x8f7b5e, 'dust2-ct-mid-floor-accent', 0.05, 0.84), textureKey: 'concrete' as const },

    // ── 木门 ──
    { ...box(H(-3712), 1.28, H(-1920), 0.10, 2.56, H(192), 0xffffff, 'dust2-a-doors-left',  0.08, 0.88), textureKey: 'wood' as const },
    { ...box(H(-3456), 1.28, H(-1920), 0.10, 2.56, H(192), 0xffffff, 'dust2-a-doors-right', 0.08, 0.88), textureKey: 'wood' as const },
    { ...box(H(-64),  1.60, H(-2048), 0.10, 3.20, H(192), 0xffffff, 'dust2-mid-doors-left',  0.08, 0.88), textureKey: 'wood' as const },
    { ...box(H( 64),  1.60, H(-2048), 0.10, 3.20, H(192), 0xffffff, 'dust2-mid-doors-right', 0.08, 0.88), textureKey: 'wood' as const },
    { ...box(H(1920), 1.28, H(1536), H(128), 1.92, 0.10, 0xffffff, 'dust2-b-doors-left',  0.08, 0.88), textureKey: 'wood' as const },

    // ── CT Window / B Window 玻璃 ──
    box(0, 1.92, H(1216), H(128), 0.48, H(32), 0x9edcff, 'dust2-ct-window-glass', 0.03, 0.06, 0.3),
    box(H(1920), 1.92, H(960), H(96), 0.48, H(32), 0x9edcff, 'dust2-b-window-glass', 0.03, 0.06, 0.3),

    // ── 顶棚 ──
    box(0, H(288), H(-6144), H(2048), 0.32, H(768), 0x3a3020, 'dust2-t-spawn-roof', 0.3, 0.7),
    box(H(3264), H(264), H(-3072), H(576), 0.32, H(6144), 0x3a3020, 'dust2-b-tunnel-roof', 0.3, 0.7),
    box(H(3072), H(264), H(512), H(320), 0.32, H(1536), 0x3a3020, 'dust2-upper-tunnel-roof', 0.3, 0.7),
    box(H(-3584), H(336), H(-3072), H(576), 0.32, H(6144), 0x3a3020, 'dust2-a-long-roof', 0.3, 0.7),
    { ...box(H(-2560), H(368), H(-3840), H(1280), 0.32, H(1536), 0xc8b898, 'dust2-palace-ceil-visual', 0.04, 0.86), textureKey: 'plaster' as const },

    // ════════════════════════════════════════════════════════
    // 标志性视觉道具
    // ════════════════════════════════════════════════════════

    // ── A Long 废弃轿车（Long Car）──
    // 车身
    box(H(-3200), 0.30, H(3584), H(384), 0.60, H(192), 0x4a3a2a, 'dust2-a-long-car-body', 0.18, 0.65),
    // 车顶
    box(H(-3200), 0.90, H(3584), H(288), 0.30, H(144), 0x3a2c1c, 'dust2-a-long-car-roof', 0.18, 0.70),
    // 车轮（4个）
    box(H(-3072), 0.12, H(3456), H(48), 0.24, H(32), 0x1a1a1a, 'dust2-car-wheel-fr', 0.3, 0.7),
    box(H(-3072), 0.12, H(3712), H(48), 0.24, H(32), 0x1a1a1a, 'dust2-car-wheel-rr', 0.3, 0.7),
    box(H(-3328), 0.12, H(3456), H(48), 0.24, H(32), 0x1a1a1a, 'dust2-car-wheel-fl', 0.3, 0.7),
    box(H(-3328), 0.12, H(3712), H(48), 0.24, H(32), 0x1a1a1a, 'dust2-car-wheel-rl', 0.3, 0.7),
    // 挡风玻璃
    box(H(-3200), 0.72, H(3488), H(256), 0.30, H(128), 0x8ab8d0, 'dust2-car-windshield', 0.05, 0.12, 0.45),

    // ── T Spawn 栅栏（木板围栏）──
    { ...box(H(-512), 0.48, H(-5888), H(32), 0.96, H(576), 0xffffff, 'dust2-t-fence-1', 0.05, 0.92), textureKey: 'wood' as const },
    { ...box(H( 512), 0.48, H(-5888), H(32), 0.96, H(576), 0xffffff, 'dust2-t-fence-2', 0.05, 0.92), textureKey: 'wood' as const },
    // 横梁
    { ...box(H(0),    0.72, H(-5888), H(1024), 0.08, H(32), 0xffffff, 'dust2-t-fence-top-rail', 0.05, 0.90), textureKey: 'wood' as const },
    { ...box(H(0),    0.24, H(-5888), H(1024), 0.08, H(32), 0xffffff, 'dust2-t-fence-bot-rail', 0.05, 0.90), textureKey: 'wood' as const },

    // ── CT Spawn 路灯柱（2根）──
    box(H(-384), 1.80, H(3072), H(16), 3.60, H(16), 0x706050, 'dust2-ct-lamp-post-l', 0.5, 0.5),
    box(H( 384), 1.80, H(3072), H(16), 3.60, H(16), 0x706050, 'dust2-ct-lamp-post-r', 0.5, 0.5),
    // 灯臂
    box(H(-384), 3.52, H(3040), H(96), 0.08, H(16), 0x706050, 'dust2-ct-lamp-arm-l', 0.5, 0.5),
    box(H( 384), 3.52, H(3040), H(96), 0.08, H(16), 0x706050, 'dust2-ct-lamp-arm-r', 0.5, 0.5),
    // 灯罩
    box(H(-432), 3.48, H(3032), H(48), 0.16, H(32), 0xfff0a0, 'dust2-ct-lamp-head-l', 0.1, 0.4),
    box(H( 432), 3.48, H(3032), H(48), 0.16, H(32), 0xfff0a0, 'dust2-ct-lamp-head-r', 0.1, 0.4),

    // ── B Site 水箱（右侧）──
    box(H(3200), 1.20, H(1280), H(192), 2.40, H(128), 0x556677, 'dust2-b-water-tank-body', 0.25, 0.55),
    box(H(3200), 2.42, H(1280), H(208), 0.08, H(144), 0x445566, 'dust2-b-water-tank-top', 0.25, 0.50),
    // 水管
    box(H(3200), 1.20, H(1216), H(32), 2.40, H(32), 0x445566, 'dust2-b-water-pipe', 0.3, 0.6),

    // ── Pit / Mid 铁桶 ──
    box(H(-3456), 0.28, H(-384), H(48), 0.56, H(48), 0x5a4830, 'dust2-pit-barrel-1', 0.4, 0.65),
    box(H(-3392), 0.28, H(-320), H(48), 0.56, H(48), 0x5a4830, 'dust2-pit-barrel-2', 0.4, 0.65),
    box(H(-128),  0.28, H( 640), H(48), 0.56, H(48), 0x4a5a40, 'dust2-mid-barrel',   0.4, 0.65),

    // ── B Tunnels 壁灯（沿走廊每隔一段）──
    // 灯底座
    box(H(3072), 1.80, H(5500), H(16), 0.16, H(16), 0x5a5040, 'dust2-b-lamp-base-1', 0.3, 0.6),
    box(H(3072), 1.80, H(4000), H(16), 0.16, H(16), 0x5a5040, 'dust2-b-lamp-base-2', 0.3, 0.6),
    box(H(3072), 1.80, H(2500), H(16), 0.16, H(16), 0x5a5040, 'dust2-b-lamp-base-3', 0.3, 0.6),
    box(H(3072), 1.80, H(1000), H(16), 0.16, H(16), 0x5a5040, 'dust2-b-lamp-base-4', 0.3, 0.6),
    // 灯罩（偏橙黄色）
    box(H(3072), 1.84, H(5500), H(32), 0.12, H(32), 0xffa040, 'dust2-b-lamp-1', 0.1, 0.3),
    box(H(3072), 1.84, H(4000), H(32), 0.12, H(32), 0xffa040, 'dust2-b-lamp-2', 0.1, 0.3),
    box(H(3072), 1.84, H(2500), H(32), 0.12, H(32), 0xffa040, 'dust2-b-lamp-3', 0.1, 0.3),
    box(H(3072), 1.84, H(1000), H(32), 0.12, H(32), 0xffa040, 'dust2-b-lamp-4', 0.1, 0.3),

    // ── A Long 走廊壁灯 ──
    box(H(-3904), 1.80, H(5000), H(16), 0.16, H(16), 0x5a5040, 'dust2-a-lamp-base-1', 0.3, 0.6),
    box(H(-3904), 1.80, H(3500), H(16), 0.16, H(16), 0x5a5040, 'dust2-a-lamp-base-2', 0.3, 0.6),
    box(H(-3904), 1.80, H(1500), H(16), 0.16, H(16), 0x5a5040, 'dust2-a-lamp-base-3', 0.3, 0.6),
    box(H(-3904), 1.84, H(5000), H(32), 0.12, H(32), 0xffa040, 'dust2-a-lamp-1', 0.1, 0.3),
    box(H(-3904), 1.84, H(3500), H(32), 0.12, H(32), 0xffa040, 'dust2-a-lamp-2', 0.1, 0.3),
    box(H(-3904), 1.84, H(1500), H(32), 0.12, H(32), 0xffa040, 'dust2-a-lamp-3', 0.1, 0.3),

    // ── Pit 坑底地面（比主地面低，保持原样）──
    { ...box(H(-3584), -0.63, H(256), H(576), 0.02, H(512), 0xb09060, 'dust2-pit-floor', 0.04, 0.90), textureKey: 'sand' as const },

    // ── A Site Ninja 夹角地面标记（Y=0.005）──
    { ...box(H(-3424), 0.005, H(1856), H(192), 0.02, H(384), 0x9a8860, 'dust2-ninja-floor', 0.04, 0.90), textureKey: 'concrete' as const },

    // ── B Outside 地面（Y=0.005）──
    { ...box(H(2240), 0.005, H(-5120), H(640), 0.02, H(1024), 0xb09060, 'dust2-b-outside-floor', 0.04, 0.88), textureKey: 'sand' as const },

    // ── A Site 货柜箱（A Ramp 旁）──
    box(H(-3072), 0.30, H(-768), H(128), 0.96, H(96), 0x4a6e3a, 'dust2-a-shipping-container-1', 0.3, 0.55),
    box(H(-3072), 1.26, H(-768), H(132), 0.08, H(100), 0x3a5a2a, 'dust2-a-shipping-container-top', 0.3, 0.50),

    // ── Mid 路障（Mid Doors 旁）──
    box(H(-384), 0.30, H(2048), H(96), 0.60, H(32), 0x6a6a6a, 'dust2-mid-barrier-l', 0.4, 0.60),
    box(H(384), 0.30, H(2048), H(96), 0.60, H(32), 0x6a6a6a, 'dust2-mid-barrier-r', 0.4, 0.60),

    // ── CT Mid 木箱堆 ──
    box(H(-256), 0.30, H(-2048), H(64), 0.96, H(64), 0xc4a46b, 'dust2-ct-mid-crate-1', 0.08, 0.78),
    box(H(-256), 1.26, H(-2048), H(64), 0.60, H(64), 0xb89a58, 'dust2-ct-mid-crate-2', 0.08, 0.80),

    // ── B Site 货柜（B Doors 外侧）──
    box(H(1408), 0.30, H(-768), H(96), 0.96, H(64), 0x4a6e3a, 'dust2-b-shipping-container', 0.3, 0.55),

    // ── A Long 油桶堆 ──
    box(H(-3456), 0.28, H(4608), H(32), 0.56, H(32), 0x5a4830, 'dust2-a-long-drum-1', 0.4, 0.65),
    box(H(-3456), 0.28, H(4480), H(32), 0.56, H(32), 0x5a4830, 'dust2-a-long-drum-2', 0.4, 0.65),
    box(H(-3392), 0.28, H(4544), H(32), 0.56, H(32), 0x5a4830, 'dust2-a-long-drum-3', 0.4, 0.65),

    // ── Legacy non-Dust2 placeholder pillars ──
    box(H(-2816), 0, H(-3840), H(64), H(384), H(64), 0xc8bc98, 'dust2-palace-pillar-1', 0.04, 0.85),
    box(H(-2432), 0, H(-3840), H(64), H(384), H(64), 0xc8bc98, 'dust2-palace-pillar-2', 0.04, 0.85),
    box(H(-2816), H(384), H(-3840), H(96), H(32), H(96), 0xbaa888, 'dust2-palace-pillar-cap-1', 0.04, 0.86),
    box(H(-2432), H(384), H(-3840), H(96), H(32), H(96), 0xbaa888, 'dust2-palace-pillar-cap-2', 0.04, 0.86),

    // ── B Tunnels 隔断墙（增强洞道转折感）──
    box(H(3264), 0, H(-512), H(32), H(192), H(192), 0x8e7c6e, 'dust2-b-tunnel-partition-1', 0.05, 0.90),
    box(H(3264), 0, H(1024), H(32), H(192), H(192), 0x8e7c6e, 'dust2-b-tunnel-partition-2', 0.05, 0.90),
    box(H(3264), 0, H(2560), H(32), H(192), H(192), 0x8e7c6e, 'dust2-b-tunnel-partition-3', 0.05, 0.90),

    // ── T Spawn 前木箱 ──
    box(H(-256), 0.30, H(6272), H(64), 0.96, H(64), 0xc4a46b, 'dust2-t-spawn-crate-l', 0.08, 0.78),
    box(H(256), 0.30, H(6272), H(64), 0.96, H(64), 0xc4a46b, 'dust2-t-spawn-crate-r', 0.08, 0.78),

    // ── A Site A Ramp 护栏 ──
    box(H(-2944), 0.15, H(-1408), H(16), 0.48, H(512), 0x706050, 'dust2-a-ramp-railing-l', 0.5, 0.50),
    box(H(-2432), 0.15, H(-1408), H(16), 0.48, H(512), 0x706050, 'dust2-a-ramp-railing-r', 0.5, 0.50),

    // ── Upper Dark 箱子 ──
    box(H(3072), 0.30, H(-256), H(64), 0.96, H(64), 0x5a5a5a, 'dust2-upper-dark-crate-1', 0.08, 0.80),
    box(H(3328), 0.30, H(-256), H(64), 0.96, H(64), 0x5a5a5a, 'dust2-upper-dark-crate-2', 0.08, 0.80),
  ];
  const rawSourceMeshes = DUST2_WORLD_MESH_RESOURCE
    ? [meshSpecFromDust2WorldMeshResource(DUST2_WORLD_MESH_RESOURCE)]
    : [];
  const sourceMeshes = rawSourceMeshes.map(createNonWalkableCollisionMesh);
  const sourceGeometry = resolveDust2SourceGeometry(sourceMeshes, colliderBoxes, props);
  const fallbackPlayerSpawn = new THREE.Vector3(0, PLAYER_EYE_HEIGHT, H(-6144));
  const fallbackEnemySpawns = [
    { position: new THREE.Vector3(H(-2560), PLAYER_EYE_HEIGHT, H(1280)),  type: 'shooter' as const },
    { position: new THREE.Vector3(H( 2560), PLAYER_EYE_HEIGHT, H(1280)),  type: 'shooter' as const },
    { position: new THREE.Vector3(H(-3520), PLAYER_EYE_HEIGHT, H(-3072)), type: 'patrol' as const  },
    { position: new THREE.Vector3(H( 3328), PLAYER_EYE_HEIGHT, H(-2560)), type: 'assault' as const },
    { position: new THREE.Vector3(H(    0), PLAYER_EYE_HEIGHT, H(-1024)), type: 'shooter' as const },
    { position: new THREE.Vector3(H(    0), PLAYER_EYE_HEIGHT, H(-2048)), type: 'patrol' as const  },
    { position: new THREE.Vector3(H(-1536), PLAYER_EYE_HEIGHT, H( 1216)), type: 'assault' as const },
    { position: new THREE.Vector3(H( 1536), PLAYER_EYE_HEIGHT, H( 1216)), type: 'assault' as const },
  ];
  const sourceSpawns = resolveDust2SourceSpawns(
    DUST2_WORLD_MESH_RESOURCE,
    fallbackPlayerSpawn,
    fallbackEnemySpawns
  );
  const sourceBombSites = resolveDust2SourceBombSites(
    DUST2_WORLD_MESH_RESOURCE,
    {
      A: new THREE.Vector3(H(-2560), 0.04, H(1280)),
      B: new THREE.Vector3(H(2560), 0.04, H(1280)),
    }
  );

  return {
    name: 'Dust2',
    playerSpawn: sourceSpawns.playerSpawn,
    bounds: {
      width: DUST2_GAME_BOUNDS.width,
      depth: DUST2_GAME_BOUNDS.depth,
      centerZ: DUST2_GAME_BOUNDS.centerZ
    },
    enemySpawns: sourceSpawns.enemySpawns,
    bombSites: sourceBombSites,
    colliders: sourceGeometry.meshes.length > 0
      ? [
          ...createDust2SourceStabilityFloors(),
          ...createDust2SourceSafetyColliders(DUST2_WORLD_MESH_RESOURCE),
        ]
      : sourceGeometry.colliders,
    props: sourceGeometry.props,
    meshes: sourceGeometry.meshes,
    source: DUST2_WORLD_MESH_RESOURCE
      ? {
          sourceBacked: true,
          engine: 'goldsrc',
          kind: DUST2_WORLD_MESH_RESOURCE.source.kind,
          path: DUST2_WORLD_MESH_RESOURCE.source.path,
          sha256: DUST2_WORLD_MESH_RESOURCE.source.sha256,
        }
      : {
          sourceBacked: false,
          note: 'Dust2 is using legacy placeholder geometry until a legal CS1.6 de_dust2.bsp or de_dust2.map is imported.',
        },
    materialZones: [
      materialZone('dust2-sand',        'sand',     H(  0), 0, H(-1536), H(8192), 0.1, H(10240)),
      materialZone('dust2-concrete-a',  'concrete', H(-2688), 0.01, H(1280), H(1792), 0.1, H(1664)),
      materialZone('dust2-concrete-b',  'concrete', H( 2560), 0.01, H(1280), H(1792), 0.1, H(1664)),
      materialZone('dust2-plaster-cat', 'plaster',  H(-1536), 1.28, H(1216), H(384),  0.1, H(1152)),
      materialZone('dust2-concrete-ct', 'concrete', H(0),     0.01, H(3328), H(2048), 0.1, H(768)),
      materialZone('dust2-mid-sand',    'sand',     H(0),     0.01, H(-1024), H(1024), 0.1, H(2048)),
      materialZone('dust2-goose-plaster','plaster', H(-1984), 0.01, H(1600), H(256),  0.1, H(224)),
      materialZone('dust2-ct-mid-concrete','concrete', H(0),  0.01, H(1664), H(256),  0.1, H(512)),
      materialZone('dust2-b-tunnel-concrete', 'concrete', H(3264), 0.01, H(3072), H(576), 0.1, H(6144)),
      materialZone('dust2-upper-dark-stone',  'stone',    H(3072), 0.01, H(512),  H(320), 0.1, H(1536)),
      materialZone('dust2-b-site-plaster',    'plaster',  H(2560), 0.01, H(1280), H(640), 0.1, H(448)),
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
  overpass: buildOverpassArena(),
  bloodstrike: buildBloodStrikeArena()
};

// 运行时队伍选择出生点解析器（用于 main.ts）
export function getInfernoSpawnForTeam(preferredTeam: 't' | 'ct' | 'auto'): { playerSpawn: THREE.Vector3; enemySpawns: EnemySpawnPoint[] } {
  const fallbackPlayerSpawn = new THREE.Vector3(-12.8, 1.92, -20.48);
  const fallbackEnemySpawns: EnemySpawnPoint[] = [{ position: new THREE.Vector3(12.8, 1.92, -20.48), type: 'shooter' }];
  return resolveInfernoSourceSpawns(INFERNO_WORLD_MESH_RESOURCE, fallbackPlayerSpawn, fallbackEnemySpawns, preferredTeam);
}

export function getDust2SpawnForTeam(preferredTeam: 't' | 'ct' | 'auto'): { playerSpawn: THREE.Vector3; enemySpawns: EnemySpawnPoint[] } {
  const fallbackPlayerSpawn = new THREE.Vector3(-8.32, 1.92, 8.96);
  const fallbackEnemySpawns: EnemySpawnPoint[] = [{ position: new THREE.Vector3(4.48, -0.24, -24.64), type: 'shooter' }];
  return resolveDust2SourceSpawns(DUST2_WORLD_MESH_RESOURCE, fallbackPlayerSpawn, fallbackEnemySpawns, preferredTeam);
}
