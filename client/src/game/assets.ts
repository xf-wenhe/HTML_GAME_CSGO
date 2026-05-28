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
        // Enhance contrast — darker, less washed out
        material.color.lerp(new THREE.Color(0x1a1a20), 0.04);
        material.roughness = Math.min(0.68, Math.max(material.roughness, 0.38));
        material.metalness = Math.min(0.30, Math.max(material.metalness, 0.02));
        material.envMapIntensity = 0.55;
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

export function createFallbackWeapon(color: number, length = 0.9, variant: 'pistol' | 'rifle' | 'sniper' | 'smg' | 'shotgun' | 'knife' | 'grenade' = 'rifle'): THREE.Object3D {
  const group = new THREE.Group();
  const baseColor = new THREE.Color(color);
  const darkMetal = new THREE.MeshStandardMaterial({ color: baseColor.clone().lerp(new THREE.Color(0x2a2d33), 0.15), metalness: 0.78, roughness: 0.28 });
  const gripMat  = new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.58, metalness: 0.05 });
  const woodMat  = new THREE.MeshStandardMaterial({ color: 0x4a3018, roughness: 0.62, metalness: 0.02 });
  const accentMat = new THREE.MeshStandardMaterial({ color: 0xb8943e, metalness: 0.42, roughness: 0.35 });
  const scopeMat  = new THREE.MeshStandardMaterial({ color: 0x141418, metalness: 0.55, roughness: 0.22 });
  /** 武器识别色环 — 每种武器底部的颜色标记环，便于快速辨认 */
  const idRingMat = new THREE.MeshStandardMaterial({ color: baseColor.clone().multiplyScalar(1.3), metalness: 0.35, roughness: 0.25, emissive: baseColor, emissiveIntensity: 0.18 });

  if (variant === 'knife') {
    // Tactical knife — Karambit-inspired
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.40), gripMat);
    handle.position.set(0.02, -0.06, -0.12);
    handle.rotation.z = 0.12;
    group.add(handle);

    // Curved blade
    const bladeBase = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.55), darkMetal);
    bladeBase.position.set(0.0, 0.02, -0.64);
    group.add(bladeBase);

    // Blade tip — tapered
    const bladeTip = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.12, 8), darkMetal);
    bladeTip.rotation.x = -Math.PI / 2;
    bladeTip.position.set(0.01, 0.02, -0.94);
    group.add(bladeTip);

    // Knuckle guard
    const guardRing = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.03, 8, 12, Math.PI), accentMat);
    guardRing.position.set(0.05, 0.02, -0.36);
    guardRing.rotation.y = Math.PI / 2;
    guardRing.rotation.z = -0.3;
    group.add(guardRing);

    // ID ring — 暗金
    const idRing = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.012, 8, 16), idRingMat);
    idRing.rotation.x = Math.PI / 2;
    idRing.position.set(0, -0.07, -0.18);
    group.add(idRing);

    return group;
  }

  if (variant === 'grenade') {
    // ── HE Grenade: M67-inspired pineapple body + fuse + safety lever ──
    // 球体主体
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), darkMetal);
    body.position.set(0, 0.0, 0);
    group.add(body);

    // 菠萝纹路 — 环状凸起线条（4条纵向环）
    for (let i = 0; i < 4; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.185, 0.012, 8, 20), accentMat);
      ring.rotation.set(0, 0, 0);
      // 随机旋转让纹路交叉
      ring.rotation.x = Math.PI / 4 + (i * Math.PI / 5);
      ring.rotation.z = (i * Math.PI / 3);
      ring.position.set(0, 0, 0);
      group.add(ring);
    }

    // 纵向凸脊（8条经线）
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const ridge = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.36, 6), darkMetal);
      ridge.position.set(Math.cos(angle) * 0.18, 0, Math.sin(angle) * 0.18);
      ridge.rotation.z = Math.PI / 2;
      ridge.rotation.y = angle;
      group.add(ridge);
    }

    // 顶部颈环
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.06, 12), gripMat);
    neck.position.y = 0.18;
    group.add(neck);

    // 引信柱体
    const fuseBody = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.10, 10), darkMetal);
    fuseBody.position.y = 0.26;
    group.add(fuseBody);

    // 保险拉环底座
    const safetyBase = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.03, 10), accentMat);
    safetyBase.position.y = 0.31;
    group.add(safetyBase);

    // 保险拉环（环形）
    const pinRing = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.015, 8, 14), accentMat);
    pinRing.position.set(0, 0.28, 0.06);
    pinRing.rotation.x = Math.PI / 3;
    group.add(pinRing);

    // 安全杆（从引信延伸到侧面）
    const safetyLever = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.015, 0.18), gripMat);
    safetyLever.position.set(0.07, 0.26, 0.05);
    safetyLever.rotation.z = -0.3;
    group.add(safetyLever);

    // ID ring — 橙色（手雷标记色）
    const idRing = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.01, 8, 16), idRingMat);
    idRing.rotation.x = Math.PI / 2;
    idRing.position.set(0, 0.20, 0);
    group.add(idRing);

    return group;
  }

  if (variant === 'pistol') {
    // Deagle-inspired heavy pistol
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.10, length * 0.85), darkMetal);
    slide.position.set(0, 0.12, -length * 0.32);
    group.add(slide);

    // Slide serrations
    for (let i = 0; i < 6; i++) {
      const serration = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.025, 0.015), darkMetal);
      serration.position.set(0, 0.16, -length * 0.55 + i * 0.035);
      group.add(serration);
    }

    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.13, length * 0.60), darkMetal);
    receiver.position.set(0, 0.02, -length * 0.25);
    group.add(receiver);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, length * 0.55, 16), darkMetal);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.06, -length * 0.76);
    group.add(barrel);

    // Trigger guard
    const triggerGuard = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.01, 6, 12), darkMetal);
    triggerGuard.rotation.x = Math.PI / 2;
    triggerGuard.scale.z = 0.5;
    triggerGuard.position.set(0.01, -0.08, -length * 0.10);
    group.add(triggerGuard);

    // Grip with finger grooves
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.28, 0.16), gripMat);
    grip.rotation.x = -0.30;
    grip.position.set(0.02, -0.20, -length * 0.05);
    group.add(grip);

    // Magazine base plate
    const magPlate = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.14), gripMat);
    magPlate.position.set(0, -0.33, -length * 0.02);
    group.add(magPlate);

    // ID ring — 手枪位
    const idRing = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.01, 8, 16), idRingMat);
    idRing.rotation.x = Math.PI / 2;
    idRing.position.set(0, -0.05, -length * 0.08);
    group.add(idRing);

    return group;
  }

  if (variant === 'sniper') {
    // AWP-inspired — long barrel, scope, bipod
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.15, length * 0.55), darkMetal);
    receiver.position.set(0, 0.01, -length * 0.18);
    group.add(receiver);

    // Long barrel
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.028, length * 0.90, 16), darkMetal);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.03, -length * 0.98);
    group.add(barrel);

    // Barrel fluting
    for (let i = 0; i < 4; i++) {
      const flute = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.005, length * 0.35), darkMetal);
      flute.position.set(0, 0.03, -length * 0.70 - i * 0.06);
      group.add(flute);
    }

    // Muzzle brake
    const muzzleBrake = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.025, 0.08, 16), darkMetal);
    muzzleBrake.rotation.x = Math.PI / 2;
    muzzleBrake.position.set(0, 0.03, -length * 1.28);
    group.add(muzzleBrake);

    // Large scope
    const scopeBody = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.50, 16), scopeMat);
    scopeBody.rotation.z = Math.PI / 2;
    scopeBody.position.set(0, 0.18, -length * 0.22);
    group.add(scopeBody);

    // Scope lens (front)
    const scopeLens = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.048, 0.04, 16), accentMat);
    scopeLens.rotation.z = Math.PI / 2;
    scopeLens.position.set(0.25, 0.18, -length * 0.22);
    group.add(scopeLens);

    // Scope mount rings
    const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.01, 8, 16), accentMat);
    ring1.position.set(-0.08, 0.16, -length * 0.22);
    group.add(ring1);
    const ring2 = ring1.clone();
    ring2.position.set(0.08, 0.16, -length * 0.22);
    group.add(ring2);

    // Bipod
    const bipodLeg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.015, 0.32, 8), darkMetal);
    bipodLeg1.position.set(0.04, -0.14, -length * 0.70);
    bipodLeg1.rotation.z = 0.5;
    group.add(bipodLeg1);
    const bipodLeg2 = bipodLeg1.clone();
    bipodLeg2.position.set(-0.04, -0.14, -length * 0.70);
    bipodLeg2.rotation.z = -0.5;
    group.add(bipodLeg2);

    // Stock
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.40), gripMat);
    stock.position.set(0, -0.01, length * 0.18);
    group.add(stock);

    // Cheek pad on stock
    const cheekPad = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.06, 0.30), darkMetal);
    cheekPad.position.set(0, 0.08, length * 0.18);
    group.add(cheekPad);

    // Bolt handle
    const boltHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.12, 8), accentMat);
    boltHandle.position.set(0.10, 0.05, -length * 0.08);
    boltHandle.rotation.z = Math.PI / 2;
    group.add(boltHandle);

    // ID ring — 狙击位
    const idRing = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.012, 8, 20), idRingMat);
    idRing.rotation.x = Math.PI / 2;
    idRing.position.set(0, 0.02, -length * 0.06);
    group.add(idRing);

    return group;
  }

  if (variant === 'shotgun') {
    // Pump-action shotgun — Nova-inspired
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.16, length * 0.50), darkMetal);
    receiver.position.set(0, 0.02, -length * 0.15);
    group.add(receiver);

    // Double barrel
    const barrel1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, length * 0.80, 16), darkMetal);
    barrel1.rotation.x = Math.PI / 2;
    barrel1.position.set(0.05, 0.05, -length * 0.88);
    group.add(barrel1);

    const barrel2 = barrel1.clone();
    barrel2.position.set(-0.05, 0.05, -length * 0.88);
    group.add(barrel2);

    // Barrel band
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.015, 8, 16), accentMat);
    band.position.set(0, 0.03, -length * 0.50);
    group.add(band);

    // Pump grip
    const pump = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.10, 0.30), woodMat);
    pump.position.set(0, -0.03, -length * 0.66);
    group.add(pump);

    // Pump rails
    const pumpRail1 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.30), darkMetal);
    pumpRail1.position.set(-0.10, 0.01, -length * 0.66);
    group.add(pumpRail1);
    const pumpRail2 = pumpRail1.clone();
    pumpRail2.position.set(0.10, 0.01, -length * 0.66);
    group.add(pumpRail2);

    // Stock
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.13, 0.36), woodMat);
    stock.position.set(0, 0.0, length * 0.15);
    group.add(stock);

    // Receiver top rail
    const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, length * 0.45), darkMetal);
    topRail.position.set(0, 0.10, -length * 0.15);
    group.add(topRail);

    // ID ring — 霰弹位
    const idRing = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.012, 8, 20), idRingMat);
    idRing.rotation.x = Math.PI / 2;
    idRing.position.set(0, 0.04, -length * 0.18);
    group.add(idRing);

    return group;
  }

  if (variant === 'smg') {
    // MP7-inspired SMG — compact with folding stock
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.13, length * 0.55), darkMetal);
    receiver.position.set(0, 0.02, -length * 0.18);
    group.add(receiver);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.028, length * 0.45, 16), darkMetal);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.04, -length * 0.60);
    group.add(barrel);

    // Flash hider
    const flashHider = new THREE.Mesh(new THREE.CylinderGeometry(0.030, 0.025, 0.06, 12), darkMetal);
    flashHider.rotation.x = Math.PI / 2;
    flashHider.position.set(0, 0.04, -length * 0.82);
    group.add(flashHider);

    // Top rail
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, length * 0.50), accentMat);
    rail.position.set(0, 0.08, -length * 0.18);
    group.add(rail);

    // Pistol grip
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.12), gripMat);
    grip.rotation.x = -0.30;
    grip.position.set(0.02, -0.16, -length * 0.05);
    group.add(grip);

    // Foregrip
    const foregrip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.14), gripMat);
    foregrip.rotation.x = 0.15;
    foregrip.position.set(0, -0.12, -length * 0.44);
    group.add(foregrip);

    // Folding stock
    const stockArm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.18), darkMetal);
    stockArm.position.set(0, 0.0, length * 0.10);
    group.add(stockArm);

    const stockPad = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.04), gripMat);
    stockPad.position.set(0, 0.0, length * 0.18);
    group.add(stockPad);

    // Magazine
    const magazine = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.22, 0.12), gripMat);
    magazine.rotation.x = 0.15;
    magazine.position.set(0, -0.18, -length * 0.12);
    group.add(magazine);

    // ID ring — SMG位
    const idRing = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.01, 8, 16), idRingMat);
    idRing.rotation.x = Math.PI / 2;
    idRing.position.set(0, -0.04, -length * 0.06);
    group.add(idRing);

    return group;
  }

  // ═════ Default: Rifle (AK-47 / M4 inspired) ═════
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.16, length * 0.62), darkMetal);
  receiver.position.set(0, 0.02, -length * 0.20);
  group.add(receiver);

  // Barrel
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.030, 0.035, length * 0.62, 16), darkMetal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.05, -length * 0.82);
  group.add(barrel);

  // Muzzle brake / flash hider
  const flashHider = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.030, 0.06, 16), darkMetal);
  flashHider.rotation.x = Math.PI / 2;
  flashHider.position.set(0, 0.05, -length * 1.08);
  group.add(flashHider);

  // Gas block
  const gasBlock = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.10, 0.12), darkMetal);
  gasBlock.position.set(0, 0.04, -length * 0.68);
  group.add(gasBlock);

  // Upper receiver / dust cover
  const upperReceiver = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.04, length * 0.55), darkMetal);
  upperReceiver.position.set(0, 0.10, -length * 0.18);
  group.add(upperReceiver);

  // Carry handle / rear sight
  const carryHandle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.16), darkMetal);
  carryHandle.position.set(0, 0.14, -length * 0.30);
  group.add(carryHandle);

  const rearSight = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.04), darkMetal);
  rearSight.position.set(0, 0.16, -length * 0.26);
  group.add(rearSight);

  // Front sight
  const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.03), darkMetal);
  frontSight.position.set(0, 0.13, -length * 0.68);
  group.add(frontSight);

  // Handguard
  const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.10, 0.38), gripMat);
  handguard.position.set(0, -0.01, -length * 0.64);
  group.add(handguard);

  // Handguard vents
  for (let i = 0; i < 3; i++) {
    const vent = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.015, 0.06), darkMetal);
    vent.position.set(0, 0.0, -length * 0.52 - i * 0.10);
    group.add(vent);
  }

  // Curved magazine (AK style)
  const magGroup = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const seg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.12), gripMat);
    seg.position.set(0, -0.08 + i * 0.035, 0.01 - i * 0.015);
    seg.rotation.x = i * 0.07;
    magGroup.add(seg);
  }
  magGroup.position.set(0, 0, -length * 0.25);
  group.add(magGroup);

  // Pistol grip
  const pistolGrip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.24, 0.12), gripMat);
  pistolGrip.rotation.x = -0.30;
  pistolGrip.position.set(0.02, -0.16, -length * 0.02);
  group.add(pistolGrip);

  // Trigger guard
  const triggerGuard = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.01, 6, 12), darkMetal);
  triggerGuard.rotation.x = Math.PI / 2;
  triggerGuard.scale.z = 0.5;
  triggerGuard.position.set(0.01, -0.08, -length * 0.08);
  group.add(triggerGuard);

  // Stock
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.13, 0.38), gripMat);
  stock.position.set(0, 0.0, length * 0.16);
  group.add(stock);

  // Stock butt plate
  const buttPlate = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.04), darkMetal);
  buttPlate.position.set(0, 0.0, length * 0.34);
  group.add(buttPlate);

  // Charging handle
  const chargingHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.08, 8), accentMat);
  chargingHandle.position.set(0.10, 0.10, -length * 0.40);
  chargingHandle.rotation.z = Math.PI / 2;
  group.add(chargingHandle);

  // ID ring — 步枪位
  const idRing = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.012, 8, 20), idRingMat);
  idRing.rotation.x = Math.PI / 2;
  idRing.position.set(0, -0.05, -length * 0.04);
  group.add(idRing);

  return group;
}

