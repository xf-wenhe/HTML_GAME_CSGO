import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export type AssetKind = 'weapon' | 'enemy' | 'prop';

export interface AssetDefinition {
  id: string;
  kind: AssetKind;
  path: string;
  scale?: number;
  fallback: () => THREE.Object3D;
}

const loader = new GLTFLoader();
const cache = new Map<string, Promise<THREE.Object3D>>();

function markRenderable(object: THREE.Object3D): THREE.Object3D {
  object.traverse(child => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return object;
}

export async function loadAsset(definition: AssetDefinition): Promise<THREE.Object3D> {
  if (typeof process !== 'undefined' && process.env.VITEST) {
    return markRenderable(definition.fallback());
  }

  if (!cache.has(definition.id)) {
    cache.set(definition.id, new Promise(resolve => {
      try {
        loader.load(
          definition.path,
          gltf => {
            const model = gltf.scene;
            const scale = definition.scale ?? 1;
            model.scale.setScalar(scale);
            resolve(markRenderable(model));
          },
          undefined,
          () => resolve(markRenderable(definition.fallback()))
        );
      } catch {
        resolve(markRenderable(definition.fallback()));
      }
    }));
  }

  const model = await cache.get(definition.id)!;
  return markRenderable(model.clone(true));
}

export function createFallbackWeapon(color: number, length = 0.9, variant: 'pistol' | 'rifle' | 'sniper' | 'smg' | 'shotgun' | 'knife' = 'rifle'): THREE.Object3D {
  const group = new THREE.Group();
  const darkMetal = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).lerp(new THREE.Color(0x9aa4af), 0.22), metalness: 0.72, roughness: 0.34 });
  const gripMaterial = new THREE.MeshStandardMaterial({ color: 0x252a31, roughness: 0.68 });
  const accentMaterial = new THREE.MeshStandardMaterial({ color: 0xc89b45, metalness: 0.35, roughness: 0.42 });

  if (variant === 'knife') {
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.16, 0.46), gripMaterial);
    handle.position.set(0.02, -0.08, -0.16);
    group.add(handle);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.035, 0.62), darkMetal);
    blade.position.set(0, 0.01, -0.72);
    group.add(blade);
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.04, 0.08), accentMaterial);
    guard.position.set(0, 0.01, -0.42);
    group.add(guard);
    return group;
  }

  const receiverHeight = variant === 'sniper' ? 0.16 : variant === 'pistol' ? 0.14 : 0.18;
  const receiverWidth = variant === 'shotgun' ? 0.22 : 0.18;
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(receiverWidth, receiverHeight, length), darkMetal);
  receiver.position.set(0, 0, -length * 0.35);
  group.add(receiver);

  const barrelRadius = variant === 'shotgun' ? 0.048 : variant === 'sniper' ? 0.027 : 0.035;
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(barrelRadius, barrelRadius, length * (variant === 'sniper' ? 1.15 : 0.75), 16), darkMetal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.02, -length * (variant === 'sniper' ? 1.14 : 0.95));
  group.add(barrel);

  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.32, 0.16), gripMaterial);
  grip.rotation.x = -0.35;
  grip.position.set(0.03, -0.24, -length * 0.1);
  group.add(grip);

  const sight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.045, 0.22), gripMaterial);
  sight.position.set(0, 0.14, -length * 0.45);
  group.add(sight);

  if (variant === 'sniper') {
    const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.46, 16), gripMaterial);
    scope.rotation.z = Math.PI / 2;
    scope.position.set(0, 0.19, -length * 0.38);
    group.add(scope);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.42), gripMaterial);
    stock.position.set(0, -0.02, length * 0.16);
    group.add(stock);
  }

  if (variant === 'smg') {
    const compactStock = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.34), gripMaterial);
    compactStock.position.set(0, -0.01, length * 0.12);
    group.add(compactStock);
  }

  const sideRail = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.035, length * 0.62), accentMaterial);
  sideRail.position.set(-0.105, 0.045, -length * 0.45);
  group.add(sideRail);

  const magazine = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.26, 0.18), gripMaterial);
  magazine.rotation.x = 0.18;
  magazine.position.set(0.02, -0.21, -length * 0.42);
  group.add(magazine);

  return group;
}

export function createFallbackEnemy(): THREE.Object3D {
  const group = new THREE.Group();
  const armor = new THREE.MeshStandardMaterial({ color: 0x8f1f1f, roughness: 0.48, metalness: 0.18 });
  const darkArmor = new THREE.MeshStandardMaterial({ color: 0x1f242b, roughness: 0.56, metalness: 0.28 });
  const cloth = new THREE.MeshStandardMaterial({ color: 0x2f3338, roughness: 0.75 });
  const visor = new THREE.MeshStandardMaterial({ color: 0xffd166, roughness: 0.18, emissive: 0x4a2200 });
  const rifle = new THREE.MeshStandardMaterial({ color: 0x111315, roughness: 0.35, metalness: 0.75 });

  const hips = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.32, 0.34), darkArmor);
  hips.position.y = 0.82;
  group.add(hips);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.92, 0.38), armor);
  torso.position.y = 1.33;
  torso.rotation.x = -0.08;
  group.add(torso);

  const chestRig = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.16, 0.44), darkArmor);
  chestRig.position.set(0, 1.45, -0.02);
  group.add(chestRig);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.16, 10), cloth);
  neck.position.y = 1.87;
  group.add(neck);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.36, 0.42), armor);
  head.position.y = 2.12;
  group.add(head);

  const helmet = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.18, 0.48), darkArmor);
  helmet.position.y = 2.31;
  group.add(helmet);

  const face = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.09, 0.035), visor);
  face.position.set(0, 2.13, -0.23);
  group.add(face);

  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.78, 0.2), cloth);
  leftArm.name = 'left-arm';
  leftArm.position.set(-0.52, 1.28, -0.08);
  leftArm.rotation.z = -0.15;
  group.add(leftArm);

  const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.78, 0.2), cloth);
  rightArm.name = 'right-arm';
  rightArm.position.set(0.52, 1.28, -0.08);
  rightArm.rotation.z = 0.15;
  group.add(rightArm);

  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.86, 0.24), cloth);
  leftLeg.name = 'left-leg';
  leftLeg.position.set(-0.22, 0.27, 0);
  group.add(leftLeg);

  const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.86, 0.24), cloth);
  rightLeg.name = 'right-leg';
  rightLeg.position.set(0.22, 0.27, 0);
  group.add(rightLeg);

  const weapon = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.11, 0.98), rifle);
  weapon.position.set(0.34, 1.28, -0.42);
  weapon.rotation.set(0.18, -0.22, -0.08);
  group.add(weapon);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.72, 10), rifle);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0.27, 1.3, -0.98);
  group.add(barrel);

  return group;
}

export const ASSETS: Record<string, AssetDefinition> = {
  pistol: {
    id: 'pistol',
    kind: 'weapon',
    path: '/assets/models/weapons/pistol.glb',
    scale: 1,
    fallback: () => createFallbackWeapon(0x3f4650, 0.55, 'pistol')
  },
  heavy_pistol: {
    id: 'heavy_pistol',
    kind: 'weapon',
    path: '/assets/models/weapons/heavy_pistol.glb',
    scale: 1,
    fallback: () => createFallbackWeapon(0x4b5563, 0.62, 'pistol')
  },
  rifle: {
    id: 'rifle',
    kind: 'weapon',
    path: '/assets/models/weapons/rifle.glb',
    scale: 1,
    fallback: () => createFallbackWeapon(0x3d4651, 0.95, 'rifle')
  },
  defender_rifle: {
    id: 'defender_rifle',
    kind: 'weapon',
    path: '/assets/models/weapons/defender_rifle.glb',
    scale: 1,
    fallback: () => createFallbackWeapon(0x45515c, 0.9, 'rifle')
  },
  sniper: {
    id: 'sniper',
    kind: 'weapon',
    path: '/assets/models/weapons/sniper.glb',
    scale: 1,
    fallback: () => createFallbackWeapon(0x303842, 1.12, 'sniper')
  },
  smg: {
    id: 'smg',
    kind: 'weapon',
    path: '/assets/models/weapons/smg.glb',
    scale: 1,
    fallback: () => createFallbackWeapon(0x35404a, 0.72, 'smg')
  },
  shotgun: {
    id: 'shotgun',
    kind: 'weapon',
    path: '/assets/models/weapons/shotgun.glb',
    scale: 1,
    fallback: () => createFallbackWeapon(0x47311f, 0.8, 'shotgun')
  },
  knife: {
    id: 'knife',
    kind: 'weapon',
    path: '/assets/models/weapons/knife.glb',
    scale: 1,
    fallback: () => createFallbackWeapon(0xa8b0ba, 0.6, 'knife')
  },
  enemy_assault: {
    id: 'enemy_assault',
    kind: 'enemy',
    path: '/assets/models/enemies/assault.glb',
    scale: 1,
    fallback: createFallbackEnemy
  }
};
