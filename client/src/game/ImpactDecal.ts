import * as THREE from 'three';

interface DecalData {
  createdAt: number;
  matrix: THREE.Matrix4;
}

const DECAL_LIFETIME = 15; // seconds before fade starts
const MAX_DECALS = 80;

// 改用 MeshBasicMaterial 来支持 InstancedMesh
const materialCache = new Map<string, THREE.MeshBasicMaterial>();

function generateDecalMaterial(surfaceMaterial: string): THREE.MeshBasicMaterial {
  if (materialCache.has(surfaceMaterial)) {
    return materialCache.get(surfaceMaterial)!;
  }

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, size, size);

  const cx = size / 2;
  const cy = size / 2;

  const baseColor = surfaceMaterial === 'concrete' ? '100,95,85' :
    surfaceMaterial === 'metal' ? '40,40,45' :
    surfaceMaterial === 'wood' ? '80,50,30' :
    surfaceMaterial === 'sand' ? '140,120,80' :
    '60,60,65';

  // Outer ring
  ctx.beginPath();
  ctx.arc(cx, cy, 22, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${baseColor}, 0.75)`;
  ctx.fill();

  // Inner hole
  const gradient = ctx.createRadialGradient(cx, cy, 4, cx, cy, 12);
  gradient.addColorStop(0, 'rgba(0,0,0,0.95)');
  gradient.addColorStop(0.5, 'rgba(10,10,10,0.85)');
  gradient.addColorStop(1, `rgba(${baseColor}, 0.3)`);
  ctx.beginPath();
  ctx.arc(cx, cy, 12, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  // Radial cracks
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 1.2;
  const crackCount = 4 + Math.floor(Math.random() * 4);
  for (let i = 0; i < crackCount; i++) {
    const angle = (i / crackCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
    const length = 14 + Math.random() * 16;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * 8, cy + Math.sin(angle) * 8);
    const endX = cx + Math.cos(angle) * length;
    const endY = cy + Math.sin(angle) * length;
    const midX = cx + Math.cos(angle) * length * 0.6 + (Math.random() - 0.5) * 6;
    const midY = cy + Math.sin(angle) * length * 0.6 + (Math.random() - 0.5) * 6;
    ctx.quadraticCurveTo(midX, midY, endX, endY);
    ctx.stroke();
  }

  // Scorch mark
  ctx.beginPath();
  ctx.arc(cx, cy, 16, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(20,18,15,0.25)';
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    alphaTest: 0.05
  });
  
  materialCache.set(surfaceMaterial, material);
  return material;
}

export class ImpactDecalManager {
  private scene: THREE.Scene;
  private geometry: THREE.PlaneGeometry;
  // 按照材质分类的 InstancedMesh 实例
  private instancedMeshes: Map<string, THREE.InstancedMesh> = new Map();
  private decalRecords: Map<string, DecalData[]> = new Map();
  private dummy: THREE.Object3D;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.geometry = new THREE.PlaneGeometry(1.2, 1.2); // 统一大小
    this.dummy = new THREE.Object3D();
  }

  private getMeshForMaterial(surfaceMaterial: string): THREE.InstancedMesh {
    if (this.instancedMeshes.has(surfaceMaterial)) {
      return this.instancedMeshes.get(surfaceMaterial)!;
    }
    
    const material = generateDecalMaterial(surfaceMaterial);
    // 初始化最大容量的 InstancedMesh，避免频繁重建
    const mesh = new THREE.InstancedMesh(this.geometry, material, MAX_DECALS);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.count = 0; // 初始显示 0 个
    
    this.scene.add(mesh);
    this.instancedMeshes.set(surfaceMaterial, mesh);
    this.decalRecords.set(surfaceMaterial, []);
    
    return mesh;
  }

  spawn(position: THREE.Vector3, normal: THREE.Vector3, surfaceMaterial: string = 'concrete'): void {
    const mesh = this.getMeshForMaterial(surfaceMaterial);
    const records = this.decalRecords.get(surfaceMaterial)!;

    // 设置位置并防止深度冲突
    this.dummy.position.copy(position).addScaledVector(normal, 0.03);
    this.dummy.lookAt(position.clone().add(normal));
    this.dummy.updateMatrix();

    // 记录生成时间和矩阵信息
    records.push({
      createdAt: performance.now() / 1000,
      matrix: this.dummy.matrix.clone()
    });

    // 维持最大限制（队列结构，先进先出）
    if (records.length > MAX_DECALS) {
      records.shift();
    }

    // 更新 InstancedMesh 数据
    mesh.count = records.length;
    for (let i = 0; i < records.length; i++) {
      mesh.setMatrixAt(i, records[i].matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  update(now: number): void {
    const currentTime = now / 1000;
    
    // 遍历所有不同材质的贴花实例组
    this.instancedMeshes.forEach((mesh, surfaceMaterial) => {
      const records = this.decalRecords.get(surfaceMaterial)!;
      let needsMatrixUpdate = false;

      // 从头检查是否过期（最老的数据在头部）
      while (records.length > 0) {
        const age = currentTime - records[0].createdAt;
        if (age > DECAL_LIFETIME + 3) {
          // 彻底过期，移除最老的一个
          records.shift();
          needsMatrixUpdate = true;
        } else {
          // 由于是有序队列，一旦遇到没过期的，后面的自然也没过期，直接跳出
          break;
        }
      }

      // 如果有数据被移除，需要重新排列矩阵内存
      if (needsMatrixUpdate) {
        mesh.count = records.length;
        for (let i = 0; i < records.length; i++) {
          mesh.setMatrixAt(i, records[i].matrix);
        }
        mesh.instanceMatrix.needsUpdate = true;
      }
    });
  }

  dispose(): void {
    this.instancedMeshes.forEach(mesh => {
      this.scene.remove(mesh);
      mesh.dispose();
    });
    this.instancedMeshes.clear();
    this.decalRecords.clear();
    this.geometry.dispose();
    materialCache.forEach(m => { m.map?.dispose(); m.dispose(); });
    materialCache.clear();
  }
}