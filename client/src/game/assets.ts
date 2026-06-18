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

// ══════════════════════════════════════════════════════════════════════
//  独立武器 3D 程序化几何体 — CS:GO 1:1 复刻
// ══════════════════════════════════════════════════════════════════════

/** 通用材质工厂 */
function weaponMats(baseColor: number) {
  const c = new THREE.Color(baseColor);
  return {
    metal:  new THREE.MeshStandardMaterial({ color: c.clone().lerp(new THREE.Color(0x2a2d33), 0.1), metalness: 0.78, roughness: 0.28 }),
    dark:   new THREE.MeshStandardMaterial({ color: 0x1a1c22, roughness: 0.32, metalness: 0.55 }),
    grip:   new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 0.58, metalness: 0.05 }),
    wood:   new THREE.MeshStandardMaterial({ color: 0x4a3018, roughness: 0.62, metalness: 0.02 }),
    accent: new THREE.MeshStandardMaterial({ color: 0xb8943e, metalness: 0.42, roughness: 0.35 }),
    scope:  new THREE.MeshStandardMaterial({ color: 0x101418, metalness: 0.55, roughness: 0.22 }),
    light:  new THREE.MeshStandardMaterial({ color: 0x667080, metalness: 0.65, roughness: 0.25 }),
    idRing: (color: number) => {
      const bc = new THREE.Color(color).multiplyScalar(1.3);
      return new THREE.MeshStandardMaterial({ color: bc, metalness: 0.35, roughness: 0.25, emissive: new THREE.Color(color), emissiveIntensity: 0.18 });
    }
  };
}

// ── AK-47: 弯弹匣 + 木色护木 + 斜切制退器 ──────────────────────────────
function createAK47(): THREE.Object3D {
  const g = new THREE.Group();
  const M = weaponMats(0x4a3a28);
  const len = 1.0;

  // 机匣
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, len * 0.62), M.metal);
  receiver.position.set(0, 0.02, -len * 0.20); g.add(receiver);

  // 枪管
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.030, 0.035, len * 0.58, 16), M.metal);
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.05, -len * 0.82); g.add(barrel);

  // 斜切制退器（AK 标志）
  const brake = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.030, 0.08, 16), M.metal);
  brake.rotation.x = Math.PI / 2; brake.position.set(0, 0.05, -len * 1.08); g.add(brake);
  // 斜切口
  const slantCut = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.05), M.dark);
  slantCut.position.set(0, 0.09, -len * 1.10); slantCut.rotation.x = 0.35; g.add(slantCut);

  // 导气管
  const gasTube = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, len * 0.35, 8), M.metal);
  gasTube.rotation.x = Math.PI / 2; gasTube.position.set(0, 0.11, -len * 0.72); g.add(gasTube);

  // 木色护木
  const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.12, 0.40), M.wood);
  handguard.position.set(0, -0.01, -len * 0.64); g.add(handguard);
  // 护木散热孔
  for (let i = 0; i < 3; i++) {
    const slit = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.015, 0.04), M.dark);
    slit.position.set(0, -0.01, -len * 0.52 - i * 0.10); g.add(slit);
  }

  // 弯弹匣（AK 标志特征）
  const magGrp = new THREE.Group();
  for (let i = 0; i < 7; i++) {
    const seg = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.04, 0.12), M.dark);
    seg.position.set(0, -0.08 + i * 0.035, 0.02 - i * 0.018);
    seg.rotation.x = i * 0.08; magGrp.add(seg);
  }
  magGrp.position.set(0, 0, -len * 0.25); g.add(magGrp);

  // 木色握把
  const pg = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.26, 0.13), M.wood);
  pg.rotation.x = -0.32; pg.position.set(0.02, -0.17, -len * 0.02); g.add(pg);

  // 木色枪托
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.14, 0.38), M.wood);
  stock.position.set(0, 0.0, len * 0.16); g.add(stock);
  // 枪托底板
  const butt = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.15, 0.05), M.dark);
  butt.position.set(0, 0.0, len * 0.34); g.add(butt);

  // 照门 / 准星
  const rearSight = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.06, 0.03), M.dark);
  rearSight.position.set(0, 0.16, -len * 0.30); g.add(rearSight);
  const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.07, 0.02), M.dark);
  frontSight.position.set(0, 0.14, -len * 0.70); g.add(frontSight);

  // 拉机柄
  const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.08, 8), M.accent);
  ch.position.set(0.105, 0.10, -len * 0.42); ch.rotation.z = Math.PI / 2; g.add(ch);

  // ID 环
  const idR = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.012, 8, 20), M.idRing(0x4a3a28));
  idR.rotation.x = Math.PI / 2; idR.position.set(0, -0.06, -len * 0.04); g.add(idR);

  return g;
}

// ── M4A1-S: 消音器 + 提把 + 直弹匣 ────────────────────────────────────
function createM4A1S(): THREE.Object3D {
  const g = new THREE.Group();
  const M = weaponMats(0x3d4655);
  const len = 0.95;

  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.15, len * 0.62), M.metal);
  receiver.position.set(0, 0.02, -len * 0.20); g.add(receiver);

  // 消音器（M4A1-S 最大特征）
  const supp = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.030, 0.22, 16), M.dark);
  supp.rotation.x = Math.PI / 2; supp.position.set(0, 0.05, -len * 1.05); g.add(supp);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.030, len * 0.38, 16), M.metal);
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.05, -len * 0.82); g.add(barrel);

  // 提把（M4 标志）
  const carryHandle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.10, 0.20), M.metal);
  carryHandle.position.set(0, 0.16, -len * 0.32); g.add(carryHandle);
  const chTop = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.04, 0.20), M.dark);
  chTop.position.set(0, 0.20, -len * 0.32); g.add(chTop);

  // 直弹匣
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.28, 0.12), M.dark);
  mag.rotation.x = 0.08; mag.position.set(0, -0.16, -len * 0.18); g.add(mag);

  const pg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.24, 0.12), M.grip);
  pg.rotation.x = -0.30; pg.position.set(0.02, -0.16, len * 0.02); g.add(pg);

  // 护木（光滑圆柱形 — 消音版特征）
  const hg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.28, 12), M.grip);
  hg.rotation.z = Math.PI / 2; hg.position.set(0, -0.02, -len * 0.58); g.add(hg);

  // 伸缩托
  const stockArm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.24), M.metal);
  stockArm.position.set(0, 0.01, len * 0.22); g.add(stockArm);
  const stockPad = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.05), M.grip);
  stockPad.position.set(0, 0.01, len * 0.34); g.add(stockPad);

  const idR = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.012, 8, 20), M.idRing(0x3d4655));
  idR.rotation.x = Math.PI / 2; idR.position.set(0, -0.05, len * 0.04); g.add(idR);

  return g;
}

// ── M4A4: 无消音器 + 四面轨护木 ───────────────────────────────────────
function createM4A4(): THREE.Object3D {
  const g = new THREE.Group();
  const M = weaponMats(0x45515c);
  const len = 0.95;

  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.15, len * 0.62), M.metal);
  receiver.position.set(0, 0.02, -len * 0.20); g.add(receiver);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.030, len * 0.50, 16), M.metal);
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.05, -len * 0.88); g.add(barrel);

  // 鸟笼火帽（无消音器）
  const fh = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.028, 0.07, 12), M.metal);
  fh.rotation.x = Math.PI / 2; fh.position.set(0, 0.05, -len * 1.08); g.add(fh);
  // 火帽槽口
  for (let i = 0; i < 3; i++) {
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.03), M.dark);
    slot.position.set(0, i * 0.02 + 0.03, -len * 1.08); g.add(slot);
  }

  // 提把
  const carryHandle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.10, 0.20), M.metal);
  carryHandle.position.set(0, 0.16, -len * 0.32); g.add(carryHandle);
  const chTop = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.04, 0.20), M.dark);
  chTop.position.set(0, 0.20, -len * 0.32); g.add(chTop);

  // 直弹匣
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.28, 0.12), M.dark);
  mag.rotation.x = 0.08; mag.position.set(0, -0.16, -len * 0.18); g.add(mag);

  const pg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.24, 0.12), M.grip);
  pg.rotation.x = -0.30; pg.position.set(0.02, -0.16, len * 0.02); g.add(pg);

  // 四面轨护木（比 M4A1-S 更方）
  const hg = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.12, 0.30), M.dark);
  hg.position.set(0, -0.02, -len * 0.60); g.add(hg);
  // 导轨刻线
  for (let i = 0; i < 5; i++) {
    const railMark = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.01, 0.02), M.metal);
    railMark.position.set(0, 0.04, -len * 0.50 - i * 0.05); g.add(railMark);
  }

  const stockArm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.24), M.metal);
  stockArm.position.set(0, 0.01, len * 0.22); g.add(stockArm);
  const stockPad = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.05), M.grip);
  stockPad.position.set(0, 0.01, len * 0.34); g.add(stockPad);

  const idR = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.012, 8, 20), M.idRing(0x45515c));
  idR.rotation.x = Math.PI / 2; idR.position.set(0, -0.05, len * 0.04); g.add(idR);

  return g;
}

