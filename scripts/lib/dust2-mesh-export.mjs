import fs from 'node:fs';
import path from 'node:path';
import { classifyGoldSrcBrushEntity, combineModelMeshes, createGoldSrcBspManifest, parseBrushModelIndex, parseGoldSrcBspFile } from './goldsrc-bsp.mjs';
import { createGoldSrcMapManifest, parseGoldSrcMapFile } from './goldsrc-map.mjs';

export const DEFAULT_DUST2_MESH_COLOR = 0xc8b898;

export function createDust2MeshResource(parsedBsp, { name = 'dust2-goldsrc-world-mesh', color = DEFAULT_DUST2_MESH_COLOR } = {}) {
  if (parsedBsp.kind === 'map') {
    return createDust2MeshResourceFromMap(parsedBsp, { name, color });
  }

  const exportedModelIndexes = getStructuralBrushModelIndexes(parsedBsp);
  const mesh = combineModelMeshes(parsedBsp.geometry.modelMeshes.filter(modelMesh => exportedModelIndexes.includes(modelMesh.modelIndex)));

  return {
    schema: 'fps-web-game/dust2-world-mesh/v1',
    source: {
      engine: parsedBsp.engine,
      kind: parsedBsp.kind,
      version: parsedBsp.version,
      path: parsedBsp.sourcePath,
      sha256: parsedBsp.sha256,
      manifest: createGoldSrcBspManifest(parsedBsp, { exportedMesh: mesh, exportedModelIndexes }),
    },
    mesh: {
      name,
      color,
      positions: mesh.positions.map(position => [position.x, position.y, position.z]),
      indices: mesh.indices,
      faceRanges: mesh.faceRanges,
      modelRanges: mesh.modelRanges,
    },
  };
}

export function createDust2MeshResourceFromMap(parsedMap, { name = 'dust2-goldsrc-world-mesh', color = DEFAULT_DUST2_MESH_COLOR } = {}) {
  const exportedModelIndexes = [0];
  const mesh = parsedMap.geometry.combinedMesh;

  return {
    schema: 'fps-web-game/dust2-world-mesh/v1',
    source: {
      engine: parsedMap.engine,
      kind: parsedMap.kind,
      version: parsedMap.version,
      path: parsedMap.sourcePath,
      sha256: parsedMap.sha256,
      manifest: createGoldSrcMapManifest(parsedMap, { exportedMesh: mesh, exportedModelIndexes }),
    },
    mesh: {
      name,
      color,
      positions: mesh.positions.map(position => [position.x, position.y, position.z]),
      indices: mesh.indices,
      faceRanges: mesh.faceRanges,
      modelRanges: mesh.modelRanges,
    },
  };
}

export function getStructuralBrushModelIndexes(parsedBsp) {
  const modelIndexes = new Set([0]);

  for (const entity of parsedBsp.entities) {
    const modelIndex = parseBrushModelIndex(entity.properties.model);
    if (modelIndex !== null && classifyGoldSrcBrushEntity(entity.classname) === 'structural') {
      modelIndexes.add(modelIndex);
    }
  }

  return [...modelIndexes].sort((left, right) => left - right);
}

export function writeDust2MeshResourceFromBsp(sourcePath, outPath, options = {}) {
  const parsedBsp = parseGoldSrcBspFile(sourcePath);
  const resource = createDust2MeshResource(parsedBsp, options);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(resource, null, 2)}\n`);
  return resource;
}

export function writeDust2MeshResourceFromMap(sourcePath, outPath, options = {}) {
  const parsedMap = parseGoldSrcMapFile(sourcePath);
  const resource = createDust2MeshResource(parsedMap, options);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(resource, null, 2)}\n`);
  return resource;
}

export function createDust2MeshResourceModule(resource) {
  return [
    "import type { Dust2WorldMeshResource } from '../Dust2MeshResource.js';",
    '',
    'export const DUST2_WORLD_MESH_RESOURCE: Dust2WorldMeshResource | null =',
    `${JSON.stringify(resource, null, 2)};`,
    '',
  ].join('\n');
}

export function writeDust2MeshResourceModuleFromBsp(sourcePath, outPath, options = {}) {
  const parsedBsp = parseGoldSrcBspFile(sourcePath);
  const resource = createDust2MeshResource(parsedBsp, options);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, createDust2MeshResourceModule(resource));
  return resource;
}

export function writeDust2MeshResourceModuleFromMap(sourcePath, outPath, options = {}) {
  const parsedMap = parseGoldSrcMapFile(sourcePath);
  const resource = createDust2MeshResource(parsedMap, options);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, createDust2MeshResourceModule(resource));
  return resource;
}
