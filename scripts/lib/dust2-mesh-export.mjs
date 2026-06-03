import fs from 'node:fs';
import path from 'node:path';
import { createGoldSrcBspManifest, parseGoldSrcBspFile } from './goldsrc-bsp.mjs';

export const DEFAULT_DUST2_MESH_COLOR = 0xc8b898;

export function createDust2MeshResource(parsedBsp, { name = 'dust2-goldsrc-world-mesh', color = DEFAULT_DUST2_MESH_COLOR } = {}) {
  const mesh = parsedBsp.geometry.worldMesh;

  return {
    schema: 'fps-web-game/dust2-world-mesh/v1',
    source: {
      engine: parsedBsp.engine,
      kind: parsedBsp.kind,
      version: parsedBsp.version,
      path: parsedBsp.sourcePath,
      manifest: createGoldSrcBspManifest(parsedBsp),
    },
    mesh: {
      name,
      color,
      positions: mesh.positions.map(position => [position.x, position.y, position.z]),
      indices: mesh.indices,
      faceRanges: mesh.faceRanges,
    },
  };
}

export function writeDust2MeshResourceFromBsp(sourcePath, outPath, options = {}) {
  const parsedBsp = parseGoldSrcBspFile(sourcePath);
  const resource = createDust2MeshResource(parsedBsp, options);
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