// ── AWP: 长枪管 + 大瞄准镜 + 两脚架 ──────────────────────────────────
function createAWP(): THREE.Object3D {
  const g = new THREE.Group();
  const M = weaponMats(0x2a3040);
  const len = 1.12;

  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.15, len * 0.55), M.metal);
  receiver.position.set(0, 0.01, -len * 0.18); g.add(receiver);

  // 超长重型枪管
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.030, len * 0.90, 20), M.metal);
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.03, -len * 0.98); g.add(barrel);

  // 枪管凹槽
  for (let i = 0; i < 6; i++) {
    const flute = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.005, len * 0.08), M.dark);
    flute.position.set(0, 0.03, -len * 0.70 - i * 0.08); g.add(flute);
  }

  // 制退器
  const brake = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.026, 0.08, 16), M.metal);
  brake.rotation.x = Math.PI / 2; brake.position.set(0, 0.03, -len * 1.28); g.add(brake);

  // 大瞄准镜（AWP 标志）
  const scopeBody = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.55, 16), M.scope);
  scopeBody.rotation.z = Math.PI / 2; scopeBody.position.set(0, 0.19, -len * 0.22); g.add(scopeBody);
  // 前镜片
  const scopeLens = new THREE.Mesh(new THREE.CylinderGeometry(0.060, 0.050, 0.05, 16), M.accent);
  scopeLens.rotation.z = Math.PI / 2; scopeLens.position.set(0.28, 0.19, -len * 0.22); g.add(scopeLens);
  // 镜环
  for (const x of [-0.12, 0.0, 0.12]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.01, 8, 16), M.accent);
    ring.position.set(x, 0.16, -len * 0.22); g.add(ring);
  }

  // 两脚架
  for (const dx of [0.05, -0.05]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.016, 0.35, 8), M.metal);
    leg.position.set(dx, -0.16, -len * 0.68);
    leg.rotation.z = dx > 0 ? 0.45 : -0.45; g.add(leg);
  }

  // 弹匣
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.10), M.dark);
  mag.position.set(0, -0.08, -len * 0.18); g.add(mag);

  // 枪托 + 贴腮垫
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.14, 0.42), M.grip);
  stock.position.set(0, -0.01, len * 0.18); g.add(stock);
  const cheek = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.07, 0.32), M.dark);
  cheek.position.set(0, 0.09, len * 0.18); g.add(cheek);

  // 枪机拉柄
  const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.14, 8), M.accent);
  bolt.position.set(0.11, 0.06, -len * 0.08); bolt.rotation.z = Math.PI / 2; g.add(bolt);

  const idR = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.012, 8, 20), M.idRing(0x2a3040));
  idR.rotation.x = Math.PI / 2; idR.position.set(0, 0.02, -len * 0.06); g.add(idR);

  return g;
}

// ── SSG 08: 轻量狙击 ─────────────────────────────────────────────────
function createSSG08(): THREE.Object3D {
  const g = new THREE.Group();
  const M = weaponMats(0x3a4050);
  const len = 1.05;

  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.13, len * 0.50), M.metal);
  receiver.position.set(0, 0.01, -len * 0.16); g.add(receiver);

  // 细枪管
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.024, len * 0.85, 16), M.metal);
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.03, -len * 0.90); g.add(barrel);
  const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.020, 0.06, 12), M.dark);
  muzzle.rotation.x = Math.PI / 2; muzzle.position.set(0, 0.03, -len * 1.20); g.add(muzzle);

  // 短瞄准镜
  const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.32, 12), M.scope);
  scope.rotation.z = Math.PI / 2; scope.position.set(0, 0.16, -len * 0.20); g.add(scope);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.038, 0.04, 12), M.accent);
  lens.rotation.z = Math.PI / 2; lens.position.set(0.16, 0.16, -len * 0.20); g.add(lens);

  // 轻型脚架
  for (const dx of [0.04, -0.04]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.010, 0.22, 8), M.metal);
    leg.position.set(dx, -0.12, -len * 0.60);
    leg.rotation.z = dx > 0 ? 0.4 : -0.4; g.add(leg);
  }

  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.15, 0.08), M.dark);
  mag.position.set(0, -0.06, -len * 0.14); g.add(mag);

  const pg = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.20, 0.10), M.grip);
  pg.rotation.x = -0.28; pg.position.set(0.02, -0.14, len * 0.02); g.add(pg);

  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 0.34), M.grip);
  stock.position.set(0, 0.0, len * 0.16); g.add(stock);

  const idR = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.01, 8, 16), M.idRing(0x3a4050));
  idR.rotation.x = Math.PI / 2; idR.position.set(0, 0.0, -len * 0.04); g.add(idR);

  return g;
}

// ── SCAR-20: 自动狙击 ─────────────────────────────────────────────────
function createSCAR20(): THREE.Object3D {
  const g = new THREE.Group();
  const M = weaponMats(0x4a5040);
  const len = 1.05;

  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.15, len * 0.60), M.metal);
  receiver.position.set(0, 0.02, -len * 0.18); g.add(receiver);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, len * 0.60, 16), M.metal);
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.04, -len * 0.82); g.add(barrel);
  const brake = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.028, 0.07, 16), M.dark);
  brake.rotation.x = Math.PI / 2; brake.position.set(0, 0.04, -len * 1.12); g.add(brake);

  // 瞄准镜
  const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.35, 12), M.scope);
  scope.rotation.z = Math.PI / 2; scope.position.set(0, 0.18, -len * 0.22); g.add(scope);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.046, 0.04, 12), M.accent);
  lens.rotation.z = Math.PI / 2; lens.position.set(0.18, 0.18, -len * 0.22); g.add(lens);

  // 大弹匣
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.30, 0.13), M.dark);
  mag.rotation.x = 0.06; mag.position.set(0, -0.18, -len * 0.18); g.add(mag);

  const pg = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.26, 0.13), M.grip);
  pg.rotation.x = -0.30; pg.position.set(0.02, -0.17, len * 0.02); g.add(pg);

  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.13, 0.36), M.grip);
  stock.position.set(0, 0.0, len * 0.16); g.add(stock);

  const idR = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.012, 8, 20), M.idRing(0x4a5040));
  idR.rotation.x = Math.PI / 2; idR.position.set(0, -0.05, len * 0.02); g.add(idR);

  return g;
}

// ── G3SG1: G3 枪身自动狙击 ────────────────────────────────────────────
function createG3SG1(): THREE.Object3D {
  const g = new THREE.Group();
  const M = weaponMats(0x3d3a30);
  const len = 1.05;

  // G3 风格长机匣
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.14, len * 0.68), M.metal);
  receiver.position.set(0, 0.02, -len * 0.20); g.add(receiver);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.030, len * 0.55, 16), M.metal);
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.04, -len * 0.82); g.add(barrel);
  const brake = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.026, 0.07, 16), M.dark);
  brake.rotation.x = Math.PI / 2; brake.position.set(0, 0.04, -len * 1.10); g.add(brake);

  // G3 转鼓照门
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.04, 8), M.accent);
  drum.rotation.z = Math.PI / 2; drum.position.set(0, 0.15, -len * 0.35); g.add(drum);

  // 低矮瞄准镜
  const scope = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.28), M.scope);
  scope.position.set(0, 0.16, -len * 0.40); g.add(scope);

  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.26, 0.12), M.dark);
  mag.rotation.x = 0.06; mag.position.set(0, -0.16, -len * 0.18); g.add(mag);

  const pg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.24, 0.12), M.grip);
  pg.rotation.x = -0.30; pg.position.set(0.02, -0.16, len * 0.02); g.add(pg);

  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.13, 0.38), M.grip);
  stock.position.set(0, 0.0, len * 0.18); g.add(stock);
  const butt = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.05), M.dark);
  butt.position.set(0, 0.0, len * 0.36); g.add(butt);

  const idR = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.012, 8, 20), M.idRing(0x3d3a30));
  idR.rotation.x = Math.PI / 2; idR.position.set(0, -0.05, len * 0.02); g.add(idR);

  return g;
}

// ── FAMAS: 无托步枪 ───────────────────────────────────────────────────
function createFAMAS(): THREE.Object3D {
  const g = new THREE.Group();
  const M = weaponMats(0x3a3d48);
  const len = 0.85;

  // 长机匣（无托式 — 全长度）
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, len * 0.80), M.metal);
  receiver.position.set(0, 0.02, -len * 0.10); g.add(receiver);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.028, len * 0.40, 16), M.metal);
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.04, -len * 0.70); g.add(barrel);
  const fh = new THREE.Mesh(new THREE.CylinderGeometry(0.030, 0.024, 0.06, 12), M.dark);
  fh.rotation.x = Math.PI / 2; fh.position.set(0, 0.04, -len * 0.90); g.add(fh);

  // 大型提把（FAMAS 标志）
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.12, 0.35), M.metal);
  handle.position.set(0, 0.14, -len * 0.22); g.add(handle);
  const hTop = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.04, 0.35), M.dark);
  hTop.position.set(0, 0.19, -len * 0.22); g.add(hTop);
  // 提把孔
  for (let i = 0; i < 5; i++) {
    const hole = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.03), M.dark);
    hole.position.set(0, 0.15, -len * 0.10 - i * 0.06); g.add(hole);
  }

  // 弹匣（后置 — 无托特征）
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.24, 0.11), M.dark);
  mag.rotation.x = 0.06; mag.position.set(0, -0.14, len * 0.18); g.add(mag);

  const pg = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.22, 0.11), M.grip);
  pg.rotation.x = -0.28; pg.position.set(0.02, -0.14, len * 0.06); g.add(pg);

  const idR = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.01, 8, 16), M.idRing(0x3a3d48));
  idR.rotation.x = Math.PI / 2; idR.position.set(0, -0.04, len * 0.04); g.add(idR);

  return g;
}

// ── Galil AR: 弯弹匣 + 折叠托 ─────────────────────────────────────────
function createGalil(): THREE.Object3D {
  const g = new THREE.Group();
  const M = weaponMats(0x3a3528);
  const len = 0.90;

  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.14, len * 0.60), M.metal);
  receiver.position.set(0, 0.02, -len * 0.18); g.add(receiver);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, len * 0.55, 16), M.metal);
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.04, -len * 0.78); g.add(barrel);
  const brake = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.028, 0.06, 12), M.dark);
  brake.rotation.x = Math.PI / 2; brake.position.set(0, 0.04, -len * 1.02); g.add(brake);

  // 导气管
  const gas = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, len * 0.32, 8), M.metal);
  gas.rotation.x = Math.PI / 2; gas.position.set(0, 0.11, -len * 0.70); g.add(gas);

  // 弯弹匣
  const magGrp = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const seg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.12), M.dark);
    seg.position.set(0, -0.08 + i * 0.035, 0.01 - i * 0.015);
    seg.rotation.x = i * 0.07; magGrp.add(seg);
  }
  magGrp.position.set(0, 0, -len * 0.22); g.add(magGrp);

  const pg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.24, 0.12), M.grip);
  pg.rotation.x = -0.30; pg.position.set(0.02, -0.16, len * 0.02); g.add(pg);

  // 折叠托
  const stockArm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.22), M.metal);
  stockArm.position.set(0, 0.0, len * 0.18); g.add(stockArm);
  const stockPad = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.13, 0.04), M.grip);
  stockPad.position.set(0, 0.0, len * 0.28); g.add(stockPad);

  const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.02), M.dark);
  frontSight.position.set(0, 0.13, -len * 0.65); g.add(frontSight);

  const idR = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.01, 8, 20), M.idRing(0x3a3528));
  idR.rotation.x = Math.PI / 2; idR.position.set(0, -0.04, len * 0.04); g.add(idR);

  return g;
}

