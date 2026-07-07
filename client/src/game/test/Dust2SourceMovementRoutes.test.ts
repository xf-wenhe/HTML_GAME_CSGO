import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Physics } from '../Physics.js';
import { PlayerController } from '../PlayerController.js';
import { PLAYER_EYE_HEIGHT } from '../constants/MapUnits.js';
import { createDust2SourceRouteWalkables, type Dust2RouteWalkableSpec } from '../Dust2RouteWalkables.js';
import type { Dust2WorldMeshResource } from '../Dust2MeshResource.js';
import dust2WorldMeshResourceJson from '../source/dust2-world-mesh.json';

const resource = dust2WorldMeshResourceJson as Dust2WorldMeshResource;

type RoutePoint = { x: number; y: number; z: number };
type WalkableBox = {
  name?: string;
  position: [number, number, number];
  size: [number, number, number];
  collisionKind?: 'floor' | 'ramp';
};

const DUST2_HEIGHT_ROUTES = [
  ['T spawn to A long', [
    { x: -8.32, y: 1.76, z: 7.04 },
    { x: -17.18, y: 1.43, z: -9.39 },
    { x: -19.4, y: 0, z: -18.5 },
    { x: -16.4, y: 0, z: -23.8 },
    { x: -15.36, y: 0, z: -26.88 },
  ]],
  ['T spawn to catwalk', [
    { x: -8.32, y: 1.76, z: 7.04 },
    { x: -5.8, y: 1.3, z: 3.8 },
    { x: -7.5, y: 1.28, z: -8.8 },
    { x: -9.6, y: 0, z: -15.1 },
    { x: -15.36, y: 0, z: -26.88 },
  ]],
  ['T spawn through tunnels to B site', [
    { x: -8.32, y: 1.76, z: 7.04 },
    { x: -4.7, y: 1.3, z: 3.7 },
    { x: 5.2, y: 1.1, z: -5.1 },
    { x: 12.8, y: -1.92, z: -1.5 },
    { x: 11.2, y: 0.96, z: -23.6 },
    { x: 11.52, y: 0.96, z: -24.64 },
  ]],
  ['top mid through lower tunnels to upper tunnels', [
    { x: -5.8, y: 1.3, z: 3.8 },
    { x: 5.2, y: 1.1, z: -5.1 },
    { x: 12.8, y: -1.92, z: -1.5 },
  ]],
  ['CT through mid doors to A site', [
    { x: 2.56, y: -0.88, z: -22.4 },
    { x: -3.2, y: -1, z: -11.8 },
    { x: -13.8, y: 0, z: -25.2 },
    { x: -15.36, y: 0, z: -26.88 },
  ]],
  ['CT spawn through mid doors to CT mid', [
    { x: 2.56, y: -0.88, z: -22.4 },
    { x: -3.2, y: -1, z: -11.8 },
    { x: -1.0, y: -0.88, z: -19.0 },
  ]],
  ['CT spawn to B site', [
    { x: 2.56, y: -0.88, z: -22.4 },
    { x: 7.0, y: -0.88, z: -21.2 },
    { x: 11.52, y: 0.96, z: -24.64 },
  ]],
] satisfies Array<[string, RoutePoint[]]>;

const DUST2_JUMP_ROUTES = [
  ['T spawn to A long', DUST2_HEIGHT_ROUTES[0][1], 45],
  ['T spawn to catwalk', DUST2_HEIGHT_ROUTES[1][1], 45],
  ['CT spawn to B site', DUST2_HEIGHT_ROUTES[6][1], 30],
] satisfies Array<[string, RoutePoint[], number]>;

const DUST2_BROWSER_REPRO_HEIGHT_ROUTES = [
  ['browser catwalk downhill probe', [
    { x: -3.52, y: 1.28, z: -10.56 },
    { x: -11.52, y: 0, z: -18.56 },
  ]],
  ['browser long doors downhill probe', [
    { x: -18.56, y: 0.36, z: 6.72 },
    { x: -20.8, y: -0.22, z: -9 },
  ]],
] satisfies Array<[string, RoutePoint[]]>;

const DUST2_BROWSER_REPRO_JUMP_ROUTES = [
  ['browser T long jump landing probe', [
    { x: -8.32, y: 1.76, z: 8.96 },
    { x: -14.72, y: 0.62, z: 11.52 },
  ], 15],
] satisfies Array<[string, RoutePoint[], number]>;

const sourceProxyBoxes: WalkableBox[] = [
  ...(resource.collisionProxy?.floors ?? []),
  ...(resource.collisionProxy?.ramps ?? []),
];

