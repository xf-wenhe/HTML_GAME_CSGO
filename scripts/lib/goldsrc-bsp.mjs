import fs from 'node:fs';
import crypto from 'node:crypto';
import { GOLD_SRC_BSP_VERSION } from './dust2-source-preflight.mjs';

export const GOLD_SRC_BSP_LUMP_NAMES = [
  'entities',
  'planes',
  'textures',
  'vertices',
  'visibility',
  'nodes',
  'textureInfo',
  'faces',
  'lighting',
  'clipNodes',
  'leaves',
  'markSurfaces',
  'edges',
  'surfaceEdges',
  'models',
];

export const GOLD_SRC_BSP_LUMP_COUNT = GOLD_SRC_BSP_LUMP_NAMES.length;
export const GOLD_SRC_BSP_HEADER_BYTES = 4 + GOLD_SRC_BSP_LUMP_COUNT * 8;
export const GOLD_SRC_BSP_STRUCT_SIZES = {
  plane: 20,
  vertex: 12,
  clipNode: 8,
  edge: 4,
  surfEdge: 4,
  face: 20,
  model: 64,
};

export const GOLD_SRC_CONTENTS = {
  [-1]: 'empty',
  [-2]: 'solid',
  [-3]: 'water',
  [-4]: 'slime',
  [-5]: 'lava',
  [-6]: 'sky',
  [-7]: 'origin',
  [-8]: 'clip',
  [-9]: 'current_0',
  [-10]: 'current_90',
  [-11]: 'current_180',
  [-12]: 'current_270',
  [-13]: 'current_up',
  [-14]: 'current_down',
  [-15]: 'translucent',
};

export function parseGoldSrcBspBuffer(buffer, { sourcePath = '<buffer>' } = {}) {
  if (buffer.length < GOLD_SRC_BSP_HEADER_BYTES) {
    throw new Error(`BSP header is truncated: ${sourcePath} has ${buffer.length} bytes.`);
  }

  const version = buffer.readInt32LE(0);
  if (version !== GOLD_SRC_BSP_VERSION) {
    throw new Error(`Not a GoldSrc BSP v${GOLD_SRC_BSP_VERSION}: ${sourcePath} has BSP version ${version}.`);
  }

  const lumps = GOLD_SRC_BSP_LUMP_NAMES.map((name, index) => {
    const headerOffset = 4 + index * 8;
    const offset = buffer.readInt32LE(headerOffset);
    const length = buffer.readInt32LE(headerOffset + 4);

    if (offset < 0 || length < 0) {
      throw new Error(`BSP lump "${name}" has negative offset/length in ${sourcePath}.`);
    }

    if (offset + length > buffer.length) {
      throw new Error(`BSP lump "${name}" extends beyond file bounds in ${sourcePath}.`);
    }

    return {
      index,
      name,
      offset,
      length,
    };
  });

  return {
    kind: 'bsp',
    engine: 'goldsrc',
    version,
    sourcePath,
    size: buffer.length,
    sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
    lumps,
    entitiesText: readEntityLump(buffer, lumps[0]),
    entities: parseGoldSrcEntities(readEntityLump(buffer, lumps[0])),
    geometry: parseGoldSrcGeometry(buffer, lumps),
  };
}

export function parseGoldSrcBspFile(sourcePath) {
  return parseGoldSrcBspBuffer(fs.readFileSync(sourcePath), { sourcePath });
}

export function createGoldSrcBspManifest(parsedBsp, {
  exportedMesh = parsedBsp.geometry.combinedMesh,
  exportedModelIndexes = parsedBsp.geometry.modelMeshes.map(modelMesh => modelMesh.modelIndex),
  collisionMesh = exportedMesh,
  collisionModelIndexes = exportedModelIndexes,
} = {}) {
  return {
    kind: parsedBsp.kind,
    engine: parsedBsp.engine,
    version: parsedBsp.version,
    path: parsedBsp.sourcePath,
    size: parsedBsp.size,
    sha256: parsedBsp.sha256,
    lumps: parsedBsp.lumps.map(lump => ({
      index: lump.index,
      name: lump.name,
      offset: lump.offset,
      length: lump.length,
    })),
    entityBytes: parsedBsp.entitiesText.length,
    entities: summarizeGoldSrcEntities(parsedBsp.entities),
    worldspawnPresent: /"classname"\s+"worldspawn"/.test(parsedBsp.entitiesText),
    geometry: createGeometryManifest(parsedBsp.geometry, { exportedMesh, exportedModelIndexes, collisionMesh, collisionModelIndexes }),
  };
}