// ── SG 553: 全尺寸步枪 + 集成瞄准镜 ──────────────────────────────────
function createSG553(): THREE.Object3D {
  const g = new THREE.Group();
  const M = weaponMats(0x3d4248);
  const len = 0.95;

  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.15, len * 0.62), M.metal);
  receiver.position.set(0, 0.02, -len * 0.20); g.add(receiver);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.030, 0.034, len * 0.58, 16), M.metal);
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.04, -len * 0.82); g.add(barrel);
  const brake = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.030, 0.07, 16), M.dark);
  brake.rotation.x = Math.PI / 2; brake.position.set(0, 0.04, -len * 1.08); g.add(brake);

  // SG 集成瞄准镜（中大型）
  const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.30, 12), M.scope);
  scope.rotation.z = Math.PI / 2; scope.position.set(0, 0.17, -len * 0.22); g.add(scope);
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.040, 0.04, 12), M.accent);
  lens.rotation.z = Math.PI / 2; lens.position.set(0.15, 0.17, -len * 0.22); g.add(lens);

  // 弯弹匣
  const magGrp = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    const seg = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.04, 0.12), M.dark);
    seg.position.set(0, -0.08 + i * 0.034, 0.02 - i * 0.016);
    seg.rotation.x = i * 0.07; magGrp.add(seg);
  }
  magGrp.position.set(0, 0, -len * 0.24); g.add(magGrp);

  const pg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.24, 0.12), M.grip);
  pg.rotation.x = -0.30; pg.position.set(0.02, -0.16, -len * 0.02); g.add(pg);

  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.13, 0.36), M.grip);
  stock.position.set(0, 0.0, len * 0.16); g.add(stock);

  const idR = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.012, 8, 20), M.idRing(0x3d4248));
  idR.rotation.x = Math.PI / 2; idR.position.set(0, -0.05, -len * 0.02); g.add(idR);

  return g;
}

// ── AUG: 无托 + 集成瞄准镜 ───────────────────────────────────────────
function createAUG(): THREE.Object3D {
  const g = new THREE.Group();
  const M = weaponMats(0x3d4840);
  const len = 0.90;

  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.14, len * 0.78), M.metal);
  receiver.position.set(0, 0.02, -len * 0.10); g.add(receiver);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.030, len * 0.42, 16), M.metal);
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.04, -len * 0.68); g.add(barrel);
  const fh = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.026, 0.06, 12), M.dark);
  fh.rotation.x = Math.PI / 2; fh.position.set(0, 0.04, -len * 0.88); g.add(fh);

  // AUG 标志性集成瞄准镜（小型方形）
  const scope = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.22), M.scope);
  scope.position.set(0, 0.14, -len * 0.28); g.add(scope);
  const lens = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.03), M.accent);
  lens.position.set(0, 0.14, -len * 0.18); g.add(lens);

  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.24, 0.12), M.dark);
  mag.rotation.x = 0.06; mag.position.set(0, -0.16, len * 0.20); g.add(mag);

  const pg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.24, 0.12), M.grip);
  pg.rotation.x = -0.28; pg.position.set(0.02, -0.15, len * 0.06); g.add(pg);

  const idR = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.01, 8, 16), M.idRing(0x3d4840));
  idR.rotation.x = Math.PI / 2; idR.position.set(0, -0.04, len * 0.04); g.add(idR);

  return g;
}

// ── P90: 顶部水平弹匣 PDW ────────────────────────────────────────────
function createP90(): THREE.Object3D {
  const g = new THREE.Group();
  const M = weaponMats(0x3a3d44);
  const len = 0.72;

  // 紧凑机匣
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, len * 0.65), M.metal);
  receiver.position.set(0, 0.0, -len * 0.14); g.add(receiver);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.025, len * 0.38, 12), M.metal);
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.02, -len * 0.56); g.add(barrel);
  const fh = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.022, 0.05, 10), M.dark);
  fh.rotation.x = Math.PI / 2; fh.position.set(0, 0.02, -len * 0.74); g.add(fh);

  // 顶部水平弹匣（P90 标志）
  const topMag = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, len * 0.45), M.dark);
  topMag.position.set(0, 0.08, -len * 0.16); g.add(topMag);

  // 拇指孔握把
  const thumbGrip = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.20, 0.10), M.grip);
  thumbGrip.position.set(0, -0.12, len * 0.16); g.add(thumbGrip);
  // 拇指孔
  const hole = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.12), M.dark);
  hole.position.set(0, -0.08, len * 0.16); g.add(hole);

  // 前握把
  const fg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.09, 0.10), M.grip);
  fg.position.set(0, -0.08, -len * 0.36); g.add(fg);

  const idR = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.01, 8, 16), M.idRing(0x3a3d44));
  idR.rotation.x = Math.PI / 2; idR.position.set(0, -0.03, -len * 0.06); g.add(idR);

  return g;
}

// ── PP-Bizon: 螺旋弹筒 SMG ──────────────────────────────────────────
function createPPBizon(): THREE.Object3D {
  const g = new THREE.Group();
  const M = weaponMats(0x3d3a35);
  const len = 0.68;

  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, len * 0.58), M.metal);
  receiver.position.set(0, 0.02, -len * 0.16); g.add(receiver);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.028, len * 0.42, 14), M.metal);
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.04, -len * 0.58); g.add(barrel);
  const fh = new THREE.Mesh(new THREE.CylinderGeometry(0.030, 0.024, 0.05, 10), M.dark);
  fh.rotation.x = Math.PI / 2; fh.position.set(0, 0.04, -len * 0.78); g.add(fh);

  // 螺旋弹筒（PP-Bizon 标志）
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.08, 20), M.dark);
  drum.rotation.z = Math.PI / 2; drum.position.set(0, -0.04, -len * 0.16); g.add(drum);
  // 弹筒纹路
  for (let i = 0; i < 5; i++) {
    const ridge = new THREE.Mesh(new THREE.TorusGeometry(0.082, 0.006, 6, 20), M.metal);
    ridge.position.set(0, -0.02 + i * 0.02, -0.002); g.add(ridge);
  }

  const pg = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.18, 0.10), M.grip);
  pg.rotation.x = -0.28; pg.position.set(0.02, -0.14, len * 0.08); g.add(pg);

  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.16), M.metal);
  stock.position.set(0, 0.0, len * 0.20); g.add(stock);

  const idR = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.008, 8, 16), M.idRing(0x3d3a35));
  idR.rotation.x = Math.PI / 2; idR.position.set(0, -0.03, len * 0.06); g.add(idR);

  return g;
}

// ── MP5-SD: 一体消音器 SMG ───────────────────────────────────────────
function createMP5SD(): THREE.Object3D {
  const g = new THREE.Group();
  const M = weaponMats(0x2d333a);
  const len = 0.72;

  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.12, len * 0.58), M.metal);
  receiver.position.set(0, 0.02, -len * 0.12); g.add(receiver);

  // 一体消音器（MP5-SD 最大特征）
  const supp = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.030, 0.20, 16), M.dark);
  supp.rotation.x = Math.PI / 2; supp.position.set(0, 0.03, -len * 0.65); g.add(supp);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.028, len * 0.30, 12), M.metal);
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.03, -len * 0.45); g.add(barrel);

  // 弹匣
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.20, 0.10), M.dark);
  mag.rotation.x = 0.08; mag.position.set(0, -0.12, -len * 0.10); g.add(mag);

  const pg = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.20, 0.10), M.grip);
  pg.rotation.x = -0.26; pg.position.set(0.02, -0.14, len * 0.06); g.add(pg);

  // 固定托
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.11, 0.24), M.grip);
  stock.position.set(0, 0.01, len * 0.18); g.add(stock);
  const butt = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 0.04), M.dark);
  butt.position.set(0, 0.01, len * 0.30); g.add(butt);

  const idR = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.01, 8, 16), M.idRing(0x2d333a));
  idR.rotation.x = Math.PI / 2; idR.position.set(0, -0.03, -len * 0.04); g.add(idR);

  return g;
}

// ── MP9: T 形 SMG ─────────────────────────────────────────────────────
function createMP9(): THREE.Object3D {
  const g = new THREE.Group();
  const M = weaponMats(0x32383e);
  const len = 0.68;

  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.11, len * 0.60), M.metal);
  receiver.position.set(0, 0.02, -len * 0.12); g.add(receiver);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.024, len * 0.35, 12), M.metal);
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.03, -len * 0.50); g.add(barrel);
  const fh = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.020, 0.05, 10), M.dark);
  fh.rotation.x = Math.PI / 2; fh.position.set(0, 0.03, -len * 0.66); g.add(fh);

  // T 形顶部（MP9 标志）
  const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.03, len * 0.35), M.metal);
  topRail.position.set(0, 0.08, -len * 0.18); g.add(topRail);
  // 顶部弹匣插口
  const topMag = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.03, 0.06), M.dark);
  topMag.position.set(0, 0.10, -len * 0.24); g.add(topMag);

  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.20, 0.09), M.dark);
  mag.rotation.x = 0.08; mag.position.set(0, -0.12, -len * 0.12); g.add(mag);

  const pg = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.18, 0.10), M.grip);
  pg.rotation.x = -0.26; pg.position.set(0.02, -0.12, len * 0.04); g.add(pg);

  const fg = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.10), M.grip);
  fg.rotation.x = 0.2; fg.position.set(0, -0.06, -len * 0.36); g.add(fg);

  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.14), M.metal);
  stock.position.set(0, 0.0, len * 0.16); g.add(stock);

  const idR = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.008, 8, 16), M.idRing(0x32383e));
  idR.rotation.x = Math.PI / 2; idR.position.set(0, -0.02, -len * 0.02); g.add(idR);

  return g;
}

// ── MAC-10: 方盒子 SMG ───────────────────────────────────────────────
function createMAC10(): THREE.Object3D {
  const g = new THREE.Group();
  const M = weaponMats(0x353028);
  const len = 0.65;

  // 方形机匣（MAC-10 特征）
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, len * 0.50), M.metal);
  receiver.position.set(0, 0.01, -len * 0.10); g.add(receiver);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.024, len * 0.35, 12), M.metal);
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.03, -len * 0.48); g.add(barrel);
  const brake = new THREE.Mesh(new THREE.CylinderGeometry(0.030, 0.020, 0.06, 12), M.dark);
  brake.rotation.x = Math.PI / 2; brake.position.set(0, 0.03, -len * 0.64); g.add(brake);

  // 长弹匣
  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.26, 0.12), M.dark);
  mag.rotation.x = 0.08; mag.position.set(0, -0.18, -len * 0.08); g.add(mag);

  const pg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.12), M.grip);
  pg.rotation.x = -0.26; pg.position.set(0.02, -0.15, len * 0.02); g.add(pg);

  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.18), M.metal);
  stock.position.set(0, 0.0, len * 0.16); g.add(stock);

  const idR = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.008, 8, 16), M.idRing(0x353028));
  idR.rotation.x = Math.PI / 2; idR.position.set(0, -0.03, -len * 0.02); g.add(idR);

  return g;
}

// ── Sawed-Off: 短管双管霰弹 ───────────────────────────────────────────
function createSawedOff(): THREE.Object3D {
  const g = new THREE.Group();
  const M = weaponMats(0x3a2818);

  // 短机匣
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.10, 0.26), M.metal);
  receiver.position.set(0, 0.0, 0.05); g.add(receiver);

  // 截短双管
  for (const dy of [0.04, -0.04]) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.22, 12), M.metal);
    b.rotation.x = Math.PI / 2; b.position.set(0, dy, -0.22); g.add(b);
  }

  // 截断握把
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.20, 0.10), M.wood);
  grip.rotation.x = -0.25; grip.position.set(0, -0.14, 0.18); g.add(grip);

  // 短枪托
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.12), M.wood);
  stock.position.set(0, 0.01, 0.22); g.add(stock);

  const idR = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.008, 8, 16), M.idRing(0x3a2818));
  idR.rotation.x = Math.PI / 2; idR.position.set(0, -0.01, 0.06); g.add(idR);

  return g;
}

// ── Desert Eagle: 大型手枪 ───────────────────────────────────────────
function createDesertEagle(): THREE.Object3D {
  const g = new THREE.Group();
  const M = weaponMats(0x3a4048);
  const len = 0.62;

  // 大滑套
  const slide = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.11, len * 0.80), M.metal);
  slide.position.set(0, 0.12, -len * 0.30); g.add(slide);

  // 滑套防滑纹
  for (let i = 0; i < 7; i++) {
    const serr = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 0.015), M.dark);
    serr.position.set(0, 0.17, -len * 0.52 + i * 0.035); g.add(serr);
  }

  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, len * 0.55), M.metal);
  receiver.position.set(0, 0.02, -len * 0.22); g.add(receiver);

  // 长枪管
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.030, len * 0.50, 16), M.metal);
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.07, -len * 0.72); g.add(barrel);

  // 制退器端口
  const port = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.06, 0.06), M.dark);
  port.position.set(0, 0.07, -len * 0.88); g.add(port);

  const tg = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.012, 6, 12), M.dark);
  tg.rotation.x = Math.PI / 2; tg.scale.z = 0.5;
  tg.position.set(0.01, -0.08, -len * 0.08); g.add(tg);

  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.30, 0.16), M.grip);
  grip.rotation.x = -0.30; grip.position.set(0.02, -0.22, -len * 0.03); g.add(grip);

  const magPlate = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.04, 0.15), M.dark);
  magPlate.position.set(0, -0.35, -len * 0.02); g.add(magPlate);

  const idR = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.01, 8, 16), M.idRing(0x3a4048));
  idR.rotation.x = Math.PI / 2; idR.position.set(0, -0.06, -len * 0.06); g.add(idR);

  return g;
}

// ── R8 Revolver: 转轮手枪 ────────────────────────────────────────────
function createR8(): THREE.Object3D {
  const g = new THREE.Group();
  const M = weaponMats(0x3a3428);
  const len = 0.60;

  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, len * 0.50), M.metal);
  receiver.position.set(0, 0.02, -len * 0.20); g.add(receiver);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.026, len * 0.45, 14), M.metal);
  barrel.rotation.x = Math.PI / 2; barrel.position.set(0, 0.06, -len * 0.62); g.add(barrel);

  // 转轮
  const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.042, 0.10, 8), M.dark);
  cylinder.rotation.z = Math.PI / 2; cylinder.position.set(0, 0.0, -len * 0.22); g.add(cylinder);

  const tg = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.01, 6, 12), M.dark);
  tg.rotation.x = Math.PI / 2; tg.scale.z = 0.5;
  tg.position.set(0.01, -0.06, -len * 0.06); g.add(tg);

  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.28, 0.14), M.wood);
  grip.rotation.x = -0.28; grip.position.set(0.02, -0.20, -len * 0.02); g.add(grip);

  const idR = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.01, 8, 16), M.idRing(0x3a3428));
  idR.rotation.x = Math.PI / 2; idR.position.set(0, -0.04, -len * 0.04); g.add(idR);

  return g;
}

// ── Zeus x27: 电击枪 ─────────────────────────────────────────────────
function createZeus(): THREE.Object3D {
  const g = new THREE.Group();
  const M = weaponMats(0x5a5030);

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.10, 0.40), M.dark);
  body.position.set(0, 0.02, 0.0); g.add(body);

  // 电极
  for (const dy of [0.03, -0.03]) {
    const prong = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.18, 8), M.accent);
    prong.rotation.x = Math.PI / 2; prong.position.set(0, dy, -0.26); g.add(prong);
    // 电弧尖端
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.03, 8), M.accent);
    tip.rotation.x = Math.PI / 2; tip.position.set(0, dy, -0.36); g.add(tip);
  }

  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.24, 0.10), M.grip);
  grip.rotation.x = -0.22; grip.position.set(0.02, -0.16, 0.22); g.add(grip);

  const idR = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.01, 8, 16), M.idRing(0x5a5030));
  idR.rotation.x = Math.PI / 2; idR.position.set(0, -0.02, 0.06); g.add(idR);

  return g;
}

// ══════════════════════════════════════════════════════════════════════
//  武器创建分发器 — 根据 weaponId 返回对应 3D 几何体
// ══════════════════════════════════════════════════════════════════════
export function createSpecificWeapon(weaponId: string): THREE.Object3D {
  const builders: Record<string, () => THREE.Object3D> = {
    // 步枪
    ak47: createAK47,
    rifle: createAK47,       // 旧别名
    vandal: createAK47,      // 旧别名
    m4a1s: createM4A1S,
    sentinel: createM4A1S,   // 旧别名
    m4a4: createM4A4,
    defender_rifle: createM4A4,
    awp: createAWP,
    sniper: createAWP,       // 旧别名
    operator: createAWP,     // 旧别名
    ssg08: createSSG08,
    scar20: createSCAR20,
    g3sg1: createG3SG1,
    famas: createFAMAS,
    galil: createGalil,
    sg553: createSG553,
    aug: createAUG,

    // SMG
    p90: createP90,
    pp_bizon: createPPBizon,
    mp5sd: createMP5SD,
    mp7: () => createFallbackWeapon(0x3a4048, 0.72, 'smg'),
    mp9: createMP9,
    mac10: createMAC10,
    ump45: () => createFallbackWeapon(0x3a3a35, 0.70, 'smg'),
    smg: () => createFallbackWeapon(0x3a4048, 0.72, 'smg'),
    specter: () => createFallbackWeapon(0x3a4048, 0.72, 'smg'),

    // 手枪
    deagle: createDesertEagle,
    heavy_pistol: createDesertEagle,
    r8: createR8,
    pistol: () => createFallbackWeapon(0x3f4650, 0.55, 'pistol'),
    sidearm: () => createFallbackWeapon(0x3f4650, 0.55, 'pistol'),
    usp_s: () => createFallbackWeapon(0x38404a, 0.58, 'pistol'),
    p250: () => createFallbackWeapon(0x424a54, 0.55, 'pistol'),
    five_seven: () => createFallbackWeapon(0x3a424c, 0.58, 'pistol'),
    dual_berettas: () => createFallbackWeapon(0x404550, 0.52, 'pistol'),
    cz75: () => createFallbackWeapon(0x3e4450, 0.55, 'pistol'),
    tec9: () => createFallbackWeapon(0x383d45, 0.56, 'pistol'),
    p2000: () => createFallbackWeapon(0x3d454e, 0.55, 'pistol'),

    // 霰弹枪
    nova: () => createFallbackWeapon(0x47311f, 0.80, 'shotgun'),
    bulldog: () => createFallbackWeapon(0x47311f, 0.80, 'shotgun'),
    mag7: () => createFallbackWeapon(0x3a322a, 0.78, 'shotgun'),
    xm1014: () => createFallbackWeapon(0x3d3428, 0.82, 'shotgun'),
    sawedoff: createSawedOff,
    shotgun: () => createFallbackWeapon(0x47311f, 0.80, 'shotgun'),

    // 机枪
    m249: () => {
      const w = createFallbackWeapon(0x353d2a, 1.05, 'rifle');
      // 加弹链箱
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.10), new THREE.MeshStandardMaterial({ color: 0x2a2d20, roughness: 0.5 }));
      box.position.set(0, 0.10, -0.22);
      const brl = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.40, 16), new THREE.MeshStandardMaterial({ color: 0x3d4035 }));
      brl.rotation.x = Math.PI / 2; brl.position.set(0, 0.04, -0.70);
      w.add(box); w.add(brl);
      return w;
    },
    negev: () => {
      const w = createFallbackWeapon(0x323028, 1.08, 'rifle');
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.09, 0.11), new THREE.MeshStandardMaterial({ color: 0x282520, roughness: 0.5 }));
      box.position.set(0, 0.12, -0.24);
      w.add(box);
      return w;
    },

    // 近战 / 装备
    knife: () => createFallbackWeapon(0xa8b0ba, 0.6, 'knife'),
    zeus: createZeus,
    grenade: () => createFallbackWeapon(0x5a6e3a, 0.45, 'grenade'),
  };

  const builder = builders[weaponId];
  if (builder) {
    try {
      const obj = builder();
      obj.position.set(0, 0, 0);
      return obj;
    } catch (e) {
      console.warn(`[assets] Failed to build specific weapon ${weaponId}, falling back to rifle`, e);
    }
  }
  return createFallbackWeapon(0x3d4651, 0.95, 'rifle');
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

