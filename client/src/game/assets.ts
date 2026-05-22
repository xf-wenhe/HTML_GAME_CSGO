import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export type AssetKind = 'weapon' | 'enemy' | 'prop';

export interface AssetDefinition {
  id: string;
  kind: AssetKind;
  path: string;
  scale?: number;
  rotation?: [number, number, number];
  position?: [number, number, number];
  fallback: () => THREE.Object3D;
}

const loader = new GLTFLoader();
const cache = new Map<string, Promise<THREE.Object3D>>();

function markRenderable(object: THREE.Object3D, source: 'glb' | 'fallback' = 'fallback'): THREE.Object3D {
  object.userData.assetSource = source;
  object.traverse(child => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      child.userData.assetSource = source;
    }
  });
  return object;
}

function applyDefinitionTransform(model: THREE.Object3D, definition: AssetDefinition): THREE.Object3D {
  const scale = definition.scale ?? 1;
  model.scale.setScalar(scale);
  if (definition.rotation) model.rotation.set(...definition.rotation);
  if (definition.position) model.position.set(...definition.position);
  return model;
}

function tuneMaterials(object: THREE.Object3D, definition: AssetDefinition): THREE.Object3D {
  object.traverse(child => {
    if (!(child instanceof THREE.Mesh)) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach(material => {
      if (!(material instanceof THREE.MeshStandardMaterial)) return;
      if (definition.kind === 'weapon') {
        material.color.lerp(new THREE.Color(0x9aa4af), 0.18);
        material.metalness = Math.min(0.85, Math.max(material.metalness, 0.35));
        material.roughness = Math.min(0.72, Math.max(material.roughness, 0.28));
        material.envMapIntensity = 1.25;
      } else if (definition.kind === 'enemy') {
        material.color.lerp(new THREE.Color(0xd7dde5), 0.08);
        material.roughness = Math.min(0.78, Math.max(material.roughness, 0.42));
        material.envMapIntensity = 0.9;
      }
      material.needsUpdate = true;
    });
  });
  return object;
}

export async function loadAsset(definition: AssetDefinition): Promise<THREE.Object3D> {
  if (typeof process !== 'undefined' && process.env.VITEST) {
    return markRenderable(tuneMaterials(applyDefinitionTransform(definition.fallback(), definition), definition), 'fallback');
  }

  if (!cache.has(definition.id)) {
    cache.set(definition.id, new Promise(resolve => {
      try {
        loader.load(
          definition.path,
          gltf => {
            const model = gltf.scene;
            resolve(markRenderable(tuneMaterials(applyDefinitionTransform(model, definition), definition), 'glb'));
          },
          undefined,
          () => resolve(markRenderable(tuneMaterials(applyDefinitionTransform(definition.fallback(), definition), definition), 'fallback'))
        );
      } catch {
        resolve(markRenderable(tuneMaterials(applyDefinitionTransform(definition.fallback(), definition), definition), 'fallback'));
      }
    }));
  }

  const model = await cache.get(definition.id)!;
  return markRenderable(model.clone(true), model.userData.assetSource === 'glb' ? 'glb' : 'fallback');
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

  if (variant === 'pistol') {
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, length * 0.82), darkMetal);
    slide.position.set(0, 0.11, -length * 0.34);
    group.add(slide);
    const triggerGuard = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.012, 8, 16), gripMaterial);
    triggerGuard.rotation.x = Math.PI / 2;
    triggerGuard.scale.z = 0.55;
    triggerGuard.position.set(0.02, -0.1, -length * 0.12);
    group.add(triggerGuard);
  }

  if (variant === 'rifle') {
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.16, 0.44), gripMaterial);
    stock.position.set(0, -0.02, length * 0.2);
    group.add(stock);
    const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.11, 0.45), gripMaterial);
    handguard.position.set(0, -0.02, -length * 0.78);
    group.add(handguard);
  }

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

  if (variant === 'shotgun') {
    const pump = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.11, 0.34), gripMaterial);
    pump.position.set(0, -0.04, -length * 0.74);
    group.add(pump);
    const secondBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, length * 0.72, 16), darkMetal);
    secondBarrel.rotation.x = Math.PI / 2;
    secondBarrel.position.set(0.07, 0.02, -length * 0.94);
    group.add(secondBarrel);
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
    scale: 0.42,
    rotation: [0, Math.PI / 2, 0],
    position: [-0.18, -0.06, 0.18],
    fallback: () => createFallbackWeapon(0x3f4650, 0.55, 'pistol')
  },
  heavy_pistol: {
    id: 'heavy_pistol',
    kind: 'weapon',
    path: '/assets/models/weapons/heavy_pistol.glb',
    scale: 0.42,
    rotation: [0, Math.PI / 2, 0],
    position: [-0.22, -0.08, 0.18],
    fallback: () => createFallbackWeapon(0x4b5563, 0.62, 'pistol')
  },
  rifle: {
    id: 'rifle',
    kind: 'weapon',
    path: '/assets/models/weapons/rifle.glb',
    scale: 0.18,
    rotation: [0, Math.PI / 2, 0],
    position: [-0.18, -0.08, 0.24],
    fallback: () => createFallbackWeapon(0x3d4651, 0.95, 'rifle')
  },
  defender_rifle: {
    id: 'defender_rifle',
    kind: 'weapon',
    path: '/assets/models/weapons/defender_rifle.glb',
    scale: 0.18,
    rotation: [0, Math.PI / 2, 0],
    position: [-0.08, -0.12, 0.2],
    fallback: () => createFallbackWeapon(0x45515c, 0.9, 'rifle')
  },
  sniper: {
    id: 'sniper',
    kind: 'weapon',
    path: '/assets/models/weapons/sniper.glb',
    scale: 0.145,
    rotation: [0, Math.PI / 2, 0],
    position: [-0.25, -0.12, 0.28],
    fallback: () => createFallbackWeapon(0x303842, 1.12, 'sniper')
  },
  smg: {
    id: 'smg',
    kind: 'weapon',
    path: '/assets/models/weapons/smg.glb',
    scale: 0.24,
    rotation: [0, Math.PI / 2, 0],
    position: [-0.12, -0.1, 0.2],
    fallback: () => createFallbackWeapon(0x35404a, 0.72, 'smg')
  },
  shotgun: {
    id: 'shotgun',
    kind: 'weapon',
    path: '/assets/models/weapons/shotgun.glb',
    scale: 0.17,
    rotation: [0, Math.PI / 2, 0],
    position: [-0.18, -0.11, 0.24],
    fallback: () => createFallbackWeapon(0x47311f, 0.8, 'shotgun')
  },
  knife: {
    id: 'knife',
    kind: 'weapon',
    path: '/assets/models/weapons/knife.glb',
    scale: 0.62,
    rotation: [0, Math.PI / 2, 0],
    position: [-0.08, -0.08, 0.12],
    fallback: () => createFallbackWeapon(0xa8b0ba, 0.6, 'knife')
  },
  enemy_assault: {
    id: 'enemy_assault',
    kind: 'enemy',
    path: '/assets/models/enemies/assault.glb',
    scale: 0.011,
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, 0, 0],
    fallback: createFallbackEnemy
  }
};