const routeSupportBoxes: WalkableBox[] = createDust2SourceRouteWalkables().map((box: Dust2RouteWalkableSpec) => ({
  name: box.name,
  position: [box.position.x, box.position.y, box.position.z],
  size: [box.size.x, box.size.y, box.size.z],
  collisionKind: box.collisionKind,
}));

const allWalkableBoxes = [...sourceProxyBoxes, ...routeSupportBoxes];
const allRoutePointSets = [
  ...DUST2_HEIGHT_ROUTES.map(([, points]) => points),
  ...DUST2_BROWSER_REPRO_HEIGHT_ROUTES.map(([, points]) => points),
  ...DUST2_JUMP_ROUTES.map(([, points]) => points),
  ...DUST2_BROWSER_REPRO_JUMP_ROUTES.map(([, points]) => points),
];

function routeBoxes(points: RoutePoint[]): WalkableBox[] {
  const xs = points.map(point => point.x);
  const zs = points.map(point => point.z);
  const minX = Math.min(...xs) - 3;
  const maxX = Math.max(...xs) + 3;
  const minZ = Math.min(...zs) - 3;
  const maxZ = Math.max(...zs) + 3;
  return allWalkableBoxes.filter(box => {
    const [x, , z] = box.position;
    const [sx, , sz] = box.size;
    if (x + sx / 2 < minX || x - sx / 2 > maxX || z + sz / 2 < minZ || z - sz / 2 > maxZ) {
      return false;
    }
    const halfDiagonal = Math.hypot(sx, sz) / 2;
    return distanceToRouteXZ(x, z, points) <= halfDiagonal + 2.2;
  });
}

function distanceToRouteXZ(x: number, z: number, points: RoutePoint[]): number {
  let best = Infinity;
  for (let i = 0; i < points.length - 1; i += 1) {
    const from = points[i];
    const to = points[i + 1];
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    const lengthSq = dx * dx + dz * dz;
    const t = lengthSq > 0
      ? Math.max(0, Math.min(1, ((x - from.x) * dx + (z - from.z) * dz) / lengthSq))
      : 0;
    const closestX = from.x + dx * t;
    const closestZ = from.z + dz * t;
    best = Math.min(best, Math.hypot(x - closestX, z - closestZ));
  }
  return best;
}

function topNearY(boxes: WalkableBox[], point: RoutePoint): number {
  let best: { topY: number; distance: number } | null = null;
  for (const box of boxes) {
    const [x, y, z] = box.position;
    const [sx, sy, sz] = box.size;
    if (point.x < x - sx / 2 - 0.08 || point.x > x + sx / 2 + 0.08) continue;
    if (point.z < z - sz / 2 - 0.08 || point.z > z + sz / 2 + 0.08) continue;
    const topY = y + sy / 2;
    const distance = Math.abs(topY - point.y);
    if (!best || distance < best.distance) best = { topY, distance };
  }
  return best?.topY ?? point.y;
}

function supportNearPoint(boxes: WalkableBox[], point: RoutePoint): { topY: number; distance: number } | null {
  let best: { topY: number; distance: number } | null = null;
  for (const box of boxes) {
    const [x, y, z] = box.position;
    const [sx, sy, sz] = box.size;
    const dx = Math.max(Math.abs(point.x - x) - sx / 2, 0);
    const dz = Math.max(Math.abs(point.z - z) - sz / 2, 0);
    const xzDistance = Math.hypot(dx, dz);
    const topY = y + sy / 2;
    const distance = Math.hypot(xzDistance, Math.abs(topY - point.y));
    if (xzDistance > 0.35 || Math.abs(topY - point.y) > 0.7) continue;
    if (!best || distance < best.distance) best = { topY, distance };
  }
  return best;
}

function estimateMaxFrames(points: RoutePoint[]): number {
  const distance = points.slice(1).reduce((total, point, index) => {
    const previous = points[index];
    return total + Math.hypot(point.x - previous.x, point.z - previous.z);
  }, 0);
  return Math.ceil((distance / 1.05) * 20) + 180;
}

function addRuntimeCollisionMesh(physics: Physics): void {
  const mesh = resource.collisionMesh ?? resource.mesh;
  if (!mesh || mesh.positions.length < 3 || mesh.indices.length < 3) return;
  const vertices = mesh.positions.flatMap(([x, y, z]) => [x, y, z]);
  physics.addStaticTrimesh(vertices, mesh.indices, mesh.name, { collisionKind: 'render' });
}

function runRoute(points: RoutePoint[], options: { jumpAtFrame?: number; includeRuntimeCollisionMesh?: boolean } = {}) {
  const boxes = routeBoxes(points);
  const physics = new Physics();
  physics.setGlobalGroundEnabled(false);
  if (options.includeRuntimeCollisionMesh) {
    addRuntimeCollisionMesh(physics);
  }
  for (const box of boxes) {
    physics.addStaticBox(
      new CANNON.Vec3(...box.position),
      new CANNON.Vec3(box.size[0] / 2, box.size[1] / 2, box.size[2] / 2),
      undefined,
      box.name,
      { walkable: true, collisionKind: box.collisionKind ?? 'floor', sourceBacked: true }
    );
  }

  const camera = new THREE.PerspectiveCamera();
  const scene = {
    getCamera: () => camera,
    getCurrentArena: () => ({ name: 'Dust2', source: { sourceBacked: true }, bounds: { width: 64, depth: 64, centerZ: -10 } }),
    getFeedbackEffects: () => ({ landHard: () => undefined }),
  };
  const keys = new Set(['KeyW']);
  const input = {
    isKeyPressed: (key: string) => keys.has(key),
    setKeyPressed: (key: string, pressed: boolean) => pressed ? keys.add(key) : keys.delete(key),
    getMouseDelta: () => ({ x: 0, y: 0 }),
  };
  const start = points[0];
  const player = new PlayerController(
    scene as any,
    physics,
    input as any,
    new THREE.Vector3(start.x, topNearY(boxes, start) + PLAYER_EYE_HEIGHT, start.z)
  );
  player.setMovementSpeedMultiplier(1.2);

  let waypoint = 1;
  let frames = 0;
  let airborneFrames = 0;
  let jumped = false;
  let stuckFrames = 0;
  let maxFootDistance = 0;
  let previousDistance = Infinity;
  const dt = 1 / 20;
  const maxFrames = estimateMaxFrames(points);

  for (let frame = 0; frame < maxFrames && waypoint < points.length; frame += 1) {
    frames = frame + 1;
    const position = player.getPosition();
    const target = points[waypoint];
    const dx = target.x - position.x;
    const dz = target.z - position.z;
    const distance = Math.hypot(dx, dz);
    if (distance < 0.38) {
      waypoint += 1;
      previousDistance = Infinity;
      continue;
    }

    player.setRotation(player.getRotation().pitch, Math.atan2(-dx, -dz));
    if (options.jumpAtFrame === frame) {
      input.setKeyPressed('Space', true);
      jumped = true;
    }
    player.update(dt);
    physics.step(dt);
    player.stickToGroundIfSupported();
    player.syncCameraToBody();

    const footDistance = player.getFootGroundDistanceForDebug();
    if (footDistance !== null) maxFootDistance = Math.max(maxFootDistance, Math.abs(footDistance));
    if (!player.isGrounded()) airborneFrames += 1;
    stuckFrames = Math.abs(previousDistance - distance) < 0.0005 ? stuckFrames + 1 : 0;
    previousDistance = distance;
    if (stuckFrames > 60) break;
  }

  return {
    reached: waypoint,
    passed: waypoint >= points.length,
    frames,
    maxFrames,
    grounded: player.isGrounded(),
    jumped,
    airborneFrames,
    stuckFrames,
    maxFootDistance,
    finalFootDistance: player.getFootGroundDistanceForDebug(),
    position: player.getPosition(),
  };
}

function routeFailureSummary(result: ReturnType<typeof runRoute>): string {
  return JSON.stringify({
    reached: result.reached,
    frames: result.frames,
    maxFrames: result.maxFrames,
    grounded: result.grounded,
    airborneFrames: result.airborneFrames,
    stuckFrames: result.stuckFrames,
    maxFootDistance: Number(result.maxFootDistance.toFixed(3)),
    finalFootDistance: result.finalFootDistance === null ? null : Number(result.finalFootDistance.toFixed(3)),
    position: {
      x: Number(result.position.x.toFixed(2)),
      y: Number(result.position.y.toFixed(2)),
      z: Number(result.position.z.toFixed(2)),
    },
  });
}