// CS 1.6 Weapon Geometry Factories
function createCS16Glock(): THREE.Object3D {
  const g = new THREE.Group();
  const M = weaponMats(0x4a4a4a);
  const len = 0.55;

  const slide = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.09, len * 0.85), M.metal);
  slide.position.set(0, 0.11, -len * 0.30);
  g.add(slide);

  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, len * 0.60), M.metal);
  receiver.position.set(0, 0.02, -len * 0.25);
  g.add(receiver);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.028, len * 0.50, 16), M.metal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.06, -len * 0.75);
  g.add(barrel);

  const triggerGuard = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.01, 6, 12), M.dark);
  triggerGuard.rotation.x = Math.PI / 2;
  triggerGuard.scale.z = 0.5;
  triggerGuard.position.set(0.01, -0.08, -len * 0.10);
  g.add(triggerGuard);

  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.26, 0.15), M.grip);
  grip.rotation.x = -0.30;
  grip.position.set(0.02, -0.20, -len * 0.05);
  g.add(grip);

  const idRing = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.01, 8, 16), M.idRing(0x4a4a4a));
  idRing.rotation.x = Math.PI / 2;
  idRing.position.set(0, -0.05, -len * 0.08);
  g.add(idRing);

  return g;
}

function createCS16USP(): THREE.Object3D {
  const g = new THREE.Group();
  const M = weaponMats(0x3a3a3a);
  const len = 0.58;

  const slide = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.085, len * 0.82), M.metal);
  slide.position.set(0, 0.105, -len * 0.28);
  g.add(slide);

  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.115, len * 0.58), M.metal);
  receiver.position.set(0, 0.015, -len * 0.24);
  g.add(receiver);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, len * 0.48, 16), M.metal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.055, -len * 0.72);
  g.add(barrel);

  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.25, 0.14), M.grip);
  grip.rotation.x = -0.29;
  grip.position.set(0.02, -0.19, -len * 0.04);
  g.add(grip);

  const idRing = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.01, 8, 16), M.idRing(0x3a3a3a));
  idRing.rotation.x = Math.PI / 2;
  idRing.position.set(0, -0.05, -len * 0.07);
  g.add(idRing);

  return g;
}

function createCS16P228(): THREE.Object3D {
  const g = new THREE.Group();
  const M = weaponMats(0x454545);
  const len = 0.56;

  const slide = new THREE.Mesh(new THREE.BoxGeometry(0.175, 0.088, len * 0.84), M.metal);
  slide.position.set(0, 0.108, -len * 0.29);
  g.add(slide);

  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.155, 0.118, len * 0.59), M.metal);
  receiver.position.set(0, 0.018, -len * 0.245);
  g.add(receiver);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.023, 0.027, len * 0.49, 16), M.metal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.058, -len * 0.74);
  g.add(barrel);

  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.125, 0.255, 0.145), M.grip);
  grip.rotation.x = -0.295;
  grip.position.set(0.02, -0.195, -len * 0.045);
  g.add(grip);

  const idRing = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.01, 8, 16), M.idRing(0x454545));
  idRing.rotation.x = Math.PI / 2;
  idRing.position.set(0, -0.05, -len * 0.075);
  g.add(idRing);

  return g;
}

function createCS16MP5(): THREE.Object3D {
  const g = new THREE.Group();
  const M = weaponMats(0x2d2d2d);
  const len = 0.75;

  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.13, len * 0.60), M.metal);
  receiver.position.set(0, 0.02, -len * 0.18);
  g.add(receiver);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.028, len * 0.48, 16), M.metal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.04, -len * 0.68);
  g.add(barrel);

  const foregrip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.12), M.grip);
  foregrip.rotation.x = 0.15;
  foregrip.position.set(0, -0.10, -len * 0.45);
  g.add(foregrip);

  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.10, 0.28), M.grip);
  stock.position.set(0, 0.0, len * 0.20);
  g.add(stock);

  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.22, 0.12), M.dark);
  mag.rotation.x = 0.08;
  mag.position.set(0, -0.14, -len * 0.16);
  g.add(mag);

  const idRing = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.01, 8, 16), M.idRing(0x2d2d2d));
  idRing.rotation.x = Math.PI / 2;
  idRing.position.set(0, -0.03, -len * 0.05);
  g.add(idRing);

  return g;
}

function createCS16TMP(): THREE.Object3D {
  const g = new THREE.Group();
  const M = weaponMats(0x353535);
  const len = 0.72;

  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, len * 0.58), M.metal);
  receiver.position.set(0, 0.015, -len * 0.17);
  g.add(receiver);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.025, len * 0.45, 16), M.metal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.035, -len * 0.65);
  g.add(barrel);

  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.09, 0.25), M.grip);
  stock.position.set(0, 0.0, len * 0.18);
  g.add(stock);

  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.20, 0.11), M.dark);
  mag.rotation.x = 0.07;
  mag.position.set(0, -0.13, -len * 0.15);
  g.add(mag);

  const idRing = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.01, 8, 16), M.idRing(0x353535));
  idRing.rotation.x = Math.PI / 2;
  idRing.position.set(0, -0.03, -len * 0.045);
  g.add(idRing);

  return g;
}

function createCS16M3(): THREE.Object3D {
  const g = new THREE.Group();
  const M = weaponMats(0x4a3525);
  const len = 0.85;

  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.15, len * 0.55), M.metal);
  receiver.position.set(0, 0.02, -len * 0.15);
  g.add(receiver);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.045, len * 0.75, 16), M.metal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.04, -len * 0.85);
  g.add(barrel);

  const pump = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.10, 0.30), M.wood);
  pump.position.set(0, -0.02, -len * 0.65);
  g.add(pump);

  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.12, 0.38), M.wood);
  stock.position.set(0, 0.0, len * 0.20);
  g.add(stock);

  const idRing = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.012, 8, 20), M.idRing(0x4a3525));
  idRing.rotation.x = Math.PI / 2;
  idRing.position.set(0, 0.04, -len * 0.18);
  g.add(idRing);

  return g;
}

function createCS16XM1014(): THREE.Object3D {
  const g = new THREE.Group();
  const M = weaponMats(0x3d3028);
  const len = 0.88;

  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.16, len * 0.56), M.metal);
  receiver.position.set(0, 0.025, -len * 0.16);
  g.add(receiver);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.047, len * 0.78, 16), M.metal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.045, -len * 0.88);
  g.add(barrel);

  const foregrip = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.09, 0.28), M.grip);
  foregrip.position.set(0, -0.02, -len * 0.68);
  g.add(foregrip);

  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.13, 0.36), M.grip);
  stock.position.set(0, 0.0, len * 0.19);
  g.add(stock);

  const tubeMag = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.35), M.dark);
  tubeMag.position.set(0, -0.06, -len * 0.28);
  g.add(tubeMag);

  const idRing = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.012, 8, 20), M.idRing(0x3d3028));
  idRing.rotation.x = Math.PI / 2;
  idRing.position.set(0, 0.045, -len * 0.19);
  g.add(idRing);

  return g;
}

function createCS16M4A1(): THREE.Object3D {
  const g = new THREE.Group();
  const M = weaponMats(0x3a404a);
  const len = 0.95;

  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.15, len * 0.62), M.metal);
  receiver.position.set(0, 0.02, -len * 0.20);
  g.add(receiver);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.028, len * 0.50, 16), M.metal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.04, -len * 0.88);
  g.add(barrel);

  const carryHandle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.10, 0.20), M.metal);
  carryHandle.position.set(0, 0.16, -len * 0.32);
  g.add(carryHandle);

  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.28, 0.12), M.dark);
  mag.rotation.x = 0.08;
  mag.position.set(0, -0.14, -len * 0.18);
  g.add(mag);

  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.24, 0.12), M.grip);
  grip.rotation.x = -0.30;
  grip.position.set(0.02, -0.16, len * 0.02);
  g.add(grip);

  const stockArm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.24), M.metal);
  stockArm.position.set(0, 0.01, len * 0.22);
  g.add(stockArm);

  const stockPad = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.05), M.grip);
  stockPad.position.set(0, 0.01, len * 0.34);
  g.add(stockPad);

  const idRing = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.012, 8, 20), M.idRing(0x3a404a));
  idRing.rotation.x = Math.PI / 2;
  idRing.position.set(0, -0.05, len * 0.04);
  g.add(idRing);

  return g;
}

function createCS16SG552(): THREE.Object3D {
  const g = new THREE.Group();
  const M = weaponMats(0x3a3a3a);
  const len = 0.98;

  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.15, len * 0.64), M.metal);
  receiver.position.set(0, 0.02, -len * 0.21);
  g.add(receiver);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.030, len * 0.52, 16), M.metal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.04, -len * 0.90);
  g.add(barrel);

  const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.044, 0.32, 12), M.scope);
  scope.rotation.z = Math.PI / 2;
  scope.position.set(0, 0.17, -len * 0.22);
  g.add(scope);

  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.28, 0.13), M.dark);
  mag.rotation.x = 0.085;
  mag.position.set(0, -0.145, -len * 0.185);
  g.add(mag);

  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.125, 0.245, 0.125), M.grip);
  grip.rotation.x = -0.305;
  grip.position.set(0.02, -0.165, len * 0.025);
  g.add(grip);

  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.13, 0.36), M.grip);
  stock.position.set(0, 0.0, len * 0.21);
  g.add(stock);

  const idRing = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.012, 8, 20), M.idRing(0x3a3a3a));
  idRing.rotation.x = Math.PI / 2;
  idRing.position.set(0, -0.05, -len * 0.055);
  g.add(idRing);

  return g;
}

function createCS16AUG(): THREE.Object3D {
  const g = new THREE.Group();
  const M = weaponMats(0x3a4a40);
  const len = 0.92;

  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.14, len * 0.78), M.metal);
  receiver.position.set(0, 0.02, -len * 0.10);
  g.add(receiver);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.030, len * 0.42, 16), M.metal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.04, -len * 0.68);
  g.add(barrel);

  const scope = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.22), M.scope);
  scope.position.set(0, 0.14, -len * 0.28);
  g.add(scope);

  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.24, 0.12), M.dark);
  mag.rotation.x = 0.06;
  mag.position.set(0, -0.14, len * 0.20);
  g.add(mag);

  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.24, 0.12), M.grip);
  grip.rotation.x = -0.28;
  grip.position.set(0.02, -0.15, len * 0.06);
  g.add(grip);

  const idRing = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.01, 8, 16), M.idRing(0x3a4a40));
  idRing.rotation.x = Math.PI / 2;
  idRing.position.set(0, -0.04, len * 0.04);
  g.add(idRing);

  return g;
}

function createCS16Galil(): THREE.Object3D {
  const g = new THREE.Group();
  const M = weaponMats(0x3a3528);
  const len = 0.95;

  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.14, len * 0.60), M.metal);
  receiver.position.set(0, 0.02, -len * 0.18);
  g.add(receiver);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, len * 0.55, 16), M.metal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.04, -len * 0.78);
  g.add(barrel);

  const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.10, 0.38), M.grip);
  handguard.position.set(0, -0.01, -len * 0.64);
  g.add(handguard);

  const magGrp = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const seg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.12), M.dark);
    seg.position.set(0, -0.10 + i * 0.035, 0.01 - i * 0.015);
    seg.rotation.x = i * 0.06;
    magGrp.add(seg);
  }
  magGrp.position.set(0, 0, -len * 0.22);
  g.add(magGrp);

  const stockArm = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.22), M.metal);
  stockArm.position.set(0, 0.0, len * 0.18);
  g.add(stockArm);

  const stockPad = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.13, 0.04), M.grip);
  stockPad.position.set(0, 0.0, len * 0.28);
  g.add(stockPad);

  const idRing = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.01, 8, 20), M.idRing(0x3a3528));
  idRing.rotation.x = Math.PI / 2;
  idRing.position.set(0, -0.04, len * 0.04);
  g.add(idRing);

  return g;
}

function createCS16FAMAS(): THREE.Object3D {
  const g = new THREE.Group();
  const M = weaponMats(0x3a3a48);
  const len = 0.88;

  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, len * 0.80), M.metal);
  receiver.position.set(0, 0.02, -len * 0.10);
  g.add(receiver);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.028, len * 0.40, 16), M.metal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.04, -len * 0.70);
  g.add(barrel);

  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.12, 0.35), M.metal);
  handle.position.set(0, 0.14, -len * 0.22);
  g.add(handle);

  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.24, 0.11), M.dark);
  mag.rotation.x = 0.06;
  mag.position.set(0, -0.14, len * 0.18);
  g.add(mag);

  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.22, 0.11), M.grip);
  grip.rotation.x = -0.28;
  grip.position.set(0.02, -0.14, len * 0.06);
  g.add(grip);

  const idRing = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.01, 8, 16), M.idRing(0x3a3a48));
  idRing.rotation.x = Math.PI / 2;
  idRing.position.set(0, -0.04, len * 0.04);
  g.add(idRing);

  return g;
}

function createCS16Scout(): THREE.Object3D {
  const g = new THREE.Group();
  const M = weaponMats(0x3a4040);
  const len = 1.05;

  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.13, len * 0.50), M.metal);
  receiver.position.set(0, 0.01, -len * 0.16);
  g.add(receiver);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.024, len * 0.85, 16), M.metal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.03, -len * 0.90);
  g.add(barrel);

  const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.32, 12), M.scope);
  scope.rotation.z = Math.PI / 2;
  scope.position.set(0, 0.16, -len * 0.20);
  g.add(scope);

  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.15, 0.08), M.dark);
  mag.position.set(0, -0.06, -len * 0.14);
  g.add(mag);

  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.20, 0.10), M.grip);
  grip.rotation.x = -0.28;
  grip.position.set(0.02, -0.14, len * 0.02);
  g.add(grip);

  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.12, 0.34), M.grip);
  stock.position.set(0, 0.0, len * 0.16);
  g.add(stock);

  const idRing = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.01, 8, 16), M.idRing(0x3a4040));
  idRing.rotation.x = Math.PI / 2;
  idRing.position.set(0, 0.0, -len * 0.04);
  g.add(idRing);

  return g;
}

function createCS16AWP(): THREE.Object3D {
  const g = new THREE.Group();
  const M = weaponMats(0x2a2a30);
  const len = 1.12;

  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.15, len * 0.55), M.metal);
  receiver.position.set(0, 0.01, -len * 0.18);
  g.add(receiver);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.030, len * 0.90, 20), M.metal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.03, -len * 0.98);
  g.add(barrel);

  const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.026, 0.08, 16), M.metal);
  muzzle.rotation.x = Math.PI / 2;
  muzzle.position.set(0, 0.03, -len * 1.28);
  g.add(muzzle);

  const scopeBody = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.55, 16), M.scope);
  scopeBody.rotation.z = Math.PI / 2;
  scopeBody.position.set(0, 0.19, -len * 0.22);
  g.add(scopeBody);

  const scopeLens = new THREE.Mesh(new THREE.CylinderGeometry(0.060, 0.050, 0.05, 16), M.accent);
  scopeLens.rotation.z = Math.PI / 2;
  scopeLens.position.set(0.28, 0.19, -len * 0.22);
  g.add(scopeLens);

  for (const dx of [-0.12, 0.0, 0.12]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.01, 8, 16), M.accent);
    ring.position.set(dx, 0.16, -len * 0.22);
    g.add(ring);
  }

  for (const dx of [0.05, -0.05]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.016, 0.35, 8), M.metal);
    leg.position.set(dx, -0.16, -len * 0.68);
    leg.rotation.z = dx > 0 ? 0.45 : -0.45;
    g.add(leg);
  }

  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.10), M.dark);
  mag.position.set(0, -0.08, -len * 0.18);
  g.add(mag);

  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.14, 0.42), M.grip);
  stock.position.set(0, -0.01, len * 0.18);
  g.add(stock);

  const cheek = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.07, 0.32), M.dark);
  cheek.position.set(0, 0.09, len * 0.18);
  g.add(cheek);

  const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.14, 8), M.accent);
  bolt.position.set(0.11, 0.06, -len * 0.08);
  bolt.rotation.z = Math.PI / 2;
  g.add(bolt);

  const idRing = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.012, 8, 20), M.idRing(0x2a2a30));
  idRing.rotation.x = Math.PI / 2;
  idRing.position.set(0, 0.02, -len * 0.06);
  g.add(idRing);

  return g;
}

function createCS16SG550(): THREE.Object3D {
  const g = new THREE.Group();
  const M = weaponMats(0x3a3a40);
  const len = 1.02;

  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.14, len * 0.60), M.metal);
  receiver.position.set(0, 0.015, -len * 0.18);
  g.add(receiver);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.029, len * 0.55, 16), M.metal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.035, -len * 0.85);
  g.add(barrel);

  const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.35, 12), M.scope);
  scope.rotation.z = Math.PI / 2;
  scope.position.set(0, 0.18, -len * 0.22);
  g.add(scope);

  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.30, 0.13), M.dark);
  mag.rotation.x = 0.06;
  mag.position.set(0, -0.18, -len * 0.18);
  g.add(mag);

  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.26, 0.13), M.grip);
  grip.rotation.x = -0.30;
  grip.position.set(0.02, -0.17, len * 0.02);
  g.add(grip);

  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.13, 0.36), M.grip);
  stock.position.set(0, 0.0, len * 0.16);
  g.add(stock);

  const idRing = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.012, 8, 20), M.idRing(0x3a3a40));
  idRing.rotation.x = Math.PI / 2;
  idRing.position.set(0, -0.05, len * 0.02);
  g.add(idRing);

  return g;
}

function createCS16G3SG1(): THREE.Object3D {
  const g = new THREE.Group();
  const M = weaponMats(0x3a3a30);
  const len = 1.08;

  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.14, len * 0.68), M.metal);
  receiver.position.set(0, 0.02, -len * 0.20);
  g.add(receiver);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.030, len * 0.55, 16), M.metal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.04, -len * 0.82);
  g.add(barrel);

  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.04, 8), M.accent);
  drum.rotation.z = Math.PI / 2;
  drum.position.set(0, 0.15, -len * 0.35);
  g.add(drum);

  const scope = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.28), M.scope);
  scope.position.set(0, 0.16, -len * 0.40);
  g.add(scope);

  const mag = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.26, 0.12), M.dark);
  mag.rotation.x = 0.06;
  mag.position.set(0, -0.16, -len * 0.18);
  g.add(mag);

  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.24, 0.12), M.grip);
  grip.rotation.x = -0.30;
  grip.position.set(0.02, -0.16, len * 0.02);
  g.add(grip);

  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.13, 0.38), M.grip);
  stock.position.set(0, 0.0, len * 0.18);
  g.add(stock);

  const butt = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.05), M.dark);
  butt.position.set(0, 0.0, len * 0.36);
  g.add(butt);

  const idRing = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.012, 8, 20), M.idRing(0x3a3a30));
  idRing.rotation.x = Math.PI / 2;
  idRing.position.set(0, -0.05, len * 0.02);
  g.add(idRing);

  return g;
}

function createCS16M249(): THREE.Object3D {
  const g = new THREE.Group();
  const M = weaponMats(0x353530);
  const len = 1.05;

  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.16, len * 0.62), M.metal);
  receiver.position.set(0, 0.02, -len * 0.19);
  g.add(receiver);

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.036, len * 0.55, 16), M.metal);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.045, -len * 0.80);
  g.add(barrel);

  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.12, 0.18), M.metal);
  handle.position.set(0, 0.12, -len * 0.28);
  g.add(handle);

  const bipod = new THREE.Group();
  for (const dx of [0.06, -0.06]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.015, 0.38, 8), M.metal);
    leg.position.set(dx, -0.14, -len * 0.55);
    leg.rotation.z = dx > 0 ? 0.45 : -0.45;
    bipod.add(leg);
  }
  g.add(bipod);

  const box = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.10), new THREE.MeshStandardMaterial({ color: 0x2a2d20, roughness: 0.5 }));
  box.position.set(0, 0.10, -0.22);
  g.add(box);

  const brl = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.40, 16), new THREE.MeshStandardMaterial({ color: 0x3d4035 }));
  brl.rotation.x = Math.PI / 2;
  brl.position.set(0, 0.04, -0.70);
  g.add(brl);

  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.40), M.grip);
  stock.position.set(0, 0.0, len * 0.20);
  g.add(stock);

  const idRing = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.012, 8, 20), M.idRing(0x353530));
  idRing.rotation.x = Math.PI / 2;
  idRing.position.set(0, -0.05, len * 0.05);
  g.add(idRing);

  return g;
}

