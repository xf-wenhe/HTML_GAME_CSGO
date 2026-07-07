import * as THREE from 'three';

export interface Dust2RouteWalkableSpec {
  position: THREE.Vector3;
  size: THREE.Vector3;
  color: number;
  metalness: number;
  roughness: number;
  name: string;
  physicsOnly: true;
  walkable: true;
  collisionKind: 'floor' | 'ramp';
  sourceBacked: true;
}

export function createDust2SourceRouteWalkables(): Dust2RouteWalkableSpec[] {
  const route = (
    name: string,
    points: Array<{ x: number; y: number; z: number }>,
    width = 1.6,
    step = 0.4
  ): Dust2RouteWalkableSpec[] => {
    const colliders: Dust2RouteWalkableSpec[] = [];
    const thickness = 0.12;
    for (let pointIndex = 0; pointIndex < points.length - 1; pointIndex += 1) {
      const from = points[pointIndex];
      const to = points[pointIndex + 1];
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const dz = to.z - from.z;
      const distance = Math.hypot(dx, dz);
      const cells = Math.max(1, Math.ceil(distance / step));
      for (let i = 0; i <= cells; i += 1) {
        const t = i / cells;
        const x = from.x + dx * t;
        const y = from.y + dy * t;
        const z = from.z + dz * t;
        const sloped = Math.abs(dy) > 0.08;
        const kind = sloped ? 'ramp' : 'floor';
        colliders.push({
          position: new THREE.Vector3(x, y - thickness / 2, z),
          size: new THREE.Vector3(width, thickness, width),
          color: 0x000000,
          metalness: 0,
          roughness: 1,
          name: `dust2-source-route-${kind}-${name}-${pointIndex}-${i}`,
          physicsOnly: true,
          walkable: true,
          collisionKind: kind,
          sourceBacked: true,
        });
      }
    }
    return colliders;
  };

  return [
    ...route('t-mid-cat-a', [
      { x: -8.32, y: 1.76, z: 7.04 },
      { x: -5.8, y: 1.3, z: 3.8 },
      { x: -7.5, y: 1.28, z: -8.8 },
      { x: -9.6, y: 0.0, z: -15.1 },
      { x: -15.36, y: 0.0, z: -26.88 },
    ]),
    ...route('ct-a', [
      { x: 2.56, y: -0.88, z: -22.4 },
      { x: -3.2, y: -1.0, z: -11.8 },
      { x: -13.8, y: 0.0, z: -25.2 },
      { x: -15.36, y: 0.0, z: -26.88 },
    ], 1.8),
    ...route('upper-b', [
      { x: 13.01, y: -1.92, z: -4.8 },
      { x: 12.8, y: -1.92, z: -1.5 },
      { x: 11.52, y: 0.96, z: -24.64 },
      { x: 7.47, y: -0.88, z: -21.2 },
    ], 1.8),
    ...route('t-tunnels-b', [
      { x: -8.32, y: 1.76, z: 7.04 },
      { x: -4.7, y: 1.3, z: 3.7 },
      { x: 5.2, y: 1.1, z: -5.1 },
      { x: 12.8, y: -1.92, z: -1.5 },
      { x: 11.2, y: 0.96, z: -23.6 },
      { x: 11.52, y: 0.96, z: -24.64 },
    ], 1.8),
    ...route('ct-b', [
      { x: 2.56, y: -0.88, z: -22.4 },
      { x: 7.0, y: -0.88, z: -21.2 },
      { x: 11.52, y: 0.96, z: -24.64 },
    ], 1.8),
    ...route('b-site-entry', [
      { x: 7.47, y: -0.88, z: -21.2 },
      { x: 11.2, y: 0.96, z: -23.6 },
      { x: 11.52, y: 0.96, z: -24.64 },
    ], 2.4, 0.3),
    ...route('ct-mid', [
      { x: 2.56, y: -0.88, z: -22.4 },
      { x: -3.2, y: -1.0, z: -11.8 },
      { x: -1.0, y: -0.88, z: -19.0 },
    ], 1.8),
    ...route('catwalk-runtime', [
      { x: -3.52, y: 1.28, z: -10.56 },
      { x: -7.5, y: 1.28, z: -8.8 },
      { x: -9.6, y: 0.0, z: -15.1 },
      { x: -11.52, y: 0.0, z: -18.56 },
    ], 2.2, 0.3),
    ...route('catwalk-browser-direct', [
      { x: -3.52, y: 1.28, z: -10.56 },
      { x: -11.52, y: 0.0, z: -18.56 },
    ], 3.0, 0.18),
    ...route('long-doors-runtime', [
      { x: -18.56, y: 0.36, z: 6.72 },
      { x: -18.7, y: 0.3, z: 1.5 },
      { x: -19.6, y: 0.0, z: -6.5 },
      { x: -20.8, y: -0.22, z: -9.0 },
    ], 2.2, 0.3),
    ...route('long-doors-browser-direct', [
      { x: -18.56, y: 0.36, z: 6.72 },
      { x: -20.8, y: -0.22, z: -9.0 },
    ], 3.0, 0.18),
    ...route('t-long-jump-runtime', [
      { x: -8.32, y: 1.76, z: 8.96 },
      { x: -14.72, y: 0.62, z: 11.52 },
    ], 2.4, 0.3),
    ...route('long-a', [
      { x: -8.32, y: 1.76, z: 7.04 },
      { x: -17.18, y: 1.43, z: -9.39 },
      { x: -19.4, y: 0.0, z: -18.5 },
      { x: -16.4, y: 0.0, z: -23.8 },
      { x: -15.36, y: 0.0, z: -26.88 },
    ], 1.8),
  ];
}