// ── CS:GO CT Counter-Terrorist model ─────────────────────────────────────
function createCTEnemy(): THREE.Object3D {
  const group = new THREE.Group();
  group.userData.faction = 'CT';

  // Materials — CT blue-gray palette
  const armorMat = new THREE.MeshStandardMaterial({ color: 0x334966, roughness: 0.48, metalness: 0.18 });
  const darkMat  = new THREE.MeshStandardMaterial({ color: 0x1c2836, roughness: 0.42, metalness: 0.28 });
  const clothMat = new THREE.MeshStandardMaterial({ color: 0x3a4552, roughness: 0.78, metalness: 0.0  });
  const visorMat = new THREE.MeshStandardMaterial({ color: 0x3a8fe8, roughness: 0.08, metalness: 0.15, emissive: new THREE.Color(0x0a2040), emissiveIntensity: 0.55 });
  const gunMat   = new THREE.MeshStandardMaterial({ color: 0x1a1f28, roughness: 0.22, metalness: 0.78 });
  const pouchMat = new THREE.MeshStandardMaterial({ color: 0x2a3340, roughness: 0.65, metalness: 0.05 });
  const skinMat  = new THREE.MeshStandardMaterial({ color: 0xc4956e, roughness: 0.85, metalness: 0.0  });

  // ── Hips / Belt ──────────────────────────────────────────────────────────
  const hips = new THREE.Mesh(new THREE.CapsuleGeometry(0.20, 0.10, 6, 12), clothMat);
  hips.position.y = 0.96;
  group.add(hips);

  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 8, 24), darkMat);
  belt.position.y = 0.90;
  group.add(belt);

  // ── Left leg ─────────────────────────────────────────────────────────────
  const lLegPivot = new THREE.Group();
  lLegPivot.name = 'left-leg-pivot';
  lLegPivot.position.set(-0.19, 0.96, 0);
  group.add(lLegPivot);

  const lThigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.34, 6, 12), clothMat);
  lThigh.position.y = -0.20;
  lLegPivot.add(lThigh);

  const lKnee = new THREE.Group();
  lKnee.position.y = -0.42;
  lLegPivot.add(lKnee);

  const lShin = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.36, 6, 12), clothMat);
  lShin.position.y = -0.20;
  lKnee.add(lShin);

  // Knee pad
  const lKneePad = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.13), armorMat);
  lKneePad.position.set(0, -0.01, 0.06);
  lKnee.add(lKneePad);

  const lBoot = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.10, 0.30), darkMat);
  lBoot.position.set(0, -0.44, 0.02);
  lKnee.add(lBoot);

  // ── Right leg ────────────────────────────────────────────────────────────
  const rLegPivot = new THREE.Group();
  rLegPivot.name = 'right-leg-pivot';
  rLegPivot.position.set(0.19, 0.96, 0);
  group.add(rLegPivot);

  const rThigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.34, 6, 12), clothMat);
  rThigh.position.y = -0.20;
  rLegPivot.add(rThigh);

  const rKnee = new THREE.Group();
  rKnee.position.y = -0.42;
  rLegPivot.add(rKnee);

  const rShin = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.36, 6, 12), clothMat);
  rShin.position.y = -0.20;
  rKnee.add(rShin);

  const rKneePad = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.13), armorMat);
  rKneePad.position.set(0, -0.01, 0.06);
  rKnee.add(rKneePad);

  const rBoot = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.10, 0.30), darkMat);
  rBoot.position.set(0, -0.44, 0.02);
  rKnee.add(rBoot);

  // ── Torso ────────────────────────────────────────────────────────────────
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.19, 0.48, 8, 16), clothMat);
  torso.position.y = 1.38;
  group.add(torso);

  // Heavy CT body armor — front plate
  const plateFront = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.44, 0.08), armorMat);
  plateFront.position.set(0, 1.40, -0.20);
  group.add(plateFront);

  // Side plates
  const plateLeft = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.38, 0.16), armorMat);
  plateLeft.position.set(-0.24, 1.40, -0.06);
  group.add(plateLeft);

  const plateRight = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.38, 0.16), armorMat);
  plateRight.position.set(0.24, 1.40, -0.06);
  group.add(plateRight);

  // Back plate
  const plateBack = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.40, 0.05), clothMat);
  plateBack.position.set(0, 1.40, 0.18);
  group.add(plateBack);

  // Shoulder pads
  const lPauldron = new THREE.Mesh(new THREE.CapsuleGeometry(0.10, 0.16, 8, 12), armorMat);
  lPauldron.position.set(-0.26, 1.58, 0);
  lPauldron.rotation.z = 0.55;
  group.add(lPauldron);

  const rPauldron = new THREE.Mesh(new THREE.CapsuleGeometry(0.10, 0.16, 8, 12), armorMat);
  rPauldron.position.set(0.26, 1.58, 0);
  rPauldron.rotation.z = -0.55;
  group.add(rPauldron);

  // Pouches on vest
  for (let i = 0; i < 3; i++) {
    const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.10, 0.05), pouchMat);
    pouch.position.set(-0.14 + i * 0.14, 1.28, -0.25);
    group.add(pouch);
  }

  // Radio on left shoulder
  const radio = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.04), darkMat);
  radio.position.set(-0.28, 1.55, -0.10);
  group.add(radio);

  const radioAntenna = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.22, 8), darkMat);
  radioAntenna.position.set(-0.28, 1.66, -0.10);
  group.add(radioAntenna);

  // ── Left arm ─────────────────────────────────────────────────────────────
  const lArmPivot = new THREE.Group();
  lArmPivot.name = 'left-arm-pivot';
  lArmPivot.position.set(-0.23, 1.58, 0);
  group.add(lArmPivot);

  const lUpperArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.28, 6, 12), clothMat);
  lUpperArm.position.y = -0.16;
  lArmPivot.add(lUpperArm);

  // Elbow pad
  const lElbowPad = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.06, 6, 12), armorMat);
  lElbowPad.position.y = -0.30;
  lArmPivot.add(lElbowPad);

  const lElbow = new THREE.Group();
  lElbow.position.y = -0.34;
  lArmPivot.add(lElbow);

  const lForearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.24, 6, 12), clothMat);
  lForearm.position.y = -0.14;
  lElbow.add(lForearm);

  // Glove
  const lGlove = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.10, 0.10), darkMat);
  lGlove.position.set(0, -0.32, -0.02);
  lElbow.add(lGlove);

  // ── Right arm ────────────────────────────────────────────────────────────
  const rArmPivot = new THREE.Group();
  rArmPivot.name = 'right-arm-pivot';
  rArmPivot.position.set(0.23, 1.58, 0);
  group.add(rArmPivot);

  const rUpperArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.28, 6, 12), clothMat);
  rUpperArm.position.y = -0.16;
  rArmPivot.add(rUpperArm);

  const rElbowPad = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.06, 6, 12), armorMat);
  rElbowPad.position.y = -0.30;
  rArmPivot.add(rElbowPad);

  const rElbow = new THREE.Group();
  rElbow.position.y = -0.34;
  rArmPivot.add(rElbow);

  const rForearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.24, 6, 12), clothMat);
  rForearm.position.y = -0.14;
  rElbow.add(rForearm);

  const rGlove = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.10, 0.10), darkMat);
  rGlove.position.set(0, -0.32, -0.02);
  rElbow.add(rGlove);

  // ── Neck ─────────────────────────────────────────────────────────────────
  const neck = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.08, 6, 10), skinMat);
  neck.position.y = 1.80;
  group.add(neck);

  // ── Head ─────────────────────────────────────────────────────────────────
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), skinMat);
  head.name = 'head';
  head.position.y = 2.04;
  group.add(head);

  // CT Helmet — full coverage dome
  const helmetDome = new THREE.Mesh(new THREE.SphereGeometry(0.20, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.58), armorMat);
  helmetDome.position.set(0, 2.06, -0.01);
  group.add(helmetDome);

  // Helmet brim
  const brim = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.04, 0.12), darkMat);
  brim.position.set(0, 1.93, -0.18);
  group.add(brim);

  // Helmet side covers
  const lEarCover = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.10), armorMat);
  lEarCover.position.set(-0.21, 2.05, 0.0);
  group.add(lEarCover);

  const rEarCover = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.10), armorMat);
  rEarCover.position.set(0.21, 2.05, 0.0);
  group.add(rEarCover);

  // Visor / face shield
  const visorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.10, 0.06), darkMat);
  visorFrame.position.set(0, 2.05, -0.18);
  group.add(visorFrame);

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.07, 0.03), visorMat);
  visor.position.set(0, 2.05, -0.22);
  group.add(visor);

  // ── M4-style weapon ──────────────────────────────────────────────────────
  const weaponOrigin = new THREE.Group();
  weaponOrigin.position.set(0.30, 1.28, -0.36);
  weaponOrigin.rotation.set(0.12, -0.15, -0.04);

  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 0.64), gunMat);
  weaponOrigin.add(receiver);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.50, 12), gunMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.02, -0.54);
  weaponOrigin.add(barrel);

  // M4 carry handle
  const carryHandle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.10, 0.16), gunMat);
  carryHandle.position.set(0, 0.10, -0.10);
  weaponOrigin.add(carryHandle);

  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.08), pouchMat);
  mag.rotation.x = -0.22;
  mag.position.set(0, -0.10, -0.06);
  weaponOrigin.add(mag);

  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.06), pouchMat);
  grip.rotation.x = -0.28;
  grip.position.set(0, -0.06, 0.12);
  weaponOrigin.add(grip);

  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.24), pouchMat);
  stock.position.set(0, 0.0, 0.34);
  weaponOrigin.add(stock);

  group.add(weaponOrigin);

  group.traverse(child => {
    if (child instanceof THREE.Mesh) child.castShadow = true;
  });

  return group;
}

