import fs from 'node:fs';
import crypto from 'node:crypto';
import {
  buildTriangleMeshFromPolygons,
  classifyGoldSrcBrushEntity,
  hammerVectorToGame,
  parseHammerOrigin,
  summarizeGoldSrcEntities,
} from './goldsrc-bsp.mjs';

const EPSILON = 0.001;
const BASE_POLYGON_SIZE = 65536;

export function parseGoldSrcMapFile(sourcePath) {
  const source = fs.readFileSync(sourcePath, 'utf8');
  return parseGoldSrcMapSource(source, { sourcePath });
}

export function parseGoldSrcMapSource(source, { sourcePath = '<source>' } = {}) {
  const entities = parseGoldSrcMapEntities(source, sourcePath);
  const geometry = buildGoldSrcMapGeometry(entities);

  return {
    kind: 'map',
    engine: 'goldsrc',
    version: null,
    sourcePath,
    size: Buffer.byteLength(source),
    sha256: crypto.createHash('sha256').update(source).digest('hex'),
    entitiesText: source,
    entities: entities.map(({ brushes, ...entity }) => entity),
    mapEntities: entities,
    geometry,
  };
}

export function createGoldSrcMapManifest(parsedMap, { exportedMesh = parsedMap.geometry.combinedMesh, exportedModelIndexes = [0] } = {}) {
  return {
    kind: parsedMap.kind,
    engine: parsedMap.engine,
    version: parsedMap.version,
    path: parsedMap.sourcePath,
    size: parsedMap.size,
    sha256: parsedMap.sha256,
    entityBytes: parsedMap.entitiesText.length,
    entities: summarizeGoldSrcMapEntities(parsedMap.mapEntities),
    worldspawnPresent: parsedMap.mapEntities.some(entity => entity.classname === 'worldspawn'),
    geometry: {
      vertexCount: parsedMap.geometry.vertexCount,
      planeCount: parsedMap.geometry.planeCount,
      brushCount: parsedMap.geometry.brushes.length,
      structuralBrushCount: parsedMap.geometry.structuralBrushes.length,
      triggerBrushCount: parsedMap.geometry.triggerBrushes.length,
      polygonCount: parsedMap.geometry.polygons.length,
      worldPolygonCount: parsedMap.geometry.worldPolygons.length,
      worldMeshVertexCount: parsedMap.geometry.worldMesh.positions.length,
      worldMeshTriangleCount: parsedMap.geometry.worldMesh.indices.length / 3,
      modelCount: 1,
      exportedMeshVertexCount: exportedMesh.positions.length,
      exportedMeshTriangleCount: exportedMesh.indices.length / 3,
      exportedModelIndexes,
      modelMeshes: [{
        modelIndex: 0,
        brushCount: parsedMap.geometry.structuralBrushes.length,
        faceCount: parsedMap.geometry.polygons.length,
        vertexCount: exportedMesh.positions.length,
        triangleCount: exportedMesh.indices.length / 3,
      }],
      worldModel: {
        mins: parsedMap.geometry.bounds.mins,
        maxs: parsedMap.geometry.bounds.maxs,
        origin: { x: 0, y: 0, z: 0 },
        headnodes: [],
        firstFace: 0,
        faceCount: parsedMap.geometry.polygons.length,
        gameBounds: {
          mins: hammerVectorToGame(parsedMap.geometry.bounds.mins),
          maxs: hammerVectorToGame(parsedMap.geometry.bounds.maxs),
        },
      },
      collision: {
        brushSolidCount: parsedMap.geometry.structuralBrushes.length,
        worldHullSummaries: [{
          hull: 0,
          headnode: null,
          nodeCount: parsedMap.geometry.structuralBrushes.length,
          contents: { solid: parsedMap.geometry.structuralBrushes.length },
          missingNodes: [],
          cycles: [],
        }],
        modelHullSummaries: [{
          modelIndex: 0,
          hulls: [{
            hull: 0,
            headnode: null,
            nodeCount: parsedMap.geometry.structuralBrushes.length,
            contents: { solid: parsedMap.geometry.structuralBrushes.length },
            missingNodes: [],
            cycles: [],
          }],
        }],
      },
    },
  };
}

