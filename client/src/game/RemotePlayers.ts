import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MatchSnapshot, PlayerSnapshot, Team } from './types.js';
import { Interpolation } from '../network/Interpolation.js';

const loader = new GLTFLoader();
let assaultTemplate: THREE.Object3D | null = null;
let loadPromise: Promise<void> | null = null;

function loadAssaultModel(): Promise<void> {
  if (loadPromise) return loadPromise;
  loadPromise = new Promise(resolve => {
    loader.load(
      '/assets/models/enemies/assault.glb',
      gltf => {
        const model = gltf.scene;
        model.traverse(child => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        assaultTemplate = model;
        resolve();
      },
      undefined,
      () => { resolve(); }
    );
  });
  return loadPromise;
}

loadAssaultModel();

const TEAM_COLOR: Record<Team, number> = {
  attackers: 0xd97706,
  defenders: 0x2563eb,
};

const TEAM_TINT: Record<Team, THREE.Color> = {
  attackers: new THREE.Color(0xd97706),
  defenders: new THREE.Color(0x2563eb),
};

export class RemotePlayers {
  private meshes = new Map<string, THREE.Group>();
  private interpolation = new Interpolation();

  constructor(private scene: THREE.Scene) {}

  update(snapshot: MatchSnapshot, localPlayerId?: string): void {
    this.interpolation.push(snapshot);
    const renderTime = performance.now();
    const activeIds = new Set(snapshot.players.map(player => player.id));
    for (const [id, mesh] of this.meshes) {
      if (!activeIds.has(id)) {
        this.scene.remove(mesh);
        this.meshes.delete(id);
      }
    }

    snapshot.players.forEach(player => {
      if (player.id === localPlayerId) return;
      const mesh = this.meshes.get(player.id) ?? this.createPlayerMesh(player);
      if (!this.meshes.has(player.id)) {
        this.meshes.set(player.id, mesh);
        this.scene.add(mesh);
      }
      const interpPos = this.interpolation.getInterpolatedPosition(player.id, renderTime);
      const pos = interpPos ?? player.position;
      mesh.position.set(pos.x, pos.y - 0.36, pos.z);
      mesh.rotation.y = player.rotation.y;
      mesh.visible = player.isAlive;
      const healthBar = mesh.getObjectByName('health-fill') as THREE.Mesh | undefined;
      if (healthBar) {
        const ratio = Math.max(0.05, player.health / 100);
        healthBar.scale.x = ratio;
        const mat = healthBar.material as THREE.MeshBasicMaterial;
        if (ratio > 0.5) mat.color.setHex(0x4bc263);
        else if (ratio > 0.25) mat.color.setHex(0xe8a030);
        else mat.color.setHex(0xff3b30);
      }
    });
  }

  clear(): void {
    this.meshes.forEach(mesh => this.scene.remove(mesh));
    this.meshes.clear();
    this.interpolation.clear();
  }

  private createPlayerMesh(player: PlayerSnapshot): THREE.Group {
    const group = new THREE.Group();
    group.name = `remote-player-${player.id}`;
    const color = TEAM_COLOR[player.team];

    if (assaultTemplate) {
      const model = assaultTemplate.clone(true);
      const tint = TEAM_TINT[player.team];
      model.traverse(child => {
        if (child instanceof THREE.Mesh) {
          const mats = Array.isArray(child.material) ? child.material : [child.material];
          child.material = mats.map(m => {
            const clone = (m as THREE.MeshStandardMaterial).clone();
            if (clone instanceof THREE.MeshStandardMaterial) {
              clone.color.lerp(tint, 0.55);
              clone.roughness = 0.55;
              clone.metalness = 0.2;
            }
            return clone;
          });
        }
      });
      const bounds = new THREE.Box3().setFromObject(model);
      const height = bounds.getSize(new THREE.Vector3()).y;
      if (height > 0) model.scale.multiplyScalar(0.72 / height);
      model.position.y = 0;
      group.add(model);
    } else {
      this.addGeometryFallback(group, color);
    }

    this.addHealthBar(group, color);
    return group;
  }

  private addGeometryFallback(group: THREE.Group, color: number): void {
    const isCT = color === 0x2563eb;

    const primaryColor = isCT ? 0x2c3e55 : 0x4a3520;
    const armorColor   = isCT ? 0x1a2d44 : 0x1c1a16;
    const clothColor   = isCT ? 0x2a3a4e : 0x3a3228;
    const visorColor   = isCT ? 0x40e0f0 : 0xd4a030;

    const armorMat = new THREE.MeshStandardMaterial({ color: primaryColor, roughness: 0.65, metalness: 0.08 });
    const plateMat = new THREE.MeshStandardMaterial({ color: armorColor,   roughness: 0.48, metalness: 0.32 });
    const clothMat = new THREE.MeshStandardMaterial({ color: clothColor,   roughness: 0.90, metalness: 0.0  });
    const visorMat = new THREE.MeshStandardMaterial({ color: visorColor,   roughness: 0.10, metalness: 0.1,
      emissive: new THREE.Color(visorColor).multiplyScalar(0.25), emissiveIntensity: 0.5 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x0f1113,     roughness: 0.25, metalness: 0.88 });
    const gripMat  = new THREE.MeshStandardMaterial({ color: 0x1e1c1a,     roughness: 0.75, metalness: 0.0  });

    // Scale so player height ≈ 0.72 units; createFallbackEnemy total height ≈ 2.28 → s ≈ 0.316
    const s = 0.316;

    // Hips
    const hips = new THREE.Mesh(new THREE.CapsuleGeometry(0.22 * s, 0.12 * s, 4, 8), clothMat);
    hips.position.y = 0.96 * s;
    hips.castShadow = true;
    group.add(hips);

    // Legs (left & right, static — no pivot needed for remote players)
    for (const side of [-1, 1]) {
      const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.095 * s, 0.36 * s, 4, 8), clothMat);
      thigh.position.set(side * 0.20 * s, (0.96 - 0.22) * s, 0);
      thigh.castShadow = true;
      group.add(thigh);
      const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.080 * s, 0.38 * s, 4, 8), clothMat);
      shin.position.set(side * 0.20 * s, (0.96 - 0.44 - 0.22) * s, 0);
      shin.castShadow = true;
      group.add(shin);
      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.22 * s, 0.10 * s, 0.28 * s), plateMat);
      boot.position.set(side * 0.20 * s, (0.96 - 0.46 - 0.44) * s, 0.02 * s);
      group.add(boot);
    }

    // Torso (capsule)
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.20 * s, 0.52 * s, 6, 12), armorMat);
    torso.position.y = 1.40 * s;
    torso.castShadow = true;
    group.add(torso);

    // Vest
    const vest = new THREE.Mesh(new THREE.BoxGeometry(0.44 * s, 0.50 * s, 0.06 * s), plateMat);
    vest.position.set(0, 1.42 * s, -0.22 * s);
    group.add(vest);

    // Arms (upper + forearm, static)
    for (const side of [-1, 1]) {
      const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.075 * s, 0.30 * s, 4, 8), clothMat);
      upper.position.set(side * 0.24 * s, (1.60 - 0.18) * s, 0);
      upper.castShadow = true;
      group.add(upper);
      const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.062 * s, 0.26 * s, 4, 8), clothMat);
      fore.position.set(side * 0.24 * s, (1.60 - 0.36 - 0.16) * s, 0);
      fore.castShadow = true;
      group.add(fore);
    }

    // Neck
    const neck = new THREE.Mesh(new THREE.CapsuleGeometry(0.09 * s, 0.10 * s, 4, 8), clothMat);
    neck.position.y = 1.82 * s;
    group.add(neck);

    // Head (sphere)
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18 * s, 12, 8), armorMat);
    head.position.y = 2.08 * s;
    head.castShadow = true;
    group.add(head);

    // Helmet
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.205 * s, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), plateMat);
    helmet.position.set(0, 2.10 * s, 0.02 * s);
    group.add(helmet);

    // Goggles
    const goggle = new THREE.Mesh(new THREE.BoxGeometry(0.22 * s, 0.07 * s, 0.04 * s), visorMat);
    goggle.position.set(0, 2.07 * s, -0.17 * s);
    group.add(goggle);

    // Weapon (simplified)
    const wReceiver = new THREE.Mesh(new THREE.BoxGeometry(0.030, 0.027, 0.21), metalMat);
    wReceiver.position.set(0.14, 1.40 * s, -0.13);
    wReceiver.rotation.set(0.14, -0.20, -0.05);
    group.add(wReceiver);
    const wBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.16, 8), metalMat);
    wBarrel.rotation.x = Math.PI / 2;
    wBarrel.position.set(0.13, 1.44 * s, -0.245);
    group.add(wBarrel);
    const wMag = new THREE.Mesh(new THREE.BoxGeometry(0.021, 0.055, 0.027), gripMat);
    wMag.position.set(0.145, 1.35 * s, -0.13);
    group.add(wMag);

    group.traverse(child => {
      if (child instanceof THREE.Mesh) child.castShadow = true;
    });
  }

  private addHealthBar(group: THREE.Group, color: number): void {
    const bar = new THREE.Group();
    bar.position.y = 0.88;
    const border = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.038), new THREE.MeshBasicMaterial({ color: 0x222222, side: THREE.DoubleSide }));
    border.position.z = -0.001;
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(0.30, 0.025), new THREE.MeshBasicMaterial({ color: 0x0a0a0a, side: THREE.DoubleSide }));
    const fill = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.015), new THREE.MeshBasicMaterial({ color: 0x4bc263, side: THREE.DoubleSide }));
    fill.name = 'health-fill';
    fill.position.z = 0.002;
    bar.add(border, bg, fill);
    group.add(bar);
  }
}
