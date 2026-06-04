#!/usr/bin/env node
import {
  readDust2GeneratedMeshResource,
  verifyDust2GeneratedMeshResource,
} from './lib/dust2-generated-verify.mjs';

const GENERATED_RESOURCE_PATH = process.env.DUST2_GENERATED_MODULE ?? 'client/src/game/generated/dust2-world-mesh.ts';
const GRID = 0.02;
const MAX_START_DISTANCE = 2.6;
const MIN_WALKABLE_NORMAL_Y = 0.28;
const MAX_SHARED_EDGE_Y_DELTA = 1.1;
const NEAR_TRIANGLE_RADIUS = 0.72;
const NEAR_TRIANGLE_Y_DELTA = 0.9;

const ROUTES = [
  {
    name: 'T Spawn -> Long Doors -> A Long/Pit -> A Cross -> A Site',
    points: [
      p(-8.32, 7.04, 'T Spawn'),
      p(-17.18, -9.39, 'Long Doors', 1.43),
      p(-19.4, -18.5, 'A Long / Pit', 0),
      p(-16.4, -23.8, 'A Cross / Ramp', 0),
      p(-15.36, -26.88, 'A Site', 0),
    ],
  },
  {
    name: 'T Spawn -> Top Mid -> Xbox -> Catwalk/Short -> A Site',
    points: [
      p(-8.32, 7.04, 'T Spawn'),
      p(-5.8, 3.8, 'Top Mid', 1.3),
      p(-7.5, -8.8, 'Xbox', 1.28),
      p(-9.6, -15.1, 'Catwalk / Short', 0),
      p(-15.36, -26.88, 'A Site', 0),
    ],
  },
  {
    name: 'T Spawn -> Upper/Lower Tunnels -> B Site',
    points: [
      p(-8.32, 7.04, 'T Spawn'),
      p(5.2, -5.1, 'Lower Tunnels', 1.1),
      p(12.8, -1.5, 'Upper Tunnels', -1.92),
      p(11.2, -23.6, 'B Tunnel Exit', 0.96),
      p(11.52, -24.64, 'B Site', 0.96),
    ],
  },
  {
    name: 'Top Mid -> Lower Tunnels -> Upper Tunnels',
    points: [
      p(-5.8, 3.8, 'Top Mid', 1.3),
      p(5.2, -5.1, 'Lower Tunnels', 1.1),
      p(12.8, -1.5, 'Upper Tunnels', -1.92),
    ],
  },
  {
    name: 'CT Spawn -> Mid Doors -> CT Mid',
    points: [
      p(2.56, -22.4, 'CT Spawn', -0.88),
      p(-3.2, -11.8, 'Mid Doors', -1.0),
      p(-1.0, -19.0, 'CT Mid', -0.88),
    ],
  },
  {
    name: 'CT Spawn -> B Doors / B Window -> B Site',
    points: [
      p(2.56, -22.4, 'CT Spawn', -0.88),
      p(7.0, -21.2, 'B Doors / Window', -0.88),
      p(11.52, -24.64, 'B Site', 0.96),
    ],
  },
  {
    name: 'CT Spawn -> A Ramp -> A Site',
    points: [
      p(2.56, -22.4, 'CT Spawn', -0.88),
      p(-13.8, -25.2, 'A Ramp', 0),
      p(-15.36, -26.88, 'A Site', 0),
    ],
  },
];

main();

function main() {
  const resource = readDust2GeneratedMeshResource(GENERATED_RESOURCE_PATH);
  const summary = verifyDust2GeneratedMeshResource(resource);
  const mesh = resource.collisionMesh ?? resource.mesh;
  const nav = buildWalkableGraph(mesh);
  const results = ROUTES.map(route => verifyRoute(nav, route));
  const failed = results.filter(result => !result.passed);

  console.log(JSON.stringify({
    sourcePath: summary.sourcePath,
    walkableTriangleCount: nav.triangles.length,
    walkableComponentCount: nav.componentCount,
    routes: results,
  }, null, 2));

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

function buildWalkableGraph(mesh) {
  const positions = mesh.positions.map(([x, y, z]) => ({ x, y, z }));
  const triangles = [];
  const edgeMap = new Map();

  for (let i = 0; i < mesh.indices.length; i += 3) {
    const indexes = [mesh.indices[i], mesh.indices[i + 1], mesh.indices[i + 2]];
    const verts = indexes.map(index => positions[index]);
    const normal = triangleNormal(verts);
    if (Math.abs(normal.y) < MIN_WALKABLE_NORMAL_Y) {
      continue;
    }

    const tri = {
      id: triangles.length,
      sourceIndex: i / 3,
      indexes,
      verts,
      center: {
        x: (verts[0].x + verts[1].x + verts[2].x) / 3,
        y: (verts[0].y + verts[1].y + verts[2].y) / 3,
        z: (verts[0].z + verts[1].z + verts[2].z) / 3,
      },
      neighbors: new Set(),
    };
    triangles.push(tri);

    for (const edge of [[verts[0], verts[1]], [verts[1], verts[2]], [verts[2], verts[0]]]) {
      const key = edgeKey(edge[0], edge[1]);
      const existing = edgeMap.get(key) ?? [];
      for (const other of existing) {
        const yDelta = Math.abs(other.center.y - tri.center.y);
        if (yDelta <= MAX_SHARED_EDGE_Y_DELTA) {
          tri.neighbors.add(other.id);
          other.neighbors.add(tri.id);
        }
      }
      existing.push(tri);
      edgeMap.set(key, existing);
    }
  }

  const components = assignComponents(triangles);
  connectNearbyTriangles(triangles);
  const relaxedComponents = assignComponents(triangles);
  return {
    positions,
    triangles,
    components: relaxedComponents,
    componentCount: new Set(relaxedComponents).size,
  };
}

function verifyRoute(nav, route) {
  const resolved = route.points.map(point => ({
    ...point,
    triangle: findNearestWalkableTriangle(nav.triangles, point),
  }));
  const missing = resolved.filter(point => !point.triangle || point.triangle.distance > MAX_START_DISTANCE);
  const segments = [];

  for (let i = 0; i < resolved.length - 1; i += 1) {
    const from = resolved[i];
    const to = resolved[i + 1];
    const segment = {
      from: from.label,
      to: to.label,
      passed: false,
      component: null,
    };
    if (from.triangle && to.triangle) {
      const fromComponent = nav.components[from.triangle.id];
      const toComponent = nav.components[to.triangle.id];
      segment.component = fromComponent;
      segment.passed = fromComponent === toComponent;
    }
    segments.push(segment);
  }

  return {
    name: route.name,
    passed: missing.length === 0 && segments.every(segment => segment.passed),
    points: resolved.map(point => ({
      label: point.label,
      x: point.x,
      z: point.z,
      nearestDistance: point.triangle ? round(point.triangle.distance) : null,
      nearest3dDistance: point.triangle ? round(point.triangle.distance3d) : null,
      nearestY: point.triangle ? round(point.triangle.center.y) : null,
      component: point.triangle ? nav.components[point.triangle.id] : null,
      nearestMainComponent: findNearestInComponent(nav, point, 0),
    })),
    missing: missing.map(point => point.label),
    segments,
  };
}

function findNearestInComponent(nav, point, component) {
  let nearest = null;
  for (const triangle of nav.triangles) {
    if (nav.components[triangle.id] !== component) {
      continue;
    }
    const distance = Math.hypot(triangle.center.x - point.x, triangle.center.z - point.z);
    const yDistance = typeof point.y === 'number' ? Math.abs(triangle.center.y - point.y) : 0;
    const distance3d = Math.hypot(distance, yDistance);
    if (!nearest || distance3d < nearest.distance3d) {
      nearest = {
        x: round(triangle.center.x),
        y: round(triangle.center.y),
        z: round(triangle.center.z),
        distance: round(distance),
        distance3d: round(distance3d),
      };
    }
  }
  return nearest;
}

function assignComponents(triangles) {
  const components = new Array(triangles.length).fill(-1);
  let component = 0;

  for (const triangle of triangles) {
    if (components[triangle.id] !== -1) {
      continue;
    }
    const queue = [triangle.id];
    components[triangle.id] = component;
    for (let index = 0; index < queue.length; index += 1) {
      const current = triangles[queue[index]];
      for (const neighbor of current.neighbors) {
        if (components[neighbor] === -1) {
          components[neighbor] = component;
          queue.push(neighbor);
        }
      }
    }
    component += 1;
  }

  return components;
}

function connectNearbyTriangles(triangles) {
  const buckets = new Map();
  const bucketSize = NEAR_TRIANGLE_RADIUS;

  for (const triangle of triangles) {
    const key = bucketKey(triangle.center, bucketSize);
    const bucket = buckets.get(key) ?? [];
    bucket.push(triangle);
    buckets.set(key, bucket);
  }

  for (const triangle of triangles) {
    const { bx, bz } = bucketCoords(triangle.center, bucketSize);
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dz = -1; dz <= 1; dz += 1) {
        const bucket = buckets.get(`${bx + dx},${bz + dz}`);
        if (!bucket) {
          continue;
        }
        for (const other of bucket) {
          if (other.id === triangle.id) {
            continue;
          }
          if (Math.abs(other.center.y - triangle.center.y) > NEAR_TRIANGLE_Y_DELTA) {
            continue;
          }
          const distance = Math.hypot(other.center.x - triangle.center.x, other.center.z - triangle.center.z);
          if (distance <= NEAR_TRIANGLE_RADIUS) {
            triangle.neighbors.add(other.id);
            other.neighbors.add(triangle.id);
          }
        }
      }
    }
  }
}

function findNearestWalkableTriangle(triangles, point) {
  let nearest = null;
  for (const triangle of triangles) {
    const distance = Math.hypot(triangle.center.x - point.x, triangle.center.z - point.z);
    const yDistance = typeof point.y === 'number' ? Math.abs(triangle.center.y - point.y) : 0;
    const distance3d = Math.hypot(distance, yDistance);
    if (!nearest || distance3d < nearest.distance3d) {
      nearest = { ...triangle, distance, distance3d };
    }
  }
  return nearest;
}

function p(x, z, label, y = null) {
  return { x, z, y, label };
}

function bucketKey(point, bucketSize) {
  const { bx, bz } = bucketCoords(point, bucketSize);
  return `${bx},${bz}`;
}

function bucketCoords(point, bucketSize) {
  return {
    bx: Math.floor(point.x / bucketSize),
    bz: Math.floor(point.z / bucketSize),
  };
}

function edgeKey(a, b) {
  const first = vertexKey(a);
  const second = vertexKey(b);
  return first < second ? `${first}|${second}` : `${second}|${first}`;
}

function vertexKey(point) {
  return `${Math.round(point.x / GRID)},${Math.round(point.y / GRID)},${Math.round(point.z / GRID)}`;
}

function triangleNormal(verts) {
  const ab = sub(verts[1], verts[0]);
  const ac = sub(verts[2], verts[0]);
  return normalize(cross(ab, ac));
}

function sub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function cross(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function normalize(v) {
  const length = Math.hypot(v.x, v.y, v.z);
  if (length <= 0.000001) {
    return { x: 0, y: 0, z: 0 };
  }
  return { x: v.x / length, y: v.y / length, z: v.z / length };
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}
