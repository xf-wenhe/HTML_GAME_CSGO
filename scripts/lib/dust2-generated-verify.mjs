import fs from 'node:fs';
import path from 'node:path';

export function readDust2GeneratedMeshResource(modulePath) {
  const source = fs.readFileSync(modulePath, 'utf8');
  return parseDust2GeneratedMeshModule(source);
}

export function parseDust2GeneratedMeshModule(source) {
  const match = source.match(/export\s+const\s+DUST2_WORLD_MESH_RESOURCE[\s\S]*?=\s*([\s\S]*);\s*$/);
  if (!match) {
    throw new Error('Generated Dust2 mesh module does not export DUST2_WORLD_MESH_RESOURCE.');
  }

  const valueSource = match[1].trim();
  if (valueSource === 'null') {
    return null;
  }

  try {
    return JSON.parse(valueSource);
  } catch (error) {
    throw new Error(`Generated Dust2 mesh module does not contain valid JSON resource: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function verifyDust2GeneratedMeshResource(resource) {
  if (!resource) {
    throw new Error('Dust2 generated mesh resource is null; run dust2:import with a legal CS1.6 de_dust2.bsp or de_dust2.map first.');
  }

  if (resource.schema !== 'fps-web-game/dust2-world-mesh/v1') {
    throw new Error(`Unsupported Dust2 generated mesh schema: ${resource.schema}`);
  }

  const sourceKind = resource.source?.kind;
  if (
    resource.source?.engine !== 'goldsrc'
    || !['bsp', 'map'].includes(sourceKind)
    || (sourceKind === 'bsp' && resource.source?.version !== 30)
  ) {
    throw new Error('Dust2 generated mesh must be backed by a GoldSrc BSP30 or MAP source.');
  }

  if (path.basename(resource.source.path ?? '').toLowerCase() !== `de_dust2.${sourceKind}`) {
    throw new Error(`Dust2 generated mesh source path must be named de_dust2.${sourceKind}.`);
  }

  if (!/^[a-f0-9]{64}$/i.test(resource.source.sha256 ?? '')) {
    throw new Error('Dust2 generated mesh source must include a SHA-256 fingerprint.');
  }

  if (resource.source.manifest?.sha256 !== resource.source.sha256) {
    throw new Error('Dust2 generated mesh source SHA-256 does not match the source manifest.');
  }

  const geometry = resource.source?.manifest?.geometry;
  if ((geometry?.worldMeshVertexCount ?? 0) <= 0 || (geometry?.worldMeshTriangleCount ?? 0) <= 0) {
    throw new Error('Dust2 generated mesh manifest is missing world mesh counts.');
  }

  if ((geometry?.exportedMeshVertexCount ?? 0) <= 0 || (geometry?.exportedMeshTriangleCount ?? 0) <= 0) {
    throw new Error('Dust2 generated mesh manifest is missing exported BSP model mesh counts.');
  }

  if ((geometry?.collisionMeshVertexCount ?? geometry?.exportedMeshVertexCount ?? 0) <= 0 || (geometry?.collisionMeshTriangleCount ?? geometry?.exportedMeshTriangleCount ?? 0) <= 0) {
    throw new Error('Dust2 generated mesh manifest is missing collision mesh counts.');
  }

  if (!Array.isArray(geometry?.modelMeshes) || geometry.modelMeshes.length <= 0) {
    throw new Error('Dust2 generated mesh manifest is missing BSP model mesh manifests.');
  }

  if (!Array.isArray(geometry?.collision?.worldHullSummaries)) {
    throw new Error('Dust2 generated mesh manifest is missing collision hull summaries.');
  }

  if (!Array.isArray(geometry?.collision?.modelHullSummaries)) {
    throw new Error('Dust2 generated mesh manifest is missing per-model collision hull summaries.');
  }

  assertExportedModelHullIntegrity(geometry, sourceKind);

  const entities = resource.source?.manifest?.entities;
  if ((entities?.entityCount ?? 0) <= 0) {
    throw new Error('Dust2 generated mesh manifest is missing source entity data.');
  }

  const tSpawnCount = entities.playerSpawns?.filter(spawn => spawn.team === 't' && spawn.gamePosition).length ?? 0;
  const ctSpawnCount = entities.playerSpawns?.filter(spawn => spawn.team === 'ct' && spawn.gamePosition).length ?? 0;
  if (tSpawnCount <= 0 || ctSpawnCount <= 0) {
    throw new Error('Dust2 generated mesh manifest is missing source T/CT spawn entities.');
  }

  if (!Array.isArray(entities.bombTargets) || entities.bombTargets.length < 2) {
    throw new Error('Dust2 generated mesh manifest is missing source A/B bomb target entities.');
  }

  if (!Array.isArray(resource.mesh?.positions) || resource.mesh.positions.length !== geometry.exportedMeshVertexCount) {
    throw new Error('Dust2 generated mesh positions do not match the exported BSP model mesh vertex count.');
  }

  if (!Array.isArray(resource.mesh?.indices) || resource.mesh.indices.length !== geometry.exportedMeshTriangleCount * 3) {
    throw new Error('Dust2 generated mesh indices do not match the exported BSP model mesh triangle count.');
  }

  const collisionMesh = resource.collisionMesh ?? resource.mesh;
  const collisionVertexCount = geometry.collisionMeshVertexCount ?? geometry.exportedMeshVertexCount;
  const collisionTriangleCount = geometry.collisionMeshTriangleCount ?? geometry.exportedMeshTriangleCount;
  if (!Array.isArray(collisionMesh.positions) || collisionMesh.positions.length !== collisionVertexCount) {
    throw new Error('Dust2 generated collision mesh positions do not match the source collision mesh vertex count.');
  }

  if (!Array.isArray(collisionMesh.indices) || collisionMesh.indices.length !== collisionTriangleCount * 3) {
    throw new Error('Dust2 generated collision mesh indices do not match the source collision mesh triangle count.');
  }

  if (!resource.collisionProxy || !Array.isArray(resource.collisionProxy.floors) || resource.collisionProxy.floors.length <= 0) {
    throw new Error('Dust2 generated mesh is missing source-derived walkable collision proxy floors.');
  }

  return {
    schema: resource.schema,
    sourcePath: resource.source.path,
    vertexCount: resource.mesh.positions.length,
    triangleCount: resource.mesh.indices.length / 3,
    hullCount: geometry.collision.worldHullSummaries.length,
    modelMeshCount: geometry.modelMeshes.length,
    exportedModelCount: geometry.exportedModelIndexes.length,
    collisionModelCount: (geometry.collisionModelIndexes ?? geometry.exportedModelIndexes).length,
    entityCount: entities.entityCount,
    tSpawnCount,
    ctSpawnCount,
    bombTargetCount: entities.bombTargets.length,
  };
}

function assertExportedModelHullIntegrity(geometry, sourceKind) {
  const exportedModelIndexes = new Set(geometry.collisionModelIndexes ?? geometry.exportedModelIndexes);
  const exportedHullSummaries = geometry.collision.modelHullSummaries.filter(summary => exportedModelIndexes.has(summary.modelIndex));

  if (exportedHullSummaries.length !== exportedModelIndexes.size) {
    throw new Error('Dust2 generated mesh manifest is missing collision summaries for exported source models.');
  }

  for (const modelSummary of exportedHullSummaries) {
    for (const hull of modelSummary.hulls ?? []) {
      if ((hull.missingNodes?.length ?? 0) > 0 || (hull.cycles?.length ?? 0) > 0) {
        throw new Error(`Dust2 generated mesh collision hull ${hull.hull} for model ${modelSummary.modelIndex} has unresolved clipnode references.`);
      }
    }

    if (!modelSummary.hulls?.some(hull => (hull.contents?.solid ?? 0) > 0)) {
      throw new Error(`Dust2 generated mesh exported model ${modelSummary.modelIndex} has no solid collision hull contents.`);
    }
  }

  if (sourceKind === 'map' && (geometry.collision?.brushSolidCount ?? 0) <= 0) {
    throw new Error('Dust2 generated MAP mesh manifest is missing solid brush collision evidence.');
  }
}
