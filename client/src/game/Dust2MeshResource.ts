import * as THREE from 'three';
import type { MeshSpec } from './MapData.js';

export const DUST2_WORLD_MESH_SCHEMA = 'fps-web-game/dust2-world-mesh/v1';

export interface Dust2WorldMeshResource {
  schema: typeof DUST2_WORLD_MESH_SCHEMA;
  source: {
    engine: 'goldsrc';
    kind: 'bsp';
    version: number;
    path: string;
    manifest: {
      entities?: {
        entityCount?: number;
        classCounts?: Record<string, number>;
        playerSpawns?: Array<{
          entityIndex: number;
          classname: string;
          team: 'ct' | 't';
          hammerOrigin: { x: number; y: number; z: number } | null;
          gamePosition: { x: number; y: number; z: number } | null;
        }>;
        bombTargets?: Array<{
          entityIndex: number;
          classname: string;
          model: string | null;
          targetname: string | null;
          hammerOrigin?: { x: number; y: number; z: number } | null;
        }>;
      };
      geometry?: {
        worldMeshVertexCount?: number;
        worldMeshTriangleCount?: number;
        collision?: {
          worldHullSummaries?: unknown[];
        };
      };
    };
  };
  mesh: {
    name?: string;
    color: number;
    positions: Array<[number, number, number]>;
    indices: number[];
  };
}

export function meshSpecFromDust2WorldMeshResource(resource: Dust2WorldMeshResource): MeshSpec {
  validateDust2WorldMeshResource(resource);

  return {
    name: resource.mesh.name,
    color: resource.mesh.color,
    positions: resource.mesh.positions.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
    indices: [...resource.mesh.indices],
    roughness: 0.82,
    metalness: 0.04,
  };
}

export function validateDust2WorldMeshResource(resource: Dust2WorldMeshResource): void {
  if (resource.schema !== DUST2_WORLD_MESH_SCHEMA) {
    throw new Error(`Unsupported Dust2 world mesh schema: ${resource.schema}`);
  }

  if (resource.source?.engine !== 'goldsrc' || resource.source?.kind !== 'bsp' || resource.source?.version !== 30) {
    throw new Error('Dust2 world mesh resource must be generated from a GoldSrc BSP30 source.');
  }

  if (!resource.source.path || typeof resource.source.path !== 'string') {
    throw new Error('Dust2 world mesh resource must record the source BSP path.');
  }

  const geometryManifest = resource.source.manifest?.geometry;
  if (!geometryManifest || (geometryManifest.worldMeshVertexCount ?? 0) <= 0 || (geometryManifest.worldMeshTriangleCount ?? 0) <= 0) {
    throw new Error('Dust2 world mesh resource must include source geometry manifest counts.');
  }

  if (!Array.isArray(geometryManifest.collision?.worldHullSummaries)) {
    throw new Error('Dust2 world mesh resource must include source collision hull summaries.');
  }

  const entityManifest = resource.source.manifest?.entities;
  if (!entityManifest || (entityManifest.entityCount ?? 0) <= 0) {
    throw new Error('Dust2 world mesh resource must include source entity manifest data.');
  }

  const spawnCounts = {
    t: entityManifest.playerSpawns?.filter(spawn => spawn.team === 't' && spawn.gamePosition).length ?? 0,
    ct: entityManifest.playerSpawns?.filter(spawn => spawn.team === 'ct' && spawn.gamePosition).length ?? 0,
  };
  if (spawnCounts.t <= 0 || spawnCounts.ct <= 0) {
    throw new Error('Dust2 world mesh resource must include source T and CT player spawns.');
  }

  if (!Array.isArray(entityManifest.bombTargets) || entityManifest.bombTargets.length <= 0) {
    throw new Error('Dust2 world mesh resource must include source bomb target entities.');
  }

  if (!Array.isArray(resource.mesh.positions) || resource.mesh.positions.length === 0) {
    throw new Error('Dust2 world mesh resource must include at least one position.');
  }

  if (!Array.isArray(resource.mesh.indices) || resource.mesh.indices.length % 3 !== 0) {
    throw new Error('Dust2 world mesh indices must be an array of triangles.');
  }

  resource.mesh.positions.forEach((position, index) => {
    if (!Array.isArray(position) || position.length !== 3 || position.some(value => !Number.isFinite(value))) {
      throw new Error(`Dust2 world mesh position ${index} must be a finite [x, y, z] tuple.`);
    }
  });

  resource.mesh.indices.forEach((vertexIndex, index) => {
    if (!Number.isInteger(vertexIndex) || vertexIndex < 0 || vertexIndex >= resource.mesh.positions.length) {
      throw new Error(`Dust2 world mesh index ${index} references missing vertex ${vertexIndex}.`);
    }
  });
}
