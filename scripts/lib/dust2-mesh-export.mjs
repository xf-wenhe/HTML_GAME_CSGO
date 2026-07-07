import fs from 'node:fs';
import path from 'node:path';
import { classifyGoldSrcBrushEntity, combineModelMeshes, createGoldSrcBspManifest, parseBrushModelIndex, parseGoldSrcBspFile } from './goldsrc-bsp.mjs';
import { createGoldSrcMapManifest, parseGoldSrcMapFile } from './goldsrc-map.mjs';

export const DEFAULT_DUST2_MESH_COLOR = 0xc8b898;

export function createDust2MeshResource(parsedBsp, { name = 'dust2-goldsrc-world-mesh', color = DEFAULT_DUST2_MESH_COLOR } = {}) {
  if (parsedBsp.kind === 'map') {
    return createDust2MeshResourceFromMap(parsedBsp, { name, color });
  }

  const exportedModelIndexes = getRenderableBrushModelIndexes(parsedBsp);
  const collisionModelIndexes = getStructuralBrushModelIndexes(parsedBsp);
  const mesh = combineModelMeshes(parsedBsp.geometry.modelMeshes.filter(modelMesh => exportedModelIndexes.includes(modelMesh.modelIndex)));
  const collisionMesh = combineModelMeshes(parsedBsp.geometry.modelMeshes.filter(modelMesh => collisionModelIndexes.includes(modelMesh.modelIndex)));
  const collisionProxy = createCollisionProxy(collisionMesh, `${name}-proxy`);

  return {
    schema: 'fps-web-game/dust2-world-mesh/v1',
    source: {
      engine: parsedBsp.engine,
      kind: parsedBsp.kind,
      version: parsedBsp.version,
      path: parsedBsp.sourcePath,
      sha256: parsedBsp.sha256,
      manifest: createGoldSrcBspManifest(parsedBsp, {
        exportedMesh: mesh,
        exportedModelIndexes,
        collisionMesh,
        collisionModelIndexes,
      }),
    },
    mesh: {
      name,
      color,
      positions: mesh.positions.map(position => [position.x, position.y, position.z]),
      indices: mesh.indices,
      faceRanges: mesh.faceRanges,
      modelRanges: mesh.modelRanges,
    },
    collisionMesh: {
      name: `${name}-collision`,
      positions: collisionMesh.positions.map(position => [position.x, position.y, position.z]),
      indices: collisionMesh.indices,
      faceRanges: collisionMesh.faceRanges,
      modelRanges: collisionMesh.modelRanges,
    },
    collisionProxy,
  };
}

export function createDust2MeshResourceFromMap(parsedMap, { name = 'dust2-goldsrc-world-mesh', color = DEFAULT_DUST2_MESH_COLOR } = {}) {
  const exportedModelIndexes = [0];
  const mesh = parsedMap.geometry.combinedMesh;
  const collisionProxy = createCollisionProxy(mesh, `${name}-proxy`);

  return {
    schema: 'fps-web-game/dust2-world-mesh/v1',
    source: {
      engine: parsedMap.engine,
      kind: parsedMap.kind,
      version: parsedMap.version,
      path: parsedMap.sourcePath,
      sha256: parsedMap.sha256,
      manifest: createGoldSrcMapManifest(parsedMap, {
        exportedMesh: mesh,
        exportedModelIndexes,
        collisionMesh: mesh,
        collisionModelIndexes: exportedModelIndexes,
      }),
    },
    mesh: {
      name,
      color,
      positions: mesh.positions.map(position => [position.x, position.y, position.z]),
      indices: mesh.indices,
      faceRanges: mesh.faceRanges,
      modelRanges: mesh.modelRanges,
    },
    collisionProxy,
  };
}

export function createCollisionProxy(mesh, name = 'dust2-collision-proxy') {
  const bounds = computeMeshBounds(mesh.positions);
  const { floors, ramps } = buildWalkableProxy(mesh, `${name}-floor`, `${name}-ramp`, bounds);
  return {
    name,
    bounds,
    floors,
    ramps,
    walls: [],
  };
}

function buildWalkableProxy(mesh, floorNamePrefix, rampNamePrefix, bounds) {
  const floorCellSize = 0.48;
  const floorYStep = 0.16;
  const thickness = 0.12;
  const floorCells = new Map();
  const ramps = [];

  for (let i = 0; i < mesh.indices.length; i += 3) {
    const a = mesh.positions[mesh.indices[i]];
    const b = mesh.positions[mesh.indices[i + 1]];
    const c = mesh.positions[mesh.indices[i + 2]];
    if (!a || !b || !c) continue;

    const rawNormal = triangleNormal(a, b, c);
    if (!rawNormal || Math.abs(rawNormal.y) < 0.55) continue;
    const normal = rawNormal.y < 0
      ? { x: -rawNormal.x, y: -rawNormal.y, z: -rawNormal.z }
      : rawNormal;

    if (normal.y < 0.92) {
      ramps.push(createRampProxy(ramps.length, rampNamePrefix, a, b, c, normal));
      continue;
    }

    rasterizeWalkableTriangle(floorCells, a, b, c, normal, floorCellSize, floorYStep);
  }

  const floors = mergeWalkableCells(floorCells, floorNamePrefix, floorCellSize, thickness, 'floor', bounds);
  return { floors, ramps };
}

function rasterizeWalkableTriangle(cells, a, b, c, normal, cellSize, yStep) {
  const minX = Math.min(a.x, b.x, c.x);
  const maxX = Math.max(a.x, b.x, c.x);
  const minZ = Math.min(a.z, b.z, c.z);
  const maxZ = Math.max(a.z, b.z, c.z);
  const x0 = Math.floor(minX / cellSize);
  const x1 = Math.ceil(maxX / cellSize);
  const z0 = Math.floor(minZ / cellSize);
  const z1 = Math.ceil(maxZ / cellSize);

  for (let z = z0; z <= z1; z += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const centerX = (x + 0.5) * cellSize;
      const centerZ = (z + 0.5) * cellSize;
      if (!pointInTriangle2D(centerX, centerZ, a, b, c)) continue;
      const surfaceY = planeYAtXZ(centerX, centerZ, a, normal);
      if (!Number.isFinite(surfaceY)) continue;
      const yKey = Math.round(surfaceY / yStep);
      cells.set(`${yKey}:${z}:${x}`, { x, z, y: yKey * yStep });
    }
  }
}

function mergeWalkableCells(cells, namePrefix, cellSize, thickness, collisionKind, bounds) {
  const rows = new Map();
  for (const cell of cells.values()) {
    const key = `${cell.y}:${cell.z}`;
    const row = rows.get(key) ?? { y: cell.y, z: cell.z, xs: [] };
    row.xs.push(cell.x);
    rows.set(key, row);
  }

  const boxes = [];
  for (const row of rows.values()) {
    const xs = [...new Set(row.xs)].sort((left, right) => left - right);
    let start = xs[0];
    let prev = xs[0];
    const flush = () => {
      if (start === undefined || prev === undefined) return;
      const rawMinX = start * cellSize;
      const rawMaxX = (prev + 1) * cellSize;
      const rawMinZ = row.z * cellSize;
      const rawMaxZ = (row.z + 1) * cellSize;
      const minX = Math.max(rawMinX, bounds.mins[0]);
      const maxX = Math.min(rawMaxX, bounds.maxs[0]);
      const minZ = Math.max(rawMinZ, bounds.mins[2]);
      const maxZ = Math.min(rawMaxZ, bounds.maxs[2]);
      if (maxX - minX < 0.18 || maxZ - minZ < 0.18) return;
      boxes.push({
        name: `${namePrefix}-${boxes.length}`,
        position: [(minX + maxX) / 2, row.y - thickness / 2, (minZ + maxZ) / 2],
        size: [maxX - minX, thickness, maxZ - minZ],
        walkable: true,
        collisionKind,
      });
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
  }

  return boxes;
}

function createRampProxy(index, namePrefix, a, b, c, normal) {
  const minX = Math.min(a.x, b.x, c.x);
  const maxX = Math.max(a.x, b.x, c.x);
  const minY = Math.min(a.y, b.y, c.y);
  const maxY = Math.max(a.y, b.y, c.y);
  const minZ = Math.min(a.z, b.z, c.z);
  const maxZ = Math.max(a.z, b.z, c.z);
  return {
    name: `${namePrefix}-${index}`,
    position: [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2],
    size: [Math.max(0.01, maxX - minX), Math.max(0.01, maxY - minY), Math.max(0.01, maxZ - minZ)],
    walkable: false,
    collisionKind: 'ramp',
    normal: [normal.x, normal.y, normal.z],
  };
}

function planeYAtXZ(x, z, point, normal) {
  if (Math.abs(normal.y) <= 0.000001) return NaN;
  return point.y - (normal.x * (x - point.x) + normal.z * (z - point.z)) / normal.y;
}

function cellTouchesTriangle2D(cellX, cellZ, cellSize, a, b, c) {
  const minX = cellX * cellSize;
  const maxX = minX + cellSize;
  const minZ = cellZ * cellSize;
  const maxZ = minZ + cellSize;
  const centerX = minX + cellSize / 2;
  const centerZ = minZ + cellSize / 2;
  const samples = [
    [centerX, centerZ],
    [minX, minZ],
    [maxX, minZ],
    [minX, maxZ],
    [maxX, maxZ],
  ];
  if (samples.some(([x, z]) => pointInTriangle2D(x, z, a, b, c))) return true;
  return [a, b, c].some(point =>
    point.x >= minX && point.x <= maxX && point.z >= minZ && point.z <= maxZ
  );
}

function pointInTriangle2D(x, z, a, b, c) {
  const d1 = signedArea2D(x, z, a, b);
  const d2 = signedArea2D(x, z, b, c);
  const d3 = signedArea2D(x, z, c, a);
  const hasNegative = d1 < -0.000001 || d2 < -0.000001 || d3 < -0.000001;
  const hasPositive = d1 > 0.000001 || d2 > 0.000001 || d3 > 0.000001;
  return !(hasNegative && hasPositive);
}

function signedArea2D(x, z, left, right) {
  return (x - right.x) * (left.z - right.z) - (left.x - right.x) * (z - right.z);
}

function computeMeshBounds(positions) {
  if (!positions.length) {
    return { mins: [0, 0, 0], maxs: [0, 0, 0] };
  }
  const mins = { x: Infinity, y: Infinity, z: Infinity };
  const maxs = { x: -Infinity, y: -Infinity, z: -Infinity };
  for (const position of positions) {
    mins.x = Math.min(mins.x, position.x);
    mins.y = Math.min(mins.y, position.y);
    mins.z = Math.min(mins.z, position.z);
    maxs.x = Math.max(maxs.x, position.x);
    maxs.y = Math.max(maxs.y, position.y);
    maxs.z = Math.max(maxs.z, position.z);
  }
  return { mins: [mins.x, mins.y, mins.z], maxs: [maxs.x, maxs.y, maxs.z] };
}

function triangleNormal(a, b, c) {
  const ab = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
  const ac = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z };
  const normal = {
    x: ab.y * ac.z - ab.z * ac.y,
    y: ab.z * ac.x - ab.x * ac.z,
    z: ab.x * ac.y - ab.y * ac.x,
  };
  const length = Math.hypot(normal.x, normal.y, normal.z);
  if (length <= 0.000001) return null;
  normal.x /= length;
  normal.y /= length;
  normal.z /= length;
  return normal;
}

export function getRenderableBrushModelIndexes(parsedBsp) {
  const modelIndexes = new Set([0]);

  for (const entity of parsedBsp.entities) {
    const modelIndex = parseBrushModelIndex(entity.properties.model);
    const brushKind = classifyGoldSrcBrushEntity(entity.classname);
    if (modelIndex !== null && brushKind !== 'trigger') {
      modelIndexes.add(modelIndex);
    }
  }

  return [...modelIndexes].sort((left, right) => left - right);
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