export function hammerVectorToGame({ x, y, z }, scale = 0.01) {
  return {
    x: x * scale,
    y: z * scale,
    z: -y * scale,
  };
}

export function hammerPlaneToGame({ normal, distance }, scale = 0.01) {
  return {
    normal: {
      x: normal.x,
      y: normal.z,
      z: -normal.y,
    },
    distance: distance * scale,
  };
}

export function describeGoldSrcClipChild(child) {
  return child < 0
    ? { kind: 'contents', value: child, contents: GOLD_SRC_CONTENTS[child] ?? 'unknown' }
    : { kind: 'node', value: child };
}

function readEntityLump(buffer, lump) {
  if (!lump || lump.length === 0) {
    return '';
  }

  return buffer
    .subarray(lump.offset, lump.offset + lump.length)
    .toString('latin1')
    .replace(/\0+$/g, '');
}

export function parseGoldSrcEntities(entitiesText) {
  const entities = [];
  const entityPattern = /\{([\s\S]*?)\}/g;
  let match;

  while ((match = entityPattern.exec(entitiesText)) !== null) {
    const properties = {};
    const propertyPattern = /"([^"]*)"\s+"([^"]*)"/g;
    let propertyMatch;

    while ((propertyMatch = propertyPattern.exec(match[1])) !== null) {
      properties[propertyMatch[1]] = propertyMatch[2];
    }

    if (Object.keys(properties).length > 0) {
      entities.push({
        index: entities.length,
        classname: properties.classname ?? '',
        properties,
      });
    }
  }

  return entities;
}

export function parseHammerOrigin(origin) {
  if (typeof origin !== 'string') {
    return null;
  }

  const parts = origin.trim().split(/\s+/).map(Number);
  if (parts.length !== 3 || parts.some(value => !Number.isFinite(value))) {
    return null;
  }

  return { x: parts[0], y: parts[1], z: parts[2] };
}

export function summarizeGoldSrcEntities(entities) {
  const classCounts = {};
  const playerSpawns = [];
  const bombTargets = [];
  const brushEntities = [];

  for (const entity of entities) {
    const classname = entity.classname || '<missing>';
    classCounts[classname] = (classCounts[classname] ?? 0) + 1;
    const modelIndex = parseBrushModelIndex(entity.properties.model);

    if (modelIndex !== null) {
      brushEntities.push({
        entityIndex: entity.index,
        classname,
        model: entity.properties.model,
        modelIndex,
        brushKind: classifyGoldSrcBrushEntity(classname),
        targetname: entity.properties.targetname ?? null,
      });
    }

    if (classname === 'info_player_start' || classname === 'info_player_deathmatch') {
      const hammerOrigin = parseHammerOrigin(entity.properties.origin);
      playerSpawns.push({
        entityIndex: entity.index,
        classname,
        team: classname === 'info_player_start' ? 'ct' : 't',
        hammerOrigin,
        gamePosition: hammerOrigin ? hammerVectorToGame(hammerOrigin) : null,
      });
    }

    if (classname === 'func_bomb_target' || classname === 'info_bomb_target') {
      bombTargets.push({
        entityIndex: entity.index,
        classname,
        model: entity.properties.model ?? null,
        targetname: entity.properties.targetname ?? null,
        hammerOrigin: parseHammerOrigin(entity.properties.origin),
      });
    }
  }

  return {
    entityCount: entities.length,
    classCounts,
    playerSpawns,
    bombTargets,
    brushEntities,
  };
}

export function parseBrushModelIndex(model) {
  if (typeof model !== 'string') {
    return null;
  }

  const match = model.match(/^\*(\d+)$/);
  return match ? Number(match[1]) : null;
}

export function classifyGoldSrcBrushEntity(classname) {
  if (classname.startsWith('trigger_')) {
    return 'trigger';
  }

  if ([
    'func_bomb_target',
    'func_buyzone',
    'func_escapezone',
    'func_hostage_rescue',
    'func_ladder',
    'func_vip_safetyzone',
  ].includes(classname)) {
    return 'trigger';
  }

  if ([
    'func_breakable',
    'func_door',
    'func_door_rotating',
    'func_train',
    'func_wall',
    'func_wall_toggle',
  ].includes(classname)) {
    return 'structural';
  }

  return 'unknown';
}