// ── CS:GO T Terrorist model ─────────────────────────────────────────────
function createTEnemy(): THREE.Object3D {
  const group = new THREE.Group();
  group.userData.faction = 'T';

  // Materials — T brown/earth palette
  const armorMat  = new THREE.MeshStandardMaterial({ color: 0x4a3828, roughness: 0.55, metalness: 0.08 });
  const darkMat   = new THREE.MeshStandardMaterial({ color: 0x1c1410, roughness: 0.40, metalness: 0.22 });
  const clothMat  = new THREE.MeshStandardMaterial({ color: 0x3a2e22, roughness: 0.82, metalness: 0.0  });
  const wrapMat   = new THREE.MeshStandardMaterial({ color: 0x2a2218, roughness: 0.72, metalness: 0.0  });
  const bandanaMat= new THREE.MeshStandardMaterial({ color: 0x8b2020, roughness: 0.65, metalness: 0.0  });
  const gunMat    = new THREE.MeshStandardMaterial({ color: 0x181a1e, roughness: 0.20, metalness: 0.82 });
  const woodMat   = new THREE.MeshStandardMaterial({ color: 0x5c3a1e, roughness: 0.68, metalness: 0.0  });
  const skinMat   = new THREE.MeshStandardMaterial({ color: 0xd4a574, roughness: 0.80, metalness: 0.0  });

  // ── Hips / Belt ──────────────────────────────────────────────────────────
  const hips = new THREE.Mesh(new THREE.CapsuleGeometry(0.20, 0.10, 6, 12), clothMat);
  hips.position.y = 0.96;
  group.add(hips);

  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 8, 24), darkMat);
  belt.position.y = 0.90;
  group.add(belt);

  // ── Left leg ─────────────────────────────────────────────────────────────
  const lLegPivot = new THREE.Group();
  lLegPivot.name = 'left-leg-pivot';
  lLegPivot.position.set(-0.19, 0.96, 0);
  group.add(lLegPivot);

  const lThigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.34, 6, 12), clothMat);
  lThigh.position.y = -0.20;
  lLegPivot.add(lThigh);

  const lKnee = new THREE.Group();
  lKnee.position.y = -0.42;
  lLegPivot.add(lKnee);

  const lShin = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.36, 6, 12), clothMat);
  lShin.position.y = -0.20;
  lKnee.add(lShin);

  const lBoot = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.10, 0.30), darkMat);
  lBoot.position.set(0, -0.44, 0.02);
  lKnee.add(lBoot);

  // ── Right leg ────────────────────────────────────────────────────────────
  const rLegPivot = new THREE.Group();
  rLegPivot.name = 'right-leg-pivot';
  rLegPivot.position.set(0.19, 0.96, 0);
  group.add(rLegPivot);

  const rThigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.34, 6, 12), clothMat);
  rThigh.position.y = -0.20;
  rLegPivot.add(rThigh);

  const rKnee = new THREE.Group();
  rKnee.position.y = -0.42;
  rLegPivot.add(rKnee);

  const rShin = new THREE.Mesh(new THREE.CapsuleGeometry(0.075, 0.36, 6, 12), clothMat);
  rShin.position.y = -0.20;
  rKnee.add(rShin);

  const rBoot = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.10, 0.30), darkMat);
  rBoot.position.set(0, -0.44, 0.02);
  rKnee.add(rBoot);

  // ── Torso ────────────────────────────────────────────────────────────────
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.19, 0.48, 8, 16), clothMat);
  torso.position.y = 1.38;
  group.add(torso);

  // Tactical vest — lighter than CT
  const vestFront = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.42, 0.06), armorMat);
  vestFront.position.set(0, 1.38, -0.19);
  group.add(vestFront);

  // Vest pouches
  for (const px of [-0.14, 0.0, 0.14]) {
    const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.10, 0.04), darkMat);
    pouch.position.set(px, 1.26, -0.23);
    group.add(pouch);
  }

  // ── Left arm ─────────────────────────────────────────────────────────────
  const lArmPivot = new THREE.Group();
  lArmPivot.name = 'left-arm-pivot';
  lArmPivot.position.set(-0.23, 1.56, 0);
  group.add(lArmPivot);

  const lUpperArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.28, 6, 12), clothMat);
  lUpperArm.position.y = -0.16;
  lArmPivot.add(lUpperArm);

  const lElbow = new THREE.Group();
  lElbow.position.y = -0.34;
  lArmPivot.add(lElbow);

  const lForearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.24, 6, 12), clothMat);
  lForearm.position.y = -0.14;
  lElbow.add(lForearm);

  // Bare hand
  const lHand = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.06, 6, 8), skinMat);
  lHand.position.y = -0.30;
  lElbow.add(lHand);

  // ── Right arm ────────────────────────────────────────────────────────────
  const rArmPivot = new THREE.Group();
  rArmPivot.name = 'right-arm-pivot';
  rArmPivot.position.set(0.23, 1.56, 0);
  group.add(rArmPivot);

  const rUpperArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.28, 6, 12), clothMat);
  rUpperArm.position.y = -0.16;
  rArmPivot.add(rUpperArm);

  const rElbow = new THREE.Group();
  rElbow.position.y = -0.34;
  rArmPivot.add(rElbow);

  const rForearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.24, 6, 12), clothMat);
  rForearm.position.y = -0.14;
  rElbow.add(rForearm);

  const rHand = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.06, 6, 8), skinMat);
  rHand.position.y = -0.30;
  rElbow.add(rHand);

  // ── Neck ─────────────────────────────────────────────────────────────────
  const neck = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.08, 6, 10), skinMat);
  neck.position.y = 1.80;
  group.add(neck);

  // ── Head with balaclava ──────────────────────────────────────────────────
  // Balaclava base
  const balaclava = new THREE.Mesh(new THREE.SphereGeometry(0.19, 16, 12), wrapMat);
  balaclava.name = 'head';
  balaclava.position.y = 2.04;
  group.add(balaclava);

  // Balaclava wrap around neck
  const neckWrap = new THREE.Mesh(new THREE.CapsuleGeometry(0.10, 0.06, 6, 10), wrapMat);
  neckWrap.position.y = 1.92;
  group.add(neckWrap);

  // Eye cutout (skin showing)
  const lEye = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.04), skinMat);
  lEye.position.set(-0.05, 2.08, -0.18);
  group.add(lEye);

  const rEye = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.04), skinMat);
  rEye.position.set(0.05, 2.08, -0.18);
  group.add(rEye);

  // Red bandana on head
  const bandana = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.05, 0.16), bandanaMat);
  bandana.position.set(0, 2.18, 0.0);
  bandana.rotation.x = -0.15;
  group.add(bandana);

  // Bandana tail
  const bandanaTail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.04), bandanaMat);
  bandanaTail.position.set(0.04, 2.14, 0.12);
  bandanaTail.rotation.x = 0.4;
  group.add(bandanaTail);

  // ── AK-47 style weapon ───────────────────────────────────────────────────
  const weaponOrigin = new THREE.Group();
  weaponOrigin.position.set(0.30, 1.26, -0.38);
  weaponOrigin.rotation.set(0.14, -0.18, -0.05);

  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.09, 0.68), gunMat);
  weaponOrigin.add(receiver);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.52, 12), gunMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.02, -0.56);
  weaponOrigin.add(barrel);

  // AK muzzle brake
  const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.017, 0.06, 12), gunMat);
  muzzle.rotation.x = Math.PI / 2;
  muzzle.position.set(0, 0.02, -0.83);
  weaponOrigin.add(muzzle);

  // Curved AK magazine
  const magCurve = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const seg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.07), gunMat);
    seg.position.set(0, -0.10 + i * 0.03, -0.04 - i * 0.012);
    seg.rotation.x = i * 0.06;
    magCurve.add(seg);
  }
  weaponOrigin.add(magCurve);

  // Wooden foregrip
  const foregrip = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.06, 0.24), woodMat);
  foregrip.position.set(0, -0.02, -0.48);
  weaponOrigin.add(foregrip);

  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.06), woodMat);
  grip.rotation.x = -0.30;
  grip.position.set(0, -0.08, 0.14);
  weaponOrigin.add(grip);

  // Wooden stock
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.26), woodMat);
  stock.position.set(0, 0.0, 0.36);
  weaponOrigin.add(stock);

  group.add(weaponOrigin);

  group.traverse(child => {
    if (child instanceof THREE.Mesh) child.castShadow = true;
  });

  return group;
}

export function createFallbackEnemy(): THREE.Object3D {
  // Randomly choose between CT and T models
  return Math.random() < 0.5 ? createCTEnemy() : createTEnemy();
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
  grenade: {
    id: 'grenade',
    kind: 'weapon',
    path: '/assets/models/weapons/grenade.glb',
    scale: 0.48,
    rotation: [0, Math.PI / 2, 0],
    position: [-0.10, -0.06, 0.14],
    preferFallback: false,
    fallback: () => createFallbackWeapon(0x5a6e3a, 0.45, 'grenade')
  },
  enemy_assault: {
    id: 'enemy_assault',
    kind: 'enemy',
    path: '/assets/models/enemies/assault.glb',
    scale: 0.011,
    normalizeHeight: 2.25,
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, 0, 0],
    preferFallback: false,
    fallback: createFallbackEnemy
  }
};
