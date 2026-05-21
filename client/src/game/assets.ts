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

export function createFallbackWeapon(color: number, length = 0.9): THREE.Object3D {
  const group = new THREE.Group();
  const darkMetal = new THREE.MeshStandardMaterial({ color, metalness: 0.75, roughness: 0.35 });
  const gripMaterial = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.7 });

  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, length), darkMetal);
  receiver.position.set(0, 0, -length * 0.35);
  group.add(receiver);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, length * 0.75, 16), darkMetal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.02, -length * 0.95);
  group.add(barrel);

  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.32, 0.16), gripMaterial);
  grip.rotation.x = -0.35;
  grip.position.set(0.03, -0.24, -length * 0.1);
  group.add(grip);

  const sight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.045, 0.22), gripMaterial);
  sight.position.set(0, 0.14, -length * 0.45);
  group.add(sight);

  return group;
}

export function createFallbackEnemy(): THREE.Object3D {
  const group = new THREE.Group();
  const armor = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.52, metalness: 0.15 });
  const visor = new THREE.MeshStandardMaterial({ color: 0xffd166, roughness: 0.2, emissive: 0x331400 });

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.05, 6, 12), armor);
  body.position.y = 1.05;
  group.add(body);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.34, 0.4), armor);
  head.position.y = 1.87;
  group.add(head);

  const face = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.08, 0.03), visor);
  face.position.set(0, 1.9, -0.215);
  group.add(face);

  return group;
}

export const ASSETS: Record<string, AssetDefinition> = {
  pistol: {
    id: 'pistol',
    kind: 'weapon',
    path: '/assets/models/weapons/pistol.glb',
    scale: 1,
    fallback: () => createFallbackWeapon(0x2f3338, 0.55)
  },
  rifle: {
    id: 'rifle',
    kind: 'weapon',
    path: '/assets/models/weapons/rifle.glb',
    scale: 1,
    fallback: () => createFallbackWeapon(0x24272b, 0.95)
  },
  shotgun: {
    id: 'shotgun',
    kind: 'weapon',
    path: '/assets/models/weapons/shotgun.glb',
    scale: 1,
    fallback: () => createFallbackWeapon(0x47311f, 0.8)
  },
  enemy_assault: {
    id: 'enemy_assault',
    kind: 'enemy',
    path: '/assets/models/enemies/assault.glb',
    scale: 1,
    fallback: createFallbackEnemy
  }
};