function parseGoldSrcGeometry(buffer, lumps) {
  const planes = readStructArray(buffer, lumps[1], GOLD_SRC_BSP_STRUCT_SIZES.plane, readPlane);
  const vertices = readStructArray(buffer, lumps[3], GOLD_SRC_BSP_STRUCT_SIZES.vertex, readVertex);
  const faces = readStructArray(buffer, lumps[7], GOLD_SRC_BSP_STRUCT_SIZES.face, readFace);
  const clipNodes = readStructArray(buffer, lumps[9], GOLD_SRC_BSP_STRUCT_SIZES.clipNode, readClipNode);
  const edges = readStructArray(buffer, lumps[12], GOLD_SRC_BSP_STRUCT_SIZES.edge, readEdge);
  const surfaceEdges = readStructArray(buffer, lumps[13], GOLD_SRC_BSP_STRUCT_SIZES.surfEdge, readSurfaceEdge);
  const models = readStructArray(buffer, lumps[14], GOLD_SRC_BSP_STRUCT_SIZES.model, readModel);
  const facePolygons = buildFacePolygons({ vertices, edges, surfaceEdges, faces });
  const modelMeshes = buildModelMeshes(facePolygons, models);
  const worldFacePolygons = modelMeshes[0]?.facePolygons ?? [];
  const worldMesh = buildTriangleMeshFromPolygons(worldFacePolygons);
  const combinedMesh = combineModelMeshes(modelMeshes);
  const modelHullSummaries = models.map(model => ({
    modelIndex: model.index,
    headnodes: model.headnodes,
    hulls: model.headnodes.map((headnode, hull) => summarizeClipTree(clipNodes, headnode, hull)),
  }));
  const worldHullSummaries = modelHullSummaries[0]?.hulls ?? [];

  return {
    planes,
    vertices,
    clipNodes,
    edges,
    surfaceEdges,
    faces,
    facePolygons,
    worldFacePolygons,
    worldMesh,
    modelMeshes,
    combinedMesh,
    collision: {
      planes,
      clipNodes,
      worldHeadnodes: models[0]?.headnodes ?? [],
      worldHullSummaries,
      modelHullSummaries,
    },
    models,
    worldModel: models[0] ?? null,
  };
}

function createGeometryManifest(geometry, { exportedMesh, exportedModelIndexes, collisionMesh, collisionModelIndexes }) {
  return {
    vertexCount: geometry.vertices.length,
    planeCount: geometry.planes.length,
    clipNodeCount: geometry.clipNodes.length,
    edgeCount: geometry.edges.length,
    surfaceEdgeCount: geometry.surfaceEdges.length,
    faceCount: geometry.faces.length,
    polygonCount: geometry.facePolygons.length,
    worldPolygonCount: geometry.worldFacePolygons.length,
    worldMeshVertexCount: geometry.worldMesh.positions.length,
    worldMeshTriangleCount: geometry.worldMesh.indices.length / 3,
    modelCount: geometry.models.length,
    exportedMeshVertexCount: exportedMesh.positions.length,
    exportedMeshTriangleCount: exportedMesh.indices.length / 3,
    exportedModelIndexes,
    collisionMeshVertexCount: collisionMesh.positions.length,
    collisionMeshTriangleCount: collisionMesh.indices.length / 3,
    collisionModelIndexes,
    modelMeshes: geometry.modelMeshes.map(modelMesh => ({
      modelIndex: modelMesh.modelIndex,
      faceCount: modelMesh.facePolygons.length,
      vertexCount: modelMesh.mesh.positions.length,
      triangleCount: modelMesh.mesh.indices.length / 3,
      firstFace: modelMesh.model.firstFace,
      modelFaceCount: modelMesh.model.faceCount,
      origin: modelMesh.model.origin,
      gameOrigin: hammerVectorToGame(modelMesh.model.origin),
      gameBounds: createMeshBounds(modelMesh.mesh.positions),
    })),
    worldModel: geometry.worldModel
      ? {
          mins: geometry.worldModel.mins,
          maxs: geometry.worldModel.maxs,
          origin: geometry.worldModel.origin,
          headnodes: geometry.worldModel.headnodes,
          firstFace: geometry.worldModel.firstFace,
          faceCount: geometry.worldModel.faceCount,
          gameBounds: {
            mins: hammerVectorToGame(geometry.worldModel.mins),
            maxs: hammerVectorToGame(geometry.worldModel.maxs),
          },
        }
      : null,
    collision: {
      worldHullSummaries: geometry.collision.worldHullSummaries,
      modelHullSummaries: geometry.collision.modelHullSummaries,
    },
  };
}

export function buildFacePolygons({ vertices, edges, surfaceEdges, faces }) {
  return faces.map(face => {
    const vertexIndices = [];
    const positions = [];
    const gamePositions = [];

    for (let i = 0; i < face.edgeCount; i += 1) {
      const surfaceEdge = surfaceEdges[face.firstSurfaceEdge + i];
      if (!surfaceEdge) {
        throw new Error(`Face ${face.index} references missing surfedge ${face.firstSurfaceEdge + i}.`);
      }

      const edge = edges[Math.abs(surfaceEdge.edgeIndex)];
      if (!edge) {
        throw new Error(`Face ${face.index} references missing edge ${surfaceEdge.edgeIndex}.`);
      }

      const vertexIndex = surfaceEdge.edgeIndex >= 0 ? edge.vertices[0] : edge.vertices[1];
      const vertex = vertices[vertexIndex];
      if (!vertex) {
        throw new Error(`Face ${face.index} references missing vertex ${vertexIndex}.`);
      }

      vertexIndices.push(vertexIndex);
      positions.push(vertex.position);
      gamePositions.push(hammerVectorToGame(vertex.position));
    }

    return {
      faceIndex: face.index,
      vertexIndices,
      positions,
      gamePositions,
    };
  });
}

function createMeshBounds(positions) {
  if (!positions.length) {
    return null;
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

  return { mins, maxs };
}

export function buildTriangleMeshFromPolygons(polygons) {
  const positions = [];
  const indices = [];
  const faceRanges = [];

  for (const polygon of polygons) {
    const startVertex = positions.length;
    const startIndex = indices.length;

    positions.push(...polygon.gamePositions);

    for (let i = 1; i < polygon.gamePositions.length - 1; i += 1) {
      indices.push(startVertex, startVertex + i, startVertex + i + 1);
    }

    faceRanges.push({
      faceIndex: polygon.faceIndex,
      firstVertex: startVertex,
      vertexCount: polygon.gamePositions.length,
      firstIndex: startIndex,
      indexCount: indices.length - startIndex,
    });
  }

  return {
    positions,
    indices,
    faceRanges,
  };
}

export function summarizeClipTree(clipNodes, headnode, hull = 0) {
  const summary = {
    hull,
    headnode,
    nodeCount: 0,
    contents: {},
    missingNodes: [],
    cycles: [],
  };
  const visited = new Set();

  visitClipChild(headnode);
  return summary;

  function visitClipChild(child) {
    const ref = describeGoldSrcClipChild(child);
    if (ref.kind === 'contents') {
      summary.contents[ref.contents] = (summary.contents[ref.contents] ?? 0) + 1;
      return;
    }

    if (visited.has(ref.value)) {
      summary.cycles.push(ref.value);
      return;
    }

    const node = clipNodes[ref.value];
    if (!node) {
      summary.missingNodes.push(ref.value);
      return;
    }

    visited.add(ref.value);
    summary.nodeCount += 1;
    node.children.forEach(visitClipChild);
  }
}

function buildWorldFacePolygons(facePolygons, worldModel) {
  if (!worldModel) {
    return [];
  }

  const firstFace = worldModel.firstFace;
  const lastFaceExclusive = firstFace + worldModel.faceCount;
  return facePolygons.filter(polygon => polygon.faceIndex >= firstFace && polygon.faceIndex < lastFaceExclusive);
}

function buildModelMeshes(facePolygons, models) {
  return models.map((model, modelIndex) => {
    const firstFace = model.firstFace;
    const lastFaceExclusive = firstFace + model.faceCount;
    const modelFacePolygons = facePolygons.filter(polygon => polygon.faceIndex >= firstFace && polygon.faceIndex < lastFaceExclusive);

    return {
      modelIndex,
      model,
      facePolygons: modelFacePolygons,
      mesh: buildTriangleMeshFromPolygons(modelFacePolygons),
    };
  });
}

export function combineModelMeshes(modelMeshes) {
  const positions = [];
  const indices = [];
  const faceRanges = [];
  const modelRanges = [];

  for (const modelMesh of modelMeshes) {
    const firstVertex = positions.length;
    const firstIndex = indices.length;

    positions.push(...modelMesh.mesh.positions);
    indices.push(...modelMesh.mesh.indices.map(index => firstVertex + index));
    faceRanges.push(...modelMesh.mesh.faceRanges.map(range => ({
      ...range,
      firstVertex: range.firstVertex + firstVertex,
      firstIndex: range.firstIndex + firstIndex,
      modelIndex: modelMesh.modelIndex,
    })));
    modelRanges.push({
      modelIndex: modelMesh.modelIndex,
      firstVertex,
      vertexCount: modelMesh.mesh.positions.length,
      firstIndex,
      indexCount: modelMesh.mesh.indices.length,
    });
  }

  return {
    positions,
    indices,
    faceRanges,
    modelRanges,
  };
}

function readStructArray(buffer, lump, structSize, reader) {
  if (lump.length === 0) {
    return [];
  }

  if (lump.length % structSize !== 0) {
    throw new Error(`BSP lump "${lump.name}" length ${lump.length} is not divisible by struct size ${structSize}.`);
  }

  const count = lump.length / structSize;
  return Array.from({ length: count }, (_, index) => reader(buffer, lump.offset + index * structSize, index));
}

function readVector(buffer, offset) {
  return {
    x: buffer.readFloatLE(offset),
    y: buffer.readFloatLE(offset + 4),
    z: buffer.readFloatLE(offset + 8),
  };
}

function readVertex(buffer, offset, index) {
  return {
    index,
    position: readVector(buffer, offset),
  };
}

function readPlane(buffer, offset, index) {
  const normal = readVector(buffer, offset);
  const distance = buffer.readFloatLE(offset + 12);
  const gamePlane = hammerPlaneToGame({ normal, distance });

  return {
    index,
    normal,
    distance,
    gameNormal: gamePlane.normal,
    gameDistance: gamePlane.distance,
    type: buffer.readInt32LE(offset + 16),
  };
}

function readClipNode(buffer, offset, index) {
  const children = [buffer.readInt16LE(offset + 4), buffer.readInt16LE(offset + 6)];
  return {
    index,
    planeIndex: buffer.readInt32LE(offset),
    children,
    childRefs: children.map(describeGoldSrcClipChild),
  };
}

function readEdge(buffer, offset, index) {
  return {
    index,
    vertices: [buffer.readUInt16LE(offset), buffer.readUInt16LE(offset + 2)],
  };
}

function readSurfaceEdge(buffer, offset, index) {
  return {
    index,
    edgeIndex: buffer.readInt32LE(offset),
  };
}

function readFace(buffer, offset, index) {
  return {
    index,
    planeIndex: buffer.readUInt16LE(offset),
    planeSide: buffer.readUInt16LE(offset + 2),
    firstSurfaceEdge: buffer.readUInt32LE(offset + 4),
    edgeCount: buffer.readUInt16LE(offset + 8),
    textureInfoIndex: buffer.readUInt16LE(offset + 10),
    styles: [
      buffer.readUInt8(offset + 12),
      buffer.readUInt8(offset + 13),
      buffer.readUInt8(offset + 14),
      buffer.readUInt8(offset + 15),
    ],
    lightmapOffset: buffer.readInt32LE(offset + 16),
  };
}

function readModel(buffer, offset, index) {
  return {
    index,
    mins: readVector(buffer, offset),
    maxs: readVector(buffer, offset + 12),
    origin: readVector(buffer, offset + 24),
    headnodes: [
      buffer.readInt32LE(offset + 36),
      buffer.readInt32LE(offset + 40),
      buffer.readInt32LE(offset + 44),
      buffer.readInt32LE(offset + 48),
    ],
    visLeafs: buffer.readInt32LE(offset + 52),
    firstFace: buffer.readInt32LE(offset + 56),
    faceCount: buffer.readInt32LE(offset + 60),
  };
}
