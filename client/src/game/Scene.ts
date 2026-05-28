import * as THREE from 'three';
import { ARENA_MAPS, ArenaData, BoxSpec } from './MapData.js';
import { MapId } from './types.js';
import { getTexture, loadPBRTextureSet, PBRTextureKey } from './ProceduralTextures.js';

export class Scene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer | null = null;
  private fallbackCanvas: HTMLCanvasElement | null = null;
  private animationId: number | null = null;
  private colliders: BoxSpec[] = [];
  private arenaObjects: THREE.Object3D[] = [];
  private skyDome: THREE.Mesh | null = null;
  private currentMapId: MapId = 'dust2';

  // 性能优化：视锥剔除
  private frustum = new THREE.Frustum();
  private frustumMatrix = new THREE.Matrix4();
  private frustumCullableObjects: THREE.Object3D[] = [];
  private previousCameraPosition = new THREE.Vector3();
  private cameraMovementThreshold = 5; // 相机移动多少单位后更新视锥

  // 性能优化：距离剔除
  private cullingDistance = 100; // 超过这个距离的对象将被剔除
  private lodObjects: Map<THREE.Object3D, 'high' | 'low' | 'hidden'> = new Map();
  private handleResizeBound: (() => void) | null = null;

  constructor() {
    this.handleResizeBound = this.handleResize.bind(this);
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x5b8cbf);
    this.scene.fog = new THREE.Fog(0x5b8cbf, 60, 160);

    this.camera = new THREE.PerspectiveCamera(
      82,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 1.7, 5);
    this.scene.add(this.camera);

    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      // 【修改 1】将曝光度从 1.22 提升到 1.85，画面瞬间明亮
      this.renderer.toneMappingExposure = 1.85; 
    } catch (error) {
      this.fallbackCanvas = this.createWebGLErrorCanvas(error);
    }

    // 降低环境光——防止敌人材质被洗白，保持CS:GO暗沉氛围
    const ambientLight = new THREE.AmbientLight(0xfff0e0, 0.45); 
    this.scene.add(ambientLight);

    // 【修改 3】增强主光源（太阳），并调整照射角度
    const directionalLight = new THREE.DirectionalLight(0xffeedd, 2.6); 
    directionalLight.position.set(-25, 40, 20); 
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 1;
    directionalLight.shadow.camera.far = 120; // 加大阴影覆盖范围
    directionalLight.shadow.camera.left = -50;
    directionalLight.shadow.camera.right = 50;
    directionalLight.shadow.camera.top = 50;
    directionalLight.shadow.camera.bottom = -50;
    directionalLight.shadow.bias = -0.0005; // 消除阴影锯齿伪影
    this.scene.add(directionalLight);

    // 【修改 4】天光反射，模拟蓝天对暗部的补光，以及沙地对墙壁的反光
    const hemiLight = new THREE.HemisphereLight(0xddeeff, 0x6a5a3a, 0.7);
    this.scene.add(hemiLight);

    this.setArena(this.currentMapId);

    window.addEventListener('resize', this.handleResizeBound!);
  }

  private handleResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer?.setSize(window.innerWidth, window.innerHeight);
  }

  setArena(mapId: MapId): void {
    const arena = ARENA_MAPS[mapId] ?? ARENA_MAPS.dust2;
    this.currentMapId = mapId;
    this.clearArenaObjects();
    this.buildArena(arena);
  }

  private buildArena(arena: ArenaData): void {
    this.colliders = arena.colliders;

    // Map-specific sky colors
    const skyColors: Record<string, { bg: number; fog: number; fogNear: number; fogFar: number; skyTop: number; skyHorizon: number }> = {
      // 【修改 5】换成真实的 CSGO Dust2 偏暖色天空和漫反射沙雾
      Dust2:     { bg: 0x8cb5d6, fog: 0xd6cbb4, fogNear: 60, fogFar: 180, skyTop: 0x6a9ccf, skyHorizon: 0xd6ccb4 },
      Mirage:    { bg: 0x6a8faa, fog: 0x7a9fb5, fogNear: 50, fogFar: 130, skyTop: 0x4a7090, skyHorizon: 0xc0d8e8 },
      Inferno:   { bg: 0x6d7b6a, fog: 0x758568, fogNear: 45, fogFar: 120, skyTop: 0x4a5a48, skyHorizon: 0xbcc8b8 },
      Train:     { bg: 0x5a6a78, fog: 0x6a7885, fogNear: 45, fogFar: 120, skyTop: 0x3a4a58, skyHorizon: 0xb0c0d0 },
      Overpass:  { bg: 0x5a7a6a, fog: 0x6a8a78, fogNear: 48, fogFar: 125, skyTop: 0x3a5a4a, skyHorizon: 0xb0d0c0 },
      Nuke:      { bg: 0x4a5a6a, fog: 0x5a6a78, fogNear: 45, fogFar: 120, skyTop: 0x2a3a4a, skyHorizon: 0xa0b8d0 },
      Italy:     { bg: 0x6a8aaa, fog: 0x7a9ab8, fogNear: 50, fogFar: 130, skyTop: 0x4a6a90, skyHorizon: 0xc0d8f0 },
      Warehouse: { bg: 0x4a5a6a, fog: 0x5a6878, fogNear: 40, fogFar: 110, skyTop: 0x2a3a4a, skyHorizon: 0xa0b0c0 },
    };

    const sky = skyColors[arena.name] ?? skyColors.Dust2;
    const bgColor = new THREE.Color(sky.bg);
    this.scene.background = bgColor;
    this.scene.fog = new THREE.Fog(new THREE.Color(sky.fog), sky.fogNear, sky.fogFar);

    // Sky dome
    this.createSkyDome(sky.skyTop, sky.skyHorizon);

    const groundGeometry = new THREE.PlaneGeometry(arena.bounds.width, arena.bounds.depth, 18, 24);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: arena.name === 'Dust2' ? 0x8a7a5a : arena.name === 'Italy' ? 0x5d6870 : 0x555e66,
      metalness: 0.1,
      roughness: 0.78
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.z = arena.bounds.centerZ;
    ground.receiveShadow = true;
    this.addArenaObject(ground);

    [...arena.colliders, ...arena.props].forEach(spec => this.addBox(spec));

    const laneMaterial = new THREE.MeshStandardMaterial({
      color: 0xd0a74f,
      roughness: 0.42,
      metalness: 0.25,
      emissive: 0x1a1204
    });

    for (const x of [-22, 0, 22]) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 76), laneMaterial);
      stripe.position.set(x, 0.025, -8);
      stripe.receiveShadow = true;
      this.addArenaObject(stripe);
    }

    for (const position of [
      new THREE.Vector3(-25, 4.5, -28),
      new THREE.Vector3(25, 4.5, -28),
      new THREE.Vector3(0, 4.8, -10),
      new THREE.Vector3(-21, 3.8, 7),
      new THREE.Vector3(21, 3.8, 7),
      new THREE.Vector3(0, 4.6, 26)
    ]) {
      const lamp = new THREE.PointLight(0xffc98b, 1.85, 24, 2.0);
      lamp.position.copy(position);
      this.addArenaObject(lamp);
    }

    this.addBombSiteMarker('A', new THREE.Vector3(-24, 0.04, -27));
    this.addBombSiteMarker('B', new THREE.Vector3(24, 0.04, -27));

    const particleGeometry = new THREE.BufferGeometry();
    const particleCount = 80;
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * arena.bounds.width;
      positions[i * 3 + 1] = 1 + Math.random() * 7;
      positions[i * 3 + 2] = arena.bounds.centerZ - arena.bounds.depth / 2 + Math.random() * arena.bounds.depth;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.055,
      transparent: true,
      opacity: 0.22
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    this.addArenaObject(particles);
  }

  private addBox(spec: BoxSpec): void {
    let map: THREE.Texture | null = null;
    if (spec.textureKey) {
      map = getTexture(spec.textureKey);
      // Auto-calculate UV repeat based on surface size (1 tile per ~1.5 game units)
      const tileSize = 1.5;
      map = map.clone();
      map.repeat.set(
        Math.max(1, Math.round(spec.size.x / tileSize)),
        Math.max(1, Math.round(spec.size.z / tileSize))
      );
      map.needsUpdate = true;
    }

    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(spec.size.x, spec.size.y, spec.size.z),
      new THREE.MeshStandardMaterial({
        color: map ? 0xffffff : new THREE.Color(spec.color).lerp(new THREE.Color(0xffffff), 0.14),
        map: map ?? undefined,
        metalness: spec.metalness ?? 0.2,
        roughness: spec.roughness ?? 0.6,
        transparent: spec.opacity !== undefined && spec.opacity < 1,
        opacity: spec.opacity ?? 1
      })
    );
    mesh.position.copy(spec.position);
    if (spec.rotation) {
      mesh.rotation.set(spec.rotation.x, spec.rotation.y, spec.rotation.z);
    }
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = spec.name ?? 'arena-box';

    // Try PBR textures asynchronously on Dust2 only, falling back to Canvas.
    if (spec.textureKey && this.currentMapId === 'dust2') {
      const pbrKey = spec.textureKey as PBRTextureKey;
      const tileX = Math.max(1, Math.round(spec.size.x / 1.5));
      const tileY = Math.max(1, Math.round(spec.size.z / 1.5));

      loadPBRTextureSet(pbrKey, '/assets/textures', tileX, tileY).then(pbrSet => {
        if (pbrSet) {
          (mesh.material as THREE.MeshStandardMaterial).map = pbrSet.map;
          if (pbrSet.normalMap) (mesh.material as THREE.MeshStandardMaterial).normalMap = pbrSet.normalMap;
          if (pbrSet.roughnessMap) (mesh.material as THREE.MeshStandardMaterial).roughnessMap = pbrSet.roughnessMap;
          (mesh.material as THREE.MeshStandardMaterial).color.set(0xffffff);
          (mesh.material as THREE.MeshStandardMaterial).needsUpdate = true;
        }
        // If PBR fails, the Canvas texture from getTexture is already applied
      });
    }

    // 性能优化：标记可剔除的对象
    // 边界墙、地面、主要结构不应被剔除
    const shouldCull = !(
      spec.name?.includes('boundary') ||
      spec.name?.includes('wall-back') ||
      spec.name?.includes('wall-outer') ||
      spec.name?.includes('floor') ||
      spec.name?.includes('ground') ||
      spec.name?.includes('platform-base') ||
      spec.name?.includes('marker') ||
      spec.name?.includes('lamp')
    );

    if (shouldCull) {
      mesh.userData.frustumCullable = true;
    }

    this.addArenaObject(mesh);
  }

  private addArenaObject(object: THREE.Object3D): void {
    this.arenaObjects.push(object);
    this.scene.add(object);

    // 如果对象标记为可剔除，添加到剔除列表
    if (object.userData.frustumCullable) {
      this.frustumCullableObjects.push(object);
    }
  }

  private addBombSiteMarker(label: string, position: THREE.Vector3): void {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(2.8, 3.1, 48),
      new THREE.MeshBasicMaterial({ color: 0xd6a84f, transparent: true, opacity: 0.65, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(position);
    this.addArenaObject(ring);

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffd166';
    ctx.font = '900 76px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 64, 68);
    const texture = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
    sprite.position.set(position.x, 1.2, position.z);
    sprite.scale.set(1.4, 1.4, 1);
    this.addArenaObject(sprite);
  }

  private createSkyDome(skyTopColor: number, skyHorizonColor: number): void {
    // Remove old dome
    if (this.skyDome) {
      this.scene.remove(this.skyDome);
      this.skyDome.geometry.dispose();
      (this.skyDome.material as THREE.Material).dispose();
    }

    const radius = 95;
    const geometry = new THREE.SphereGeometry(radius, 48, 16, 0, Math.PI * 2, 0, Math.PI * 0.48);
    const topColor = new THREE.Color(skyTopColor);
    const horizonColor = new THREE.Color(skyHorizonColor);

    const colors: number[] = [];
    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      const t = Math.max(0, Math.min(1, y / (radius * 0.7)));
      const c = topColor.clone().lerp(horizonColor, 1 - t);
      colors.push(c.r, c.g, c.b);
    }
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.MeshBasicMaterial({
      vertexColors: true,
      side: THREE.BackSide,
      fog: false,
      depthWrite: false,
    });

    this.skyDome = new THREE.Mesh(geometry, material);
    this.skyDome.renderOrder = -1;
    this.scene.add(this.skyDome);
  }

  private clearArenaObjects(): void {
    this.arenaObjects.forEach(object => this.scene.remove(object));
    this.arenaObjects = [];
    this.frustumCullableObjects = [];
    this.lodObjects.clear();
    if (this.skyDome) {
      this.scene.remove(this.skyDome);
      this.skyDome.geometry.dispose();
      (this.skyDome.material as THREE.Material).dispose();
      this.skyDome = null;
    }
  }

  getCurrentArena(): ArenaData {
    return ARENA_MAPS[this.currentMapId];
  }

  getCurrentMapId(): MapId {
    return this.currentMapId;
  }

  getArenaColliders(): BoxSpec[] {
    return this.colliders;
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  getScene(): THREE.Scene {
    return this.scene;
  }

  getRenderer(): THREE.WebGLRenderer | null {
    return this.renderer;
  }

  getCanvas(): HTMLCanvasElement {
    return this.renderer?.domElement ?? this.fallbackCanvas!;
  }

  render(): void {
    // 更新视锥剔除
    this.updateFrustumCulling();

    // 渲染场景
    this.renderer?.render(this.scene, this.camera);

    // 更新相机位置用于下次视锥更新
    this.previousCameraPosition.copy(this.camera.position);
  }

  private updateFrustumCulling(): void {
    // 检查相机是否移动足够多来更新视锥
    const moved = this.camera.position.distanceTo(this.previousCameraPosition);
    if (moved < this.cameraMovementThreshold && this.frustumCullableObjects.length > 0) {
      return;
    }

    // 更新视锥矩阵
    this.frustumMatrix.multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse
    );
    this.frustum.setFromProjectionMatrix(this.frustumMatrix);

    // 对可剔除的对象进行可见性检查
    for (const obj of this.frustumCullableObjects) {
      // 距离剔除
      const distance = this.camera.position.distanceTo(obj.position);
      if (distance > this.cullingDistance) {
        obj.visible = false;
        this.lodObjects.set(obj, 'hidden');
        continue;
      }

      // 视锥剔除
      const inFrustum = this.frustum.intersectsObject(obj);
      obj.visible = inFrustum;
      this.lodObjects.set(obj, inFrustum ? 'high' : 'hidden');
    }
  }

  private isObjectFarEnoughForLOD(obj: THREE.Object3D): boolean {
    const distance = this.camera.position.distanceTo(obj.position);
    return distance > this.cullingDistance * 0.6; // 超过60%剔除距离使用低LOD
  }

  startRenderLoop(): void {
    const loop = () => {
      this.render();
      this.animationId = requestAnimationFrame(loop);
    };
    loop();
  }

  stopRenderLoop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  dispose(): void {
    this.stopRenderLoop();
    window.removeEventListener('resize', this.handleResizeBound!);
    if (this.skyDome) {
      this.scene.remove(this.skyDome);
      this.skyDome.geometry.dispose();
      (this.skyDome.material as THREE.Material).dispose();
      this.skyDome = null;
    }
    this.renderer?.dispose();
  }

  private createWebGLErrorCanvas(error: unknown): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#080b0f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffd166';
    ctx.font = '700 28px sans-serif';
    ctx.fillText('WebGL failed to initialize', 48, 80);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '18px sans-serif';
    ctx.fillText('Please enable hardware acceleration or test in a browser with WebGL support.', 48, 124);
    ctx.fillText(String(error instanceof Error ? error.message : error).slice(0, 120), 48, 162);
    return canvas;
  }
}