describe('Dust2 source-backed height movement routes', () => {
  it('keeps generated Dust2 walkable proxy boxes inside source bounds with player-sized support', () => {
    const bounds = resource.collisionProxy?.bounds;
    expect(bounds).toBeTruthy();
    const invalidBoxes = sourceProxyBoxes.filter(box => {
      const [x, , z] = box.position;
      const [sx, , sz] = box.size;
      const outsideBounds = x - sx / 2 < bounds!.mins[0] - 0.001
        || x + sx / 2 > bounds!.maxs[0] + 0.001
        || z - sz / 2 < bounds!.mins[2] - 0.001
        || z + sz / 2 > bounds!.maxs[2] + 0.001;
      const tooNarrowForPlayer = sx < 0.18 || sz < 0.18;
      return outsideBounds || tooNarrowForPlayer;
    });

    expect(sourceProxyBoxes.length).toBeGreaterThan(3000);
    expect(invalidBoxes.map(box => box.name)).toEqual([]);
  });

  it('keeps route support boxes inside source bounds and covers every declared route checkpoint', () => {
    const bounds = resource.collisionProxy?.bounds;
    expect(bounds).toBeTruthy();
    const invalidRouteBoxes = routeSupportBoxes.filter(box => {
      const [x, , z] = box.position;
      const [sx, , sz] = box.size;
      return x - sx / 2 < bounds!.mins[0] - 0.001
        || x + sx / 2 > bounds!.maxs[0] + 0.001
        || z - sz / 2 < bounds!.mins[2] - 0.001
        || z + sz / 2 > bounds!.maxs[2] + 0.001
        || sx < 0.18
        || sz < 0.18;
    });
    const unsupportedPoints = allRoutePointSets.flatMap(points =>
      points.filter(point => !supportNearPoint(allWalkableBoxes, point))
    );

    expect(invalidRouteBoxes.map(box => box.name)).toEqual([]);
    expect(unsupportedPoints).toEqual([]);
  });

  it.each(DUST2_HEIGHT_ROUTES)('walks %s without falling through or getting stuck', (_name, points) => {
    const result = runRoute(points);

    expect(result.passed, routeFailureSummary(result)).toBe(true);
    expect(result.grounded, routeFailureSummary(result)).toBe(true);
    expect(result.airborneFrames, routeFailureSummary(result)).toBe(0);
    expect(result.stuckFrames, routeFailureSummary(result)).toBeLessThan(60);
    expect(result.maxFootDistance, routeFailureSummary(result)).toBeLessThan(0.09);
  });

  it.each(DUST2_BROWSER_REPRO_HEIGHT_ROUTES)('keeps %s grounded in runtime probe coverage', (_name, points) => {
    const result = runRoute(points, { includeRuntimeCollisionMesh: true });

    expect(result.passed, routeFailureSummary(result)).toBe(true);
    expect(result.grounded, routeFailureSummary(result)).toBe(true);
    expect(result.airborneFrames, routeFailureSummary(result)).toBe(0);
    expect(result.stuckFrames, routeFailureSummary(result)).toBeLessThan(60);
    expect(result.maxFootDistance, routeFailureSummary(result)).toBeLessThan(0.09);
  });

  it.each(DUST2_JUMP_ROUTES)('can jump on %s, land, and keep moving', (_name, points, jumpAtFrame) => {
    const result = runRoute(points, { jumpAtFrame });

    expect(result.jumped, routeFailureSummary(result)).toBe(true);
    expect(result.airborneFrames, routeFailureSummary(result)).toBeGreaterThan(0);
    expect(result.passed, routeFailureSummary(result)).toBe(true);
    expect(result.grounded, routeFailureSummary(result)).toBe(true);
    expect(result.stuckFrames, routeFailureSummary(result)).toBeLessThan(60);
    expect(Math.abs(result.finalFootDistance ?? 1), routeFailureSummary(result)).toBeLessThan(0.04);
  });

  it.each(DUST2_BROWSER_REPRO_JUMP_ROUTES)('can jump and land on %s', (_name, points, jumpAtFrame) => {
    const result = runRoute(points, { jumpAtFrame, includeRuntimeCollisionMesh: true });

    expect(result.jumped, routeFailureSummary(result)).toBe(true);
    expect(result.airborneFrames, routeFailureSummary(result)).toBeGreaterThan(0);
    expect(result.passed, routeFailureSummary(result)).toBe(true);
    expect(result.grounded, routeFailureSummary(result)).toBe(true);
    expect(result.stuckFrames, routeFailureSummary(result)).toBeLessThan(60);
    expect(Math.abs(result.finalFootDistance ?? 1), routeFailureSummary(result)).toBeLessThan(0.04);
  });

  it.each([
    ['T spawn to catwalk', DUST2_HEIGHT_ROUTES[1][1]],
    ['T spawn through tunnels to B site', DUST2_HEIGHT_ROUTES[2][1]],
  ] satisfies Array<[string, RoutePoint[]]>)('walks %s with the runtime Dust2 collision mesh enabled', (_name, points) => {
    const result = runRoute(points, { includeRuntimeCollisionMesh: true });

    expect(result.passed, routeFailureSummary(result)).toBe(true);
    expect(result.grounded, routeFailureSummary(result)).toBe(true);
    expect(result.stuckFrames, routeFailureSummary(result)).toBeLessThan(60);
    expect(Math.abs(result.finalFootDistance ?? 1), routeFailureSummary(result)).toBeLessThan(0.05);
  });
});
