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
  normalizeHeight?: number;
  preferFallback?: boolean;
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
  if (definition.normalizeHeight) {
    const bounds = new THREE.Box3().setFromObject(model);
    const height = bounds.getSize(new THREE.Vector3()).y;
    if (height > 0) model.scale.multiplyScalar(definition.normalizeHeight / height);
  }
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
        material.emissive = new THREE.Color(0x2a2f35);
        material.emissiveIntensity = 0.15;
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

function safeLoadFallback(definition: AssetDefinition): THREE.Object3D {
  try {
    return markRenderable(tuneMaterials(definition.fallback(), definition), 'fallback');
  } catch {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.8, 0.3), new THREE.MeshStandardMaterial({ color: 0x555555 }));
    return markRenderable(box, 'fallback');
  }
}

export async function loadAsset(definition: AssetDefinition): Promise<THREE.Object3D> {
  if (definition.preferFallback || (typeof process !== 'undefined' && process.env.VITEST)) {
    return safeLoadFallback(definition);
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
          () => resolve(safeLoadFallback(definition))
        );
      } catch {
        resolve(safeLoadFallback(definition));
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

  // CS:GO T-side color scheme
  const armor     = new THREE.MeshStandardMaterial({ color: 0x4a3520, roughness: 0.72, metalness: 0.0  });
  const darkArmor = new THREE.MeshStandardMaterial({ color: 0x1c1a16, roughness: 0.55, metalness: 0.32 });
  const cloth     = new THREE.MeshStandardMaterial({ color: 0x3a3228, roughness: 0.90, metalness: 0.0  });
  const visor     = new THREE.MeshStandardMaterial({ color: 0xd4a030, roughness: 0.12, metalness: 0.1, emissive: new THREE.Color(0x3a2000), emissiveIntensity: 0.4 });
  const metal     = new THREE.MeshStandardMaterial({ color: 0x0f1113, roughness: 0.25, metalness: 0.88 });
  const gripMat   = new THREE.MeshStandardMaterial({ color: 0x1e1c1a, roughness: 0.75, metalness: 0.0  });

  // ── Hips / Belt (at y=0.96, the hip pivot reference height) ──────────────
  const hips = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.12, 6, 12), cloth);
  hips.position.y = 0.96;
  group.add(hips);
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.06, 0.34), darkArmor);
  belt.position.set(0, 0.88, 0);
  group.add(belt);

  // ── Left leg — pivot at hip joint ────────────────────────────────────────
  const leftLegPivot = new THREE.Group();
  leftLegPivot.name = 'left-leg-pivot';
  leftLegPivot.position.set(-0.20, 0.96, 0);
  group.add(leftLegPivot);

  const leftThigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.36, 6, 12), cloth);
  leftThigh.position.y = -0.22;
  leftLegPivot.add(leftThigh);

  const leftKneePivot = new THREE.Group();
  leftKneePivot.position.y = -0.44;
  leftLegPivot.add(leftKneePivot);

  const leftShin = new THREE.Mesh(new THREE.CapsuleGeometry(0.080, 0.38, 6, 12), cloth);
  leftShin.position.y = -0.22;
  leftKneePivot.add(leftShin);

  const leftBoot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.10, 0.28), darkArmor);
  leftBoot.position.set(0, -0.46, 0.02);
  leftKneePivot.add(leftBoot);

  // ── Right leg ─────────────────────────────────────────────────────────────
  const rightLegPivot = new THREE.Group();
  rightLegPivot.name = 'right-leg-pivot';
  rightLegPivot.position.set(0.20, 0.96, 0);
  group.add(rightLegPivot);

  const rightThigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.36, 6, 12), cloth);
  rightThigh.position.y = -0.22;
  rightLegPivot.add(rightThigh);

  const rightKneePivot = new THREE.Group();
  rightKneePivot.position.y = -0.44;
  rightLegPivot.add(rightKneePivot);

  const rightShin = new THREE.Mesh(new THREE.CapsuleGeometry(0.080, 0.38, 6, 12), cloth);
  rightShin.position.y = -0.22;
  rightKneePivot.add(rightShin);

  const rightBoot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.10, 0.28), darkArmor);
  rightBoot.position.set(0, -0.46, 0.02);
  rightKneePivot.add(rightBoot);

  // ── Torso (capsule — organic shape) ──────────────────────────────────────
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.20, 0.52, 8, 16), armor);
  torso.name = 'torso';
  torso.position.y = 1.40;
  group.add(torso);

  // Tactical vest overlay
  const vestFront = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.50, 0.06), darkArmor);
  vestFront.position.set(0, 1.42, -0.22);
  group.add(vestFront);
  const pouch1 = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.12, 0.05), darkArmor);
  pouch1.position.set(-0.14, 1.32, -0.26);
  group.add(pouch1);
  const pouch2 = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.12, 0.05), darkArmor);
  pouch2.position.set(0.14, 1.32, -0.26);
  group.add(pouch2);

  // ── Left arm — pivot at shoulder (child of torso space) ──────────────────
  const leftShoulderPivot = new THREE.Group();
  leftShoulderPivot.name = 'left-arm-pivot';
  leftShoulderPivot.position.set(-0.24, 1.60, 0);
  group.add(leftShoulderPivot);

  const leftUpperArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.30, 6, 12), cloth);
  leftUpperArm.position.y = -0.18;
  leftShoulderPivot.add(leftUpperArm);

  const leftElbowPivot = new THREE.Group();
  leftElbowPivot.position.y = -0.36;
  leftShoulderPivot.add(leftElbowPivot);

  const leftForearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.062, 0.26, 6, 12), cloth);
  leftForearm.position.y = -0.16;
  leftElbowPivot.add(leftForearm);

  // ── Right arm ─────────────────────────────────────────────────────────────
  const rightShoulderPivot = new THREE.Group();
  rightShoulderPivot.name = 'right-arm-pivot';
  rightShoulderPivot.position.set(0.24, 1.60, 0);
  group.add(rightShoulderPivot);

  const rightUpperArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.30, 6, 12), cloth);
  rightUpperArm.position.y = -0.18;
  rightShoulderPivot.add(rightUpperArm);

  const rightElbowPivot = new THREE.Group();
  rightElbowPivot.position.y = -0.36;
  rightShoulderPivot.add(rightElbowPivot);

  const rightForearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.062, 0.26, 6, 12), cloth);
  rightForearm.position.y = -0.16;
  rightElbowPivot.add(rightForearm);

  // ── Neck ──────────────────────────────────────────────────────────────────
  const neck = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.10, 6, 10), cloth);
  neck.position.y = 1.82;
  group.add(neck);

  // ── Head (sphere — organic) ────────────────────────────────────────────
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), armor);
  head.name = 'head';
  head.position.y = 2.08;
  group.add(head);

  // Helmet dome (upper hemisphere feel via scaled sphere)
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.205, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), darkArmor);
  helmet.position.set(0, 2.10, 0.02);
  group.add(helmet);

  // Helmet brim
  const brim = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.04, 0.14), darkArmor);
  brim.position.set(0, 1.97, -0.20);
  group.add(brim);

  // Goggles
  const goggleL = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.07, 0.04), visor);
  goggleL.position.set(-0.09, 2.07, -0.17);
  group.add(goggleL);
  const goggleR = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.07, 0.04), visor);
  goggleR.position.set(0.09, 2.07, -0.17);
  group.add(goggleR);

  // ── Weapon (AK-47 style) ──────────────────────────────────────────────────
  const weaponOrigin = new THREE.Group();
  weaponOrigin.position.set(0.32, 1.30, -0.38);
  weaponOrigin.rotation.set(0.14, -0.18, -0.06);

  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.09, 0.70), metal);
  weaponOrigin.add(receiver);
  const barrelMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.52, 12), metal);
  barrelMesh.rotation.x = Math.PI / 2;
  barrelMesh.position.set(0, 0.02, -0.58);
  weaponOrigin.add(barrelMesh);
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.18, 0.09), gripMat);
  mag.rotation.x = -0.25;
  mag.position.set(0, -0.12, -0.08);
  weaponOrigin.add(mag);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.07), gripMat);
  grip.rotation.x = -0.30;
  grip.position.set(0, -0.08, 0.14);
  weaponOrigin.add(grip);
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.28), gripMat);
  stock.position.set(0, -0.01, 0.38);
  weaponOrigin.add(stock);
  group.add(weaponOrigin);

  group.traverse(child => {
    if (child instanceof THREE.Mesh) child.castShadow = true;
  });

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
    preferFallback: false,
    fallback: () => createFallbackWeapon(0x3f4650, 0.55, 'pistol')
  },
  heavy_pistol: {
    id: 'heavy_pistol',
    kind: 'weapon',
    path: '/assets/models/weapons/heavy_pistol.glb',
    scale: 0.42,
    rotation: [0, Math.PI / 2, 0],
    position: [-0.22, -0.08, 0.18],
    preferFallback: false,
    fallback: () => createFallbackWeapon(0x4b5563, 0.62, 'pistol')
  },
  rifle: {
    id: 'rifle',
    kind: 'weapon',
    path: '/assets/models/weapons/rifle.glb',
    scale: 0.18,
    rotation: [0, Math.PI / 2, 0],
    position: [-0.18, -0.08, 0.24],
    preferFallback: false,
    fallback: () => createFallbackWeapon(0x3d4651, 0.95, 'rifle')
  },
  defender_rifle: {
    id: 'defender_rifle',
    kind: 'weapon',
    path: '/assets/models/weapons/defender_rifle.glb',
    scale: 0.18,
    rotation: [0, Math.PI / 2, 0],
    position: [-0.08, -0.12, 0.2],
    preferFallback: false,
    fallback: () => createFallbackWeapon(0x45515c, 0.9, 'rifle')
  },
  sniper: {
    id: 'sniper',
    kind: 'weapon',
    path: '/assets/models/weapons/sniper.glb',
    scale: 0.145,
    rotation: [0, Math.PI / 2, 0],
    position: [-0.25, -0.12, 0.28],
    preferFallback: false,
    fallback: () => createFallbackWeapon(0x303842, 1.12, 'sniper')
  },
  smg: {
    id: 'smg',
    kind: 'weapon',
    path: '/assets/models/weapons/smg.glb',
    scale: 0.24,
    rotation: [0, Math.PI / 2, 0],
    position: [-0.12, -0.1, 0.2],
    preferFallback: false,
    fallback: () => createFallbackWeapon(0x35404a, 0.72, 'smg')
  },
  shotgun: {
    id: 'shotgun',
    kind: 'weapon',
    path: '/assets/models/weapons/shotgun.glb',
    scale: 0.17,
    rotation: [0, Math.PI / 2, 0],
    position: [-0.18, -0.11, 0.24],
    preferFallback: false,
    fallback: () => createFallbackWeapon(0x47311f, 0.8, 'shotgun')
  },
  knife: {
    id: 'knife',
    kind: 'weapon',
    path: '/assets/models/weapons/knife.glb',
    scale: 0.62,
    rotation: [0, Math.PI / 2, 0],
    position: [-0.08, -0.08, 0.12],
    preferFallback: false,
    fallback: () => createFallbackWeapon(0xa8b0ba, 0.6, 'knife')
  },
  enemy_assault: {
    id: 'enemy_assault',
    kind: 'enemy',
    path: '/assets/models/enemies/assault.glb',
    scale: 0.011,
    normalizeHeight: 2.25,
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, 0, 0],
    preferFallback: true,
    fallback: createFallbackEnemy
  }
};
