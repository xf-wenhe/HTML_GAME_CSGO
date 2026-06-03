import fs from 'node:fs';

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
    throw new Error('Dust2 generated mesh resource is null; run dust2:import with a legal CS1.6 de_dust2.bsp first.');
  }

  if (resource.schema !== 'fps-web-game/dust2-world-mesh/v1') {
    throw new Error(`Unsupported Dust2 generated mesh schema: ${resource.schema}`);
  }

  if (resource.source?.engine !== 'goldsrc' || resource.source?.kind !== 'bsp' || resource.source?.version !== 30) {
    throw new Error('Dust2 generated mesh must be backed by a GoldSrc BSP30 source.');
  }

  const geometry = resource.source?.manifest?.geometry;
  if ((geometry?.worldMeshVertexCount ?? 0) <= 0 || (geometry?.worldMeshTriangleCount ?? 0) <= 0) {
    throw new Error('Dust2 generated mesh manifest is missing world mesh counts.');
  }

  if (!Array.isArray(geometry?.collision?.worldHullSummaries)) {
    throw new Error('Dust2 generated mesh manifest is missing collision hull summaries.');
  }

  const entities = resource.source?.manifest?.entities;
  if ((entities?.entityCount ?? 0) <= 0) {
    throw new Error('Dust2 generated mesh manifest is missing source entity data.');
  }

  const tSpawnCount = entities.playerSpawns?.filter(spawn => spawn.team === 't' && spawn.gamePosition).length ?? 0;
  const ctSpawnCount = entities.playerSpawns?.filter(spawn => spawn.team === 'ct' && spawn.gamePosition).length ?? 0;
  if (tSpawnCount <= 0 || ctSpawnCount <= 0) {
    throw new Error('Dust2 generated mesh manifest is missing source T/CT spawn entities.');
  }

  if (!Array.isArray(entities.bombTargets) || entities.bombTargets.length <= 0) {
    throw new Error('Dust2 generated mesh manifest is missing source bomb target entities.');
  }

  if (!Array.isArray(resource.mesh?.positions) || resource.mesh.positions.length !== geometry.worldMeshVertexCount) {
    throw new Error('Dust2 generated mesh positions do not match the source manifest vertex count.');
  }

  if (!Array.isArray(resource.mesh?.indices) || resource.mesh.indices.length !== geometry.worldMeshTriangleCount * 3) {
    throw new Error('Dust2 generated mesh indices do not match the source manifest triangle count.');
  }

  return {
    schema: resource.schema,
    sourcePath: resource.source.path,
    vertexCount: resource.mesh.positions.length,
    triangleCount: resource.mesh.indices.length / 3,
    hullCount: geometry.collision.worldHullSummaries.length,
    entityCount: entities.entityCount,
    tSpawnCount,
    ctSpawnCount,
    bombTargetCount: entities.bombTargets.length,
  };
}
