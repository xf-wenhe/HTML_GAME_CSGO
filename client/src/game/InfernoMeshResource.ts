import * as THREE from 'three';
import type { MeshSpec } from './MapData.js';

export const INFERNO_WORLD_MESH_SCHEMA = 'fps-web-game/inferno-world-mesh/v1';

export interface InfernoWorldMeshResource {
  schema: typeof INFERNO_WORLD_MESH_SCHEMA;
  source: {
    engine: 'goldsrc';
    kind: 'bsp' | 'map';
    version: number | null;
    path: string;
    sha256: string;
    manifest: {
      sha256?: string;
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
        exportedMeshVertexCount?: number;
        exportedMeshTriangleCount?: number;
        exportedModelIndexes?: number[];
        collisionMeshVertexCount?: number;
        collisionMeshTriangleCount?: number;
        collisionModelIndexes?: number[];
        modelMeshes?: Array<{
          modelIndex?: number;
          gameBounds?: {
            mins?: { x?: number; y?: number; z?: number };
            maxs?: { x?: number; y?: number; z?: number };
          } | null;
        }>;
        collision?: {
          worldHullSummaries?: unknown[];
          modelHullSummaries?: Array<{
            modelIndex?: number;
            hulls?: Array<{
              hull?: number;
              contents?: Record<string, number>;
              missingNodes?: number[];
              cycles?: number[];
            }>;
          }>;
          brushSolidCount?: number;
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
  collisionMesh?: {
    name?: string;
    positions: Array<[number, number, number]>;
    indices: number[];
  };
}

export function meshSpecFromInfernoWorldMeshResource(resource: InfernoWorldMeshResource): MeshSpec {
  validateInfernoWorldMeshResource(resource);

  return {
    name: resource.mesh.name,
    color: resource.mesh.color,
    positions: resource.mesh.positions.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
    indices: [...resource.mesh.indices],
    collisionPositions: (resource.collisionMesh?.positions ?? resource.mesh.positions).map(([x, y, z]) => new THREE.Vector3(x, y, z)),
    collisionIndices: [...(resource.collisionMesh?.indices ?? resource.mesh.indices)],
    roughness: 0.82,
    metalness: 0.04,
  };
}

export function validateInfernoWorldMeshResource(resource: InfernoWorldMeshResource): void {
  if (resource.schema !== INFERNO_WORLD_MESH_SCHEMA) {
    throw new Error(`Unsupported Inferno world mesh schema: ${resource.schema}`);
  }

  const sourceKind = resource.source?.kind;
  if (
    resource.source?.engine !== 'goldsrc'
    || (sourceKind !== 'bsp' && sourceKind !== 'map')
    || (sourceKind === 'bsp' && resource.source?.version !== 30)
  ) {
    throw new Error('Inferno world mesh resource must be generated from a GoldSrc BSP30 or MAP source.');
  }

  if (!resource.source.path || typeof resource.source.path !== 'string') {
    throw new Error('Inferno world mesh resource must record the source path.');
  }

  if (!resource.source.path.toLowerCase().endsWith(`/de_inferno.${sourceKind}`) && resource.source.path.toLowerCase() !== `de_inferno.${sourceKind}`) {
    throw new Error(`Inferno world mesh source path must be named de_inferno.${sourceKind}.`);
  }

  if (!/^[a-f0-9]{64}$/i.test(resource.source.sha256)) {
    throw new Error('Inferno world mesh resource must include a source SHA-256 fingerprint.');
  }

  if (resource.source.manifest?.sha256 !== resource.source.sha256) {
    throw new Error('Inferno world mesh source SHA-256 must match the source manifest.');
  }

  const geometryManifest = resource.source.manifest?.geometry;
  if (!geometryManifest || (geometryManifest.worldMeshVertexCount ?? 0) <= 0 || (geometryManifest.worldMeshTriangleCount ?? 0) <= 0) {
    throw new Error('Inferno world mesh resource must include source geometry manifest counts.');
  }

  if ((geometryManifest.exportedMeshVertexCount ?? 0) <= 0 || (geometryManifest.exportedMeshTriangleCount ?? 0) <= 0) {
    throw new Error('Inferno world mesh resource must include exported BSP model mesh counts.');
  }

  if ((geometryManifest.collisionMeshVertexCount ?? geometryManifest.exportedMeshVertexCount ?? 0) <= 0 || (geometryManifest.collisionMeshTriangleCount ?? geometryManifest.exportedMeshTriangleCount ?? 0) <= 0) {
    throw new Error('Inferno world mesh resource must include collision mesh counts.');
  }

  if (!Array.isArray(geometryManifest.modelMeshes) || geometryManifest.modelMeshes.length <= 0) {
    throw new Error('Inferno world mesh resource must include BSP model mesh manifests.');
  }

  if (!Array.isArray(geometryManifest.exportedModelIndexes) || !geometryManifest.exportedModelIndexes.includes(0)) {
    throw new Error('Inferno world mesh resource must include exported BSP model indexes with world model 0.');
  }

  if (!Array.isArray(geometryManifest.collision?.worldHullSummaries)) {
    throw new Error('Inferno world mesh resource must include source collision hull summaries.');
  }

  if (!Array.isArray(geometryManifest.collision?.modelHullSummaries)) {
    throw new Error('Inferno world mesh resource must include per-model collision hull summaries.');
  }

  const exportedModelIndexes = new Set(geometryManifest.collisionModelIndexes ?? geometryManifest.exportedModelIndexes);
  const exportedHullSummaries = geometryManifest.collision.modelHullSummaries.filter(summary =>
    typeof summary.modelIndex === 'number' && exportedModelIndexes.has(summary.modelIndex)
  );
  if (exportedHullSummaries.length !== exportedModelIndexes.size) {
    throw new Error('Inferno world mesh resource must include collision hull summaries for every exported BSP model.');
  }

  for (const summary of exportedHullSummaries) {
    if (!summary.hulls?.some(hull => (hull.contents?.solid ?? 0) > 0)) {
      throw new Error(`Inferno world mesh exported model ${summary.modelIndex} must include solid collision hull contents.`);
    }
  }

  if (sourceKind === 'map' && (geometryManifest.collision.brushSolidCount ?? 0) <= 0) {
    throw new Error('Inferno world mesh MAP resource must include solid brush collision evidence.');
  }

  const entityManifest = resource.source.manifest?.entities;
  if (!entityManifest || (entityManifest.entityCount ?? 0) <= 0) {
    throw new Error('Inferno world mesh resource must include source entity manifest data.');
  }

  const spawnCounts = {
    t: entityManifest.playerSpawns?.filter(spawn => spawn.team === 't' && spawn.gamePosition).length ?? 0,
    ct: entityManifest.playerSpawns?.filter(spawn => spawn.team === 'ct' && spawn.gamePosition).length ?? 0,
  };
  if (spawnCounts.t <= 0 || spawnCounts.ct <= 0) {
    throw new Error('Inferno world mesh resource must include source T and CT player spawns.');
  }

  if (!Array.isArray(entityManifest.bombTargets) || entityManifest.bombTargets.length < 2) {
    throw new Error('Inferno world mesh resource must include source A/B bomb target entities.');
  }

  if (!Array.isArray(resource.mesh.positions) || resource.mesh.positions.length === 0) {
    throw new Error('Inferno world mesh resource must include at least one position.');
  }

  if (resource.mesh.positions.length !== geometryManifest.exportedMeshVertexCount) {
    throw new Error('Inferno world mesh positions must match exported BSP model mesh vertex count.');
  }

  if (!Array.isArray(resource.mesh.indices) || resource.mesh.indices.length % 3 !== 0) {
    throw new Error('Inferno world mesh indices must be an array of triangles.');
  }

  if (resource.mesh.indices.length !== geometryManifest.exportedMeshTriangleCount * 3) {
    throw new Error('Inferno world mesh indices must match exported BSP model mesh triangle count.');
  }

  const collisionMesh = resource.collisionMesh ?? resource.mesh;
  const collisionVertexCount = geometryManifest.collisionMeshVertexCount ?? geometryManifest.exportedMeshVertexCount;
  const collisionTriangleCount = geometryManifest.collisionMeshTriangleCount ?? geometryManifest.exportedMeshTriangleCount;
  if (!Array.isArray(collisionMesh.positions) || collisionMesh.positions.length !== collisionVertexCount) {
    throw new Error('Inferno world mesh collision positions must match source collision mesh vertex count.');
  }
  if (!Array.isArray(collisionMesh.indices) || collisionMesh.indices.length !== collisionTriangleCount * 3) {
    throw new Error('Inferno world mesh collision indices must match source collision mesh triangle count.');
  }

  resource.mesh.positions.forEach((position, index) => {
    if (!Array.isArray(position) || position.length !== 3 || position.some(value => !Number.isFinite(value))) {
      throw new Error(`Inferno world mesh position ${index} must be a finite [x, y, z] tuple.`);
    }
  });

  resource.mesh.indices.forEach((vertexIndex, index) => {
    if (!Number.isInteger(vertexIndex) || vertexIndex < 0 || vertexIndex >= resource.mesh.positions.length) {
      throw new Error(`Inferno world mesh index ${index} is out of bounds for position count.`);
    }
  });
}