function createSpecificCS16Weapon(weaponId: string): THREE.Object3D {
  const builders: Record<string, () => THREE.Object3D> = {
    glock: createCS16Glock,
    usp: createCS16USP,
    p228: createCS16P228,
    mp5: createCS16MP5,
    tmp: createCS16TMP,
    m3: createCS16M3,
    xm1014: createCS16XM1014,
    ak47: createAK47,
    m4a1: createCS16M4A1,
    sg552: createCS16SG552,
    aug: createCS16AUG,
    galil: createCS16Galil,
    famas: createCS16FAMAS,
    scout: createCS16Scout,
    awp: createCS16AWP,
    sg550: createCS16SG550,
    g3sg1: createCS16G3SG1,
    m249: createCS16M249,
    knife: () => createFallbackWeapon(0xa8b0ba, 0.6, 'knife'),
    deagle: createDesertEagle,
    p90: createP90,
    mac10: createMAC10,
    ump45: () => createFallbackWeapon(0x3a3a35, 0.70, 'smg'),
    five_seven: () => createFallbackWeapon(0x3a424c, 0.58, 'pistol'),
    hegrenade: () => createFallbackWeapon(0x5a5030, 0.45, 'grenade'),
  };

  const builder = builders[weaponId];
  if (builder) {
    try {
      const obj = builder();
      obj.position.set(0, 0, 0);
      return obj;
    } catch (e) {
      console.warn(`[assets] Failed to build specific CS 1.6 weapon ${weaponId}, falling back to rifle`, e);
    }
  }
  return createFallbackWeapon(0x3d4651, 0.95, 'rifle');
}