export function parseGoldSrcMapEntities(source, sourcePath = '<source>') {
  const entities = [];
  let depth = 0;
  let currentEntity = null;
  let currentBrush = null;

  source.split(/\r?\n/).forEach((rawLine, lineIndex) => {
    const line = stripLineComment(rawLine).trim();
    if (!line) return;

    if (line === '{') {
      if (depth === 0) {
        currentEntity = {
          index: entities.length,
          classname: '',
          properties: {},
          brushes: [],
        };
      } else if (depth === 1 && currentEntity) {
        currentBrush = {
          entityIndex: currentEntity.index,
          brushIndex: currentEntity.brushes.length,
          planes: [],
        };
      } else {
        throw new Error(`Unsupported nested MAP block at ${sourcePath}:${lineIndex + 1}.`);
      }
      depth += 1;
      return;
    }

    if (line === '}') {
      if (depth === 2 && currentEntity && currentBrush) {
        currentEntity.brushes.push(currentBrush);
        currentBrush = null;
      } else if (depth === 1 && currentEntity) {
        currentEntity.classname = currentEntity.properties.classname ?? '';
        entities.push(currentEntity);
        currentEntity = null;
      } else {
        throw new Error(`Unexpected MAP block close at ${sourcePath}:${lineIndex + 1}.`);
      }
      depth -= 1;
      return;
    }

    if (depth === 1 && currentEntity) {
      const property = line.match(/^"([^"]*)"\s+"([^"]*)"$/);
      if (property) {
        currentEntity.properties[property[1]] = property[2];
        return;
      }
      throw new Error(`Unsupported MAP entity line at ${sourcePath}:${lineIndex + 1}: ${line}`);
    }

    if (depth === 2 && currentBrush) {
      currentBrush.planes.push(parseMapBrushPlane(line, sourcePath, lineIndex + 1));
      return;
    }

    throw new Error(`Unexpected MAP content at ${sourcePath}:${lineIndex + 1}: ${line}`);
  });

  if (depth !== 0) {
    throw new Error(`Unclosed MAP block in ${sourcePath}.`);
  }

  return entities;
}

function parseMapBrushPlane(line, sourcePath, lineNumber) {
  const match = line.match(/^\(\s*([^)]+?)\s*\)\s*\(\s*([^)]+?)\s*\)\s*\(\s*([^)]+?)\s*\)\s+(\S+)/);
  if (!match) {
    throw new Error(`Invalid MAP brush plane at ${sourcePath}:${lineNumber}: ${line}`);
  }

  const points = [parseMapVector(match[1]), parseMapVector(match[2]), parseMapVector(match[3])];
  const normal = normalize(cross(sub(points[1], points[0]), sub(points[2], points[0])));
  if (!normal) {
    throw new Error(`Degenerate MAP brush plane at ${sourcePath}:${lineNumber}: ${line}`);
  }

  return {
    lineNumber,
    points,
    texture: match[4],
    normal,
    distance: dot(normal, points[0]),
  };
}

function parseMapVector(source) {
  const values = source.trim().split(/\s+/).map(Number);
  if (values.length !== 3 || values.some(value => !Number.isFinite(value))) {
    throw new Error(`Invalid MAP vector: ${source}`);
  }
  return { x: values[0], y: values[1], z: values[2] };
}

function buildGoldSrcMapGeometry(entities) {
  const brushes = [];
  const structuralBrushes = [];
  const triggerBrushes = [];
  const worldPolygons = [];
  const structuralPolygons = [];
  let vertexCount = 0;
  let planeCount = 0;

  for (const entity of entities) {
    const brushKind = entity.classname === 'worldspawn' ? 'structural' : classifyGoldSrcBrushEntity(entity.classname);
    for (const brush of entity.brushes) {
      const meshBrush = {
        entityIndex: entity.index,
        brushIndex: brush.brushIndex,
        classname: entity.classname,
        brushKind,
        planes: brush.planes,
        polygons: buildBrushPolygons(brush, `${entity.index}:${brush.brushIndex}`),
      };

      brushes.push(meshBrush);
      planeCount += brush.planes.length;
      vertexCount += brush.planes.length * 3;

      if (brushKind === 'trigger') {
        triggerBrushes.push(meshBrush);
      } else if (brushKind === 'structural') {
        structuralBrushes.push(meshBrush);
        structuralPolygons.push(...meshBrush.polygons);
        if (entity.classname === 'worldspawn') {
          worldPolygons.push(...meshBrush.polygons);
        }
      }
    }
  }

  const worldMesh = buildTriangleMeshFromPolygons(worldPolygons);
  const combinedMesh = buildTriangleMeshFromPolygons(structuralPolygons);

  return {
    brushes,
    structuralBrushes,
    triggerBrushes,
    polygons: structuralPolygons,
    worldPolygons,
    worldMesh,
    combinedMesh: {
      ...combinedMesh,
      modelRanges: [{
        modelIndex: 0,
        firstVertex: 0,
        vertexCount: combinedMesh.positions.length,
        firstIndex: 0,
        indexCount: combinedMesh.indices.length,
      }],
    },
    vertexCount,
    planeCount,
    bounds: computeBounds(structuralPolygons.flatMap(polygon => polygon.positions)),
  };
}

function buildBrushPolygons(brush, brushLabel) {
  const polygons = buildBrushPolygonsWithOrientation(brush, 1, brushLabel);
  if (polygons.length > 0) {
    return polygons;
  }
  return buildBrushPolygonsWithOrientation(brush, -1, brushLabel);
}

