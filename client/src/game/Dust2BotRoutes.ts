import * as THREE from 'three';

export type Dust2BotRouteName = 'long' | 'catwalk' | 'mid' | 'tunnels';

const p = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

export const DUST2_BOT_ROUTES: Record<Dust2BotRouteName, THREE.Vector3[]> = {
  long: [
    p(2.56, 1.0, -22.4),
    p(-3.2, 1.0, -11.8),
    p(-13.8, 1.0, -25.2),
    p(-17.18, 1.0, -9.39),
    p(-19.4, 1.0, -18.5),
  ],
  catwalk: [
    p(2.56, 1.0, -22.4),
    p(-1.0, 1.0, -19.0),
    p(-7.5, 1.0, -8.8),
    p(-9.6, 1.0, -15.1),
    p(-15.36, 1.0, -26.88),
  ],
  mid: [
    p(2.56, 1.0, -22.4),
    p(-3.2, 1.0, -11.8),
    p(-1.0, 1.0, -19.0),
    p(-5.8, 1.0, 3.8),
  ],
  tunnels: [
    p(2.56, 1.0, -22.4),
    p(7.0, 1.0, -21.2),
    p(11.52, 1.0, -24.64),
    p(12.8, 1.0, -1.5),
    p(5.2, 1.0, -5.1),
  ],
};

export function getDust2BotRoute(index: number): THREE.Vector3[] {
  const routes = Object.values(DUST2_BOT_ROUTES);
  return routes[index % routes.length].map(point => point.clone());
}