export const ASSETS: Record<string, AssetDefinition> = {
  // ── CS 1.6 手枪 ────────────────────────────────────────────────────────────
  glock: { id: 'glock', kind: 'weapon', path: '/assets/models/weapons/pistol.glb', scale: 0.42, rotation: [0, Math.PI / 2, 0], position: [-0.18, -0.06, 0.18], preferFallback: true, fallback: () => createSpecificCS16Weapon('glock') },
  usp: { id: 'usp', kind: 'weapon', path: '/assets/models/weapons/pistol.glb', scale: 0.42, rotation: [0, Math.PI / 2, 0], position: [-0.18, -0.06, 0.18], preferFallback: true, fallback: () => createSpecificCS16Weapon('usp') },
  p228: { id: 'p228', kind: 'weapon', path: '/assets/models/weapons/pistol.glb', scale: 0.42, rotation: [0, Math.PI / 2, 0], position: [-0.18, -0.06, 0.18], preferFallback: true, fallback: () => createSpecificCS16Weapon('p228') },
  deagle: { id: 'deagle', kind: 'weapon', path: '/assets/models/weapons/heavy_pistol.glb', scale: 0.42, rotation: [0, Math.PI / 2, 0], position: [-0.22, -0.08, 0.18], preferFallback: true, fallback: () => createSpecificCS16Weapon('deagle') },
  five_seven: { id: 'five_seven', kind: 'weapon', path: '/assets/models/weapons/pistol.glb', scale: 0.42, rotation: [0, Math.PI / 2, 0], position: [-0.18, -0.06, 0.18], preferFallback: true, fallback: () => createSpecificCS16Weapon('five_seven') },

  // ── CS 1.6 SMG ─────────────────────────────────────────────────────────────
  mp5: { id: 'mp5', kind: 'weapon', path: '/assets/models/weapons/smg.glb', scale: 0.24, rotation: [0, Math.PI / 2, 0], position: [-0.12, -0.10, 0.20], preferFallback: true, fallback: () => createSpecificCS16Weapon('mp5') },
  tmp: { id: 'tmp', kind: 'weapon', path: '/assets/models/weapons/smg.glb', scale: 0.24, rotation: [0, Math.PI / 2, 0], position: [-0.12, -0.10, 0.20], preferFallback: true, fallback: () => createSpecificCS16Weapon('tmp') },
  p90: { id: 'p90', kind: 'weapon', path: '/assets/models/weapons/smg.glb', scale: 0.24, rotation: [0, Math.PI / 2, 0], position: [-0.12, -0.10, 0.20], preferFallback: true, fallback: () => createSpecificCS16Weapon('p90') },
  mac10: { id: 'mac10', kind: 'weapon', path: '/assets/models/weapons/smg.glb', scale: 0.24, rotation: [0, Math.PI / 2, 0], position: [-0.12, -0.10, 0.20], preferFallback: true, fallback: () => createSpecificCS16Weapon('mac10') },
  ump45: { id: 'ump45', kind: 'weapon', path: '/assets/models/weapons/smg.glb', scale: 0.24, rotation: [0, Math.PI / 2, 0], position: [-0.12, -0.10, 0.20], preferFallback: true, fallback: () => createSpecificCS16Weapon('ump45') },

  // ── CS 1.6 霰弹枪 ────────────────────────────────────────────────────────────
  m3: { id: 'm3', kind: 'weapon', path: '/assets/models/weapons/shotgun.glb', scale: 0.17, rotation: [0, Math.PI / 2, 0], position: [-0.18, -0.11, 0.24], preferFallback: true, fallback: () => createSpecificCS16Weapon('m3') },
  xm1014: { id: 'xm1014', kind: 'weapon', path: '/assets/models/weapons/shotgun.glb', scale: 0.17, rotation: [0, Math.PI / 2, 0], position: [-0.18, -0.11, 0.24], preferFallback: true, fallback: () => createSpecificCS16Weapon('xm1014') },

  // ── CS 1.6 步枪 ─────────────────────────────────────────────────────────────
  ak47: { id: 'ak47', kind: 'weapon', path: '/assets/models/weapons/rifle.glb', scale: 0.18, rotation: [0, Math.PI / 2, 0], position: [-0.18, -0.08, 0.24], preferFallback: true, fallback: () => createSpecificCS16Weapon('ak47') },
  m4a1: { id: 'm4a1', kind: 'weapon', path: '/assets/models/weapons/defender_rifle.glb', scale: 0.18, rotation: [0, Math.PI / 2, 0], position: [-0.08, -0.12, 0.20], preferFallback: true, fallback: () => createSpecificCS16Weapon('m4a1') },
  sg552: { id: 'sg552', kind: 'weapon', path: '/assets/models/weapons/rifle.glb', scale: 0.18, rotation: [0, Math.PI / 2, 0], position: [-0.18, -0.08, 0.24], preferFallback: true, fallback: () => createSpecificCS16Weapon('sg552') },
  aug: { id: 'aug', kind: 'weapon', path: '/assets/models/weapons/defender_rifle.glb', scale: 0.18, rotation: [0, Math.PI / 2, 0], position: [-0.08, -0.12, 0.20], preferFallback: true, fallback: () => createSpecificCS16Weapon('aug') },
  galil: { id: 'galil', kind: 'weapon', path: '/assets/models/weapons/rifle.glb', scale: 0.18, rotation: [0, Math.PI / 2, 0], position: [-0.18, -0.08, 0.24], preferFallback: true, fallback: () => createSpecificCS16Weapon('galil') },
  famas: { id: 'famas', kind: 'weapon', path: '/assets/models/weapons/rifle.glb', scale: 0.18, rotation: [0, Math.PI / 2, 0], position: [-0.18, -0.08, 0.24], preferFallback: true, fallback: () => createSpecificCS16Weapon('famas') },

  // ── CS 1.6 狙击枪 ────────────────────────────────────────────────────────────
  scout: { id: 'scout', kind: 'weapon', path: '/assets/models/weapons/sniper.glb', scale: 0.15, rotation: [0, Math.PI / 2, 0], position: [-0.22, -0.10, 0.26], preferFallback: true, fallback: () => createSpecificCS16Weapon('scout') },
  awp: { id: 'awp', kind: 'weapon', path: '/assets/models/weapons/sniper.glb', scale: 0.145, rotation: [0, Math.PI / 2, 0], position: [-0.25, -0.12, 0.28], preferFallback: true, fallback: () => createSpecificCS16Weapon('awp') },
  sg550: { id: 'sg550', kind: 'weapon', path: '/assets/models/weapons/sniper.glb', scale: 0.145, rotation: [0, Math.PI / 2, 0], position: [-0.25, -0.12, 0.28], preferFallback: true, fallback: () => createSpecificCS16Weapon('sg550') },
  g3sg1: { id: 'g3sg1', kind: 'weapon', path: '/assets/models/weapons/sniper.glb', scale: 0.145, rotation: [0, Math.PI / 2, 0], position: [-0.25, -0.12, 0.28], preferFallback: true, fallback: () => createSpecificCS16Weapon('g3sg1') },

  // ── CS 1.6 机枪 ─────────────────────────────────────────────────────────────
  m249: { id: 'm249', kind: 'weapon', path: '/assets/models/weapons/rifle.glb', scale: 0.16, rotation: [0, Math.PI / 2, 0], position: [-0.22, -0.10, 0.28], preferFallback: true, fallback: () => createSpecificCS16Weapon('m249') },

  // ── CS 1.6 近战/装备 ─────────────────────────────────────────────────────
  knife: { id: 'knife', kind: 'weapon', path: '/assets/models/weapons/knife.glb', scale: 0.62, rotation: [0, Math.PI / 2, 0], position: [-0.08, -0.08, 0.12], preferFallback: true, fallback: () => createSpecificCS16Weapon('knife') },
  hegrenade: { id: 'hegrenade', kind: 'weapon', path: '/assets/models/weapons/grenade.glb', scale: 0.48, rotation: [0, Math.PI / 2, 0], position: [-0.10, -0.06, 0.14], preferFallback: true, fallback: () => createSpecificCS16Weapon('hegrenade') },

  // ── 兼容旧ID (保持兼容) ────────────────────────────────────────────────────────────
  pistol: { id: 'pistol', kind: 'weapon', path: '/assets/models/weapons/pistol.glb', scale: 0.42, rotation: [0, Math.PI / 2, 0], position: [-0.18, -0.06, 0.18], preferFallback: false, fallback: () => createSpecificWeapon('pistol') },
  usp_s: { id: 'usp_s', kind: 'weapon', path: '/assets/models/weapons/heavy_pistol.glb', scale: 0.42, rotation: [0, Math.PI / 2, 0], position: [-0.22, -0.08, 0.18], preferFallback: false, fallback: () => createSpecificWeapon('usp_s') },
  p250: { id: 'p250', kind: 'weapon', path: '/assets/models/weapons/pistol.glb', scale: 0.42, rotation: [0, Math.PI / 2, 0], position: [-0.18, -0.06, 0.18], preferFallback: false, fallback: () => createSpecificWeapon('p250') },
  dual_berettas: { id: 'dual_berettas', kind: 'weapon', path: '/assets/models/weapons/heavy_pistol.glb', scale: 0.42, rotation: [0, Math.PI / 2, 0], position: [-0.20, -0.07, 0.18], preferFallback: false, fallback: () => createSpecificWeapon('dual_berettas') },
  r8: { id: 'r8', kind: 'weapon', path: '/assets/models/weapons/heavy_pistol.glb', scale: 0.42, rotation: [0, Math.PI / 2, 0], position: [-0.22, -0.08, 0.18], preferFallback: false, fallback: () => createSpecificWeapon('r8') },
  cz75: { id: 'cz75', kind: 'weapon', path: '/assets/models/weapons/pistol.glb', scale: 0.42, rotation: [0, Math.PI / 2, 0], position: [-0.18, -0.06, 0.18], preferFallback: false, fallback: () => createSpecificWeapon('cz75') },
  tec9: { id: 'tec9', kind: 'weapon', path: '/assets/models/weapons/pistol.glb', scale: 0.42, rotation: [0, Math.PI / 2, 0], position: [-0.18, -0.06, 0.18], preferFallback: false, fallback: () => createSpecificWeapon('tec9') },
  p2000: { id: 'p2000', kind: 'weapon', path: '/assets/models/weapons/pistol.glb', scale: 0.42, rotation: [0, Math.PI / 2, 0], position: [-0.18, -0.06, 0.18], preferFallback: false, fallback: () => createSpecificWeapon('p2000') },

  // ── SMG ─────────────────────────────────────────────────────────────
  mp9: { id: 'mp9', kind: 'weapon', path: '/assets/models/weapons/smg.glb', scale: 0.24, rotation: [0, Math.PI / 2, 0], position: [-0.12, -0.10, 0.20], preferFallback: false, fallback: () => createSpecificWeapon('mp9') },
  pp_bizon: { id: 'pp_bizon', kind: 'weapon', path: '/assets/models/weapons/smg.glb', scale: 0.24, rotation: [0, Math.PI / 2, 0], position: [-0.12, -0.10, 0.20], preferFallback: false, fallback: () => createSpecificWeapon('pp_bizon') },
  mp7: { id: 'mp7', kind: 'weapon', path: '/assets/models/weapons/smg.glb', scale: 0.24, rotation: [0, Math.PI / 2, 0], position: [-0.12, -0.10, 0.20], preferFallback: false, fallback: () => createSpecificWeapon('mp7') },
  mp5sd: { id: 'mp5sd', kind: 'weapon', path: '/assets/models/weapons/smg.glb', scale: 0.24, rotation: [0, Math.PI / 2, 0], position: [-0.12, -0.10, 0.20], preferFallback: false, fallback: () => createSpecificWeapon('mp5sd') },

  // ── 步枪 ─────────────────────────────────────────────────────────────
  rifle: { id: 'rifle', kind: 'weapon', path: '/assets/models/weapons/rifle.glb', scale: 0.18, rotation: [0, Math.PI / 2, 0], position: [-0.18, -0.08, 0.24], preferFallback: false, fallback: () => createSpecificWeapon('rifle') },
  m4a1s: { id: 'm4a1s', kind: 'weapon', path: '/assets/models/weapons/defender_rifle.glb', scale: 0.18, rotation: [0, Math.PI / 2, 0], position: [-0.08, -0.12, 0.20], preferFallback: false, fallback: () => createSpecificWeapon('m4a1s') },
  m4a4: { id: 'm4a4', kind: 'weapon', path: '/assets/models/weapons/defender_rifle.glb', scale: 0.18, rotation: [0, Math.PI / 2, 0], position: [-0.08, -0.12, 0.20], preferFallback: false, fallback: () => createSpecificWeapon('m4a4') },
  defender_rifle: { id: 'defender_rifle', kind: 'weapon', path: '/assets/models/weapons/defender_rifle.glb', scale: 0.18, rotation: [0, Math.PI / 2, 0], position: [-0.08, -0.12, 0.20], preferFallback: false, fallback: () => createSpecificWeapon('defender_rifle') },
  sg553: { id: 'sg553', kind: 'weapon', path: '/assets/models/weapons/rifle.glb', scale: 0.18, rotation: [0, Math.PI / 2, 0], position: [-0.18, -0.08, 0.24], preferFallback: false, fallback: () => createSpecificWeapon('sg553') },

  // ── 狙击 ─────────────────────────────────────────────────────────────
  sniper: { id: 'sniper', kind: 'weapon', path: '/assets/models/weapons/sniper.glb', scale: 0.145, rotation: [0, Math.PI / 2, 0], position: [-0.25, -0.12, 0.28], preferFallback: false, fallback: () => createSpecificWeapon('sniper') },
  ssg08: { id: 'ssg08', kind: 'weapon', path: '/assets/models/weapons/sniper.glb', scale: 0.15, rotation: [0, Math.PI / 2, 0], position: [-0.22, -0.10, 0.26], preferFallback: false, fallback: () => createSpecificWeapon('ssg08') },
  scar20: { id: 'scar20', kind: 'weapon', path: '/assets/models/weapons/sniper.glb', scale: 0.145, rotation: [0, Math.PI / 2, 0], position: [-0.25, -0.12, 0.28], preferFallback: false, fallback: () => createSpecificWeapon('scar20') },

  // ── 霰弹 ────────────────────────────────────────────────────────────
  shotgun: { id: 'shotgun', kind: 'weapon', path: '/assets/models/weapons/shotgun.glb', scale: 0.17, rotation: [0, Math.PI / 2, 0], position: [-0.18, -0.11, 0.24], preferFallback: false, fallback: () => createSpecificWeapon('shotgun') },
  nova: { id: 'nova', kind: 'weapon', path: '/assets/models/weapons/shotgun.glb', scale: 0.17, rotation: [0, Math.PI / 2, 0], position: [-0.18, -0.11, 0.24], preferFallback: false, fallback: () => createSpecificWeapon('nova') },
  mag7: { id: 'mag7', kind: 'weapon', path: '/assets/models/weapons/shotgun.glb', scale: 0.17, rotation: [0, Math.PI / 2, 0], position: [-0.18, -0.11, 0.24], preferFallback: false, fallback: () => createSpecificWeapon('mag7') },
  sawedoff: { id: 'sawedoff', kind: 'weapon', path: '/assets/models/weapons/shotgun.glb', scale: 0.18, rotation: [0, Math.PI / 2, 0], position: [-0.16, -0.09, 0.22], preferFallback: false, fallback: () => createSpecificWeapon('sawedoff') },

  // ── 机枪 ─────────────────────────────────────────────────────────────
  negev: { id: 'negev', kind: 'weapon', path: '/assets/models/weapons/rifle.glb', scale: 0.15, rotation: [0, Math.PI / 2, 0], position: [-0.24, -0.12, 0.30], preferFallback: false, fallback: () => createSpecificWeapon('negev') },

  // ── 近战/装备 ────────────────────────────────────────────────────────
  zeus: { id: 'zeus', kind: 'weapon', path: '/assets/models/weapons/grenade.glb', scale: 0.50, rotation: [0, Math.PI / 2, 0], position: [-0.10, -0.06, 0.14], preferFallback: true, fallback: () => createSpecificWeapon('zeus') },
  grenade: { id: 'grenade', kind: 'weapon', path: '/assets/models/weapons/grenade.glb', scale: 0.48, rotation: [0, Math.PI / 2, 0], position: [-0.10, -0.06, 0.14], preferFallback: true, fallback: () => createSpecificWeapon('grenade') },

  // ── 旧别名兼容 ───────────────────────────────────────────────────────
  heavy_pistol: { id: 'heavy_pistol', kind: 'weapon', path: '/assets/models/weapons/heavy_pistol.glb', scale: 0.42, rotation: [0, Math.PI / 2, 0], position: [-0.22, -0.08, 0.18], preferFallback: false, fallback: () => createSpecificWeapon('heavy_pistol') },
  smg: { id: 'smg', kind: 'weapon', path: '/assets/models/weapons/smg.glb', scale: 0.24, rotation: [0, Math.PI / 2, 0], position: [-0.12, -0.10, 0.20], preferFallback: false, fallback: () => createSpecificWeapon('smg') },
  sidearm: { id: 'sidearm', kind: 'weapon', path: '/assets/models/weapons/pistol.glb', scale: 0.42, rotation: [0, Math.PI / 2, 0], position: [-0.18, -0.06, 0.18], preferFallback: false, fallback: () => createSpecificWeapon('sidearm') },
  vandal: { id: 'vandal', kind: 'weapon', path: '/assets/models/weapons/rifle.glb', scale: 0.18, rotation: [0, Math.PI / 2, 0], position: [-0.18, -0.08, 0.24], preferFallback: false, fallback: () => createSpecificWeapon('vandal') },
  sentinel: { id: 'sentinel', kind: 'weapon', path: '/assets/models/weapons/defender_rifle.glb', scale: 0.18, rotation: [0, Math.PI / 2, 0], position: [-0.08, -0.12, 0.20], preferFallback: false, fallback: () => createSpecificWeapon('sentinel') },
  operator: { id: 'operator', kind: 'weapon', path: '/assets/models/weapons/sniper.glb', scale: 0.145, rotation: [0, Math.PI / 2, 0], position: [-0.25, -0.12, 0.28], preferFallback: false, fallback: () => createSpecificWeapon('operator') },
  specter: { id: 'specter', kind: 'weapon', path: '/assets/models/weapons/smg.glb', scale: 0.24, rotation: [0, Math.PI / 2, 0], position: [-0.12, -0.10, 0.20], preferFallback: false, fallback: () => createSpecificWeapon('specter') },
  bulldog: { id: 'bulldog', kind: 'weapon', path: '/assets/models/weapons/shotgun.glb', scale: 0.17, rotation: [0, Math.PI / 2, 0], position: [-0.18, -0.11, 0.24], preferFallback: false, fallback: () => createSpecificWeapon('bulldog') },

  // ── 敌人模型 ─────────────────────────────────────────────────────────
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