function buildBrushPolygonsWithOrientation(brush, orientation, brushLabel) {
  const planes = brush.planes.map(plane => ({
    ...plane,
    normal: mul(plane.normal, orientation),
    distance: plane.distance * orientation,
  }));
  const polygons = [];

  planes.forEach((plane, planeIndex) => {
    let polygon = createLargePolygonOnPlane(plane);
    planes.forEach((clipPlane, clipIndex) => {
      if (clipIndex !== planeIndex && polygon.length > 0) {
        polygon = clipPolygonBehindPlane(polygon, clipPlane);
      }
    });

    const cleaned = dedupePolygon(polygon);
    if (cleaned.length >= 3) {
      polygons.push({
        faceIndex: `${brushLabel}:${planeIndex}`,
        brushIndex: brush.brushIndex,
        planeIndex,
        positions: cleaned,
        gamePositions: cleaned.map(point => hammerVectorToGame(point)),
      });
    }
  });

  return polygons;
}

function createLargePolygonOnPlane(plane) {
  const center = mul(plane.normal, plane.distance);
  const tangentSeed = Math.abs(plane.normal.z) < 0.9 ? { x: 0, y: 0, z: 1 } : { x: 0, y: 1, z: 0 };
  const u = normalize(cross(tangentSeed, plane.normal));
  const v = normalize(cross(plane.normal, u));
  const size = BASE_POLYGON_SIZE;

  return [
    add(add(center, mul(u, -size)), mul(v, -size)),
    add(add(center, mul(u, size)), mul(v, -size)),
    add(add(center, mul(u, size)), mul(v, size)),
    add(add(center, mul(u, -size)), mul(v, size)),
  ];
}

function clipPolygonBehindPlane(polygon, plane) {
  const result = [];

  for (let i = 0; i < polygon.length; i += 1) {
    const current = polygon[i];
    const next = polygon[(i + 1) % polygon.length];
    const currentDistance = dot(plane.normal, current) - plane.distance;
    const nextDistance = dot(plane.normal, next) - plane.distance;
    const currentInside = currentDistance <= EPSILON;
    const nextInside = nextDistance <= EPSILON;

    if (currentInside && nextInside) {
      result.push(next);
    } else if (currentInside && !nextInside) {
      result.push(intersectSegmentPlane(current, next, currentDistance, nextDistance));
    } else if (!currentInside && nextInside) {
      result.push(intersectSegmentPlane(current, next, currentDistance, nextDistance), next);
    }
  }

  return result;
}

function intersectSegmentPlane(a, b, aDistance, bDistance) {
  const t = aDistance / (aDistance - bDistance);
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}

function dedupePolygon(polygon) {
  const cleaned = [];
  for (const point of polygon) {
    const previous = cleaned[cleaned.length - 1];
    if (!previous || distance(previous, point) > EPSILON) {
      cleaned.push(point);
    }
  }
  if (cleaned.length > 1 && distance(cleaned[0], cleaned[cleaned.length - 1]) <= EPSILON) {
    cleaned.pop();
  }
  return cleaned;
}

function summarizeGoldSrcMapEntities(entities) {
  const summarized = summarizeGoldSrcEntities(entities.map(({ brushes, ...entity }) => entity));
  const brushEntities = [];

  for (const entity of entities) {
    const brushKind = entity.classname === 'worldspawn' ? 'structural' : classifyGoldSrcBrushEntity(entity.classname);
    entity.brushes.forEach(brush => {
      if (entity.classname !== 'worldspawn') {
        brushEntities.push({
          entityIndex: entity.index,
          classname: entity.classname,
          model: null,
          modelIndex: null,
          brushIndex: brush.brushIndex,
          brushKind,
          targetname: entity.properties.targetname ?? null,
        });
      }
    });
  }

  return {
    ...summarized,
    playerSpawns: summarized.playerSpawns.map(spawn => ({
      ...spawn,
      hammerOrigin: parseHammerOrigin(entities[spawn.entityIndex]?.properties.origin),
    })),
    brushEntities,
  };
}

function stripLineComment(line) {
  const commentIndex = line.indexOf('//');
  return commentIndex >= 0 ? line.slice(0, commentIndex) : line;
}

function computeBounds(points) {
  if (points.length === 0) {
    return { mins: { x: 0, y: 0, z: 0 }, maxs: { x: 0, y: 0, z: 0 } };
  }

  return points.reduce((bounds, point) => ({
    mins: {
      x: Math.min(bounds.mins.x, point.x),
      y: Math.min(bounds.mins.y, point.y),
      z: Math.min(bounds.mins.z, point.z),
    },
    maxs: {
      x: Math.max(bounds.maxs.x, point.x),
      y: Math.max(bounds.maxs.y, point.y),
      z: Math.max(bounds.maxs.z, point.z),
    },
  }), {
    mins: { ...points[0] },
    maxs: { ...points[0] },
  });
}

function add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function sub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function mul(a, value) {
  return { x: a.x * value, y: a.y * value, z: a.z * value };
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function length(a) {
  return Math.hypot(a.x, a.y, a.z);
}

function normalize(a) {
  const vectorLength = length(a);
  return vectorLength > EPSILON ? mul(a, 1 / vectorLength) : null;
}

function distance(a, b) {
  return length(sub(a, b));
}
