import * as THREE from 'three';
import { ARENA_MAPS, ArenaData, BoxSpec, MeshSpec } from './MapData.js';
import { MapId } from './types.js';
import { PLAYER_EYE_HEIGHT } from './constants/MapUnits.js';
import { getTexture, loadPBRTextureSet, PBRTextureKey } from './ProceduralTextures.js';
import { Physics } from './Physics.js';

export class Scene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer | null = null;
  private fallbackCanvas: HTMLCanvasElement | null = null;
  private animationId: number | null = null;
  private colliders: BoxSpec[] = [];
  private meshes: MeshSpec[] = [];
  private arenaObjects: THREE.Object3D[] = [];
  private arenaInspectionMode = false;
  private skyDome: THREE.Mesh | null = null;
  private currentMapId: MapId = 'dust2';
  private physics: Physics;

  // 性能优化：视锥剔除
  private frustum = new THREE.Frustum();
  private frustumMatrix = new THREE.Matrix4();
  private frustumCullableObjects: THREE.Object3D[] = [];
  private previousCameraPosition = new THREE.Vector3();
  private previousCameraQuaternion = new THREE.Quaternion();
  private cameraMovementThreshold = 0.35; // 相机移动多少单位后更新视锥
  private cameraRotationThreshold = 0.01;

  // 性能优化：距离剔除
  private cullingDistance = 100; // 超过这个距离的对象将被剔除
  private lodObjects: Map<THREE.Object3D, 'high' | 'low' | 'hidden'> = new Map();
  private handleResizeBound: (() => void) | null = null;
  private readonly maxPixelRatio = 1.25;

  constructor(physics: Physics) {
    this.physics = physics;
    this.handleResizeBound = this.handleResize.bind(this);
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x5b8cbf);
    this.scene.fog = new THREE.Fog(0x5b8cbf, 60, 160);

    this.camera = new THREE.PerspectiveCamera(
      90,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 1.7, 5);
    this.scene.add(this.camera);

    try {
      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: false
      });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.maxPixelRatio));
      this.renderer.shadowMap.enabled = false;
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
    directionalLight.castShadow = false;
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
    this.renderer?.setPixelRatio(Math.min(window.devicePixelRatio, this.maxPixelRatio));
  }

  setArena(mapId: MapId): void {
    const arena = ARENA_MAPS[mapId] ?? ARENA_MAPS.dust2;
    this.currentMapId = mapId;
    this.clearArenaObjects();
    this.buildArena(arena);
  }

  private buildArena(arena: ArenaData): void {
    this.colliders = arena.colliders;
    this.meshes = arena.meshes ?? [];

    // Map-specific sky colors
    const skyColors: Record<string, { bg: number; fog: number; fogNear: number; fogFar: number; skyTop: number; skyHorizon: number }> = {
      // 更接近 CS:GO Dust2 的沙尘暖雾
      Dust2:     { bg: 0x8cb5d6, fog: 0xc8b898, fogNear: 50, fogFar: 160, skyTop: 0x6a9ccf, skyHorizon: 0xccb890 },
      Mirage:    { bg: 0x6a8faa, fog: 0x7a9fb5, fogNear: 50, fogFar: 130, skyTop: 0x4a7090, skyHorizon: 0xc0d8e8 },
      Inferno:   { bg: 0x6d7b6a, fog: 0x758568, fogNear: 45, fogFar: 120, skyTop: 0x4a5a48, skyHorizon: 0xbcc8b8 },
      Train:     { bg: 0x5a6a78, fog: 0x6a7885, fogNear: 45, fogFar: 120, skyTop: 0x3a4a58, skyHorizon: 0xb0c0d0 },
      Overpass:  { bg: 0x5a7a6a, fog: 0x6a8a78, fogNear: 48, fogFar: 125, skyTop: 0x3a5a4a, skyHorizon: 0xb0d0c0 },
      Nuke:      { bg: 0x4a5a6a, fog: 0x5a6a78, fogNear: 45, fogFar: 120, skyTop: 0x2a3a4a, skyHorizon: 0xa0b8d0 },
      Italy:     { bg: 0x6a8aaa, fog: 0x7a9ab8, fogNear: 50, fogFar: 130, skyTop: 0x4a6a90, skyHorizon: 0xc0d8f0 },
      Warehouse:    { bg: 0x4a5a6a, fog: 0x5a6878, fogNear: 40, fogFar: 110, skyTop: 0x2a3a4a, skyHorizon: 0xa0b0c0 },
      // client/src/game/Scene.ts 中的 skyColors 配置
      'Blood Strike': { 
        bg: 0x799ebd, 
        fog: 0xa8b8c8, 
        fogNear: 80, 
        fogFar: 250,  
        skyTop: 0x5482a8, 
        skyHorizon: 0xb5c6d6 
      },
    };

    const sky = skyColors[arena.name] ?? skyColors.Dust2;
    const bgColor = new THREE.Color(sky.bg);
    this.scene.background = bgColor;
    this.scene.fog = new THREE.Fog(new THREE.Color(sky.fog), sky.fogNear, sky.fogFar);

    // Sky dome
    this.createSkyDome(sky.skyTop, sky.skyHorizon);

    // 注意：地面几何体由 MapData.ts 的 props 定义，不再在此创建 PlaneGeometry
    // 避免 Z-fighting（多个地面在同一 y 高度导致材质闪烁）

    // 动态设置全局地面高度，确保射线检测能正常工作
    // Inferno: T 出生点地面约 y=-0.16，CT 出生点地面约 y=1.28，最低地面约 y=-0.16
    // Dust2: T 出生点地面约 y=1.92，CT 出生点地面约 y=-0.24
    const groundY = arena.name === 'Inferno' ? -0.5 : arena.name === 'Dust2' ? -1.0 : 0;
    this.physics.setGlobalGroundEnabled(true, groundY);
    console.log(`[Scene] Global ground set to y=${groundY} for map: ${arena.name}`);

    [...arena.colliders, ...arena.props].forEach(spec => {
      if (!spec.physicsOnly) this.addBox(spec);
    });
    this.meshes.forEach(spec => this.addMesh(spec));

    const isD2 = arena.name === 'Dust2';

    if (isD2) {
      if (arena.source?.sourceBacked) {
        const addLight = (position: THREE.Vector3, color: number, intensity: number, distance: number) => {
          const light = new THREE.PointLight(color, intensity, distance, 1.9);
          light.position.copy(position);
          this.addArenaObject(light);
        };
        const ctCenter = arena.enemySpawns.length > 0
          ? arena.enemySpawns
              .reduce((sum, spawn) => sum.add(spawn.position), new THREE.Vector3())
              .multiplyScalar(1 / arena.enemySpawns.length)
          : new THREE.Vector3(2.5, PLAYER_EYE_HEIGHT, -22.4);
        const tSpawn = arena.playerSpawn.clone();
        const aSite = arena.bombSites?.A.clone() ?? new THREE.Vector3(-15.36, 0.04, -26.88);
        const bSite = arena.bombSites?.B.clone() ?? new THREE.Vector3(11.52, 0.04, -24.64);

        addLight(new THREE.Vector3(tSpawn.x, 4.2, tSpawn.z), 0xffeebb, 1.7, 20);
        addLight(new THREE.Vector3(ctCenter.x, 3.8, ctCenter.z), 0xfffae8, 1.9, 20);
        addLight(new THREE.Vector3(aSite.x, 4.8, aSite.z), 0xffefdc, 2.0, 18);
        addLight(new THREE.Vector3(bSite.x, 4.8, bSite.z), 0xffeedd, 1.8, 18);
        addLight(new THREE.Vector3(-3.2, 3.4, -11.8), 0xffd8a0, 1.4, 16);
        addLight(new THREE.Vector3(-9.6, 3.2, -15.1), 0xffe2b0, 1.1, 12);
        addLight(new THREE.Vector3(5.2, 2.7, -5.1), 0xff9930, 1.0, 10);
        addLight(new THREE.Vector3(12.8, 3.0, -1.5), 0x8090a0, 0.7, 10);
      } else {
      // ── Dust2 专用灯光 ──────────────────────────────────────
      // CT Spawn 路灯（明亮白光）
      const ctLamps = [
        new THREE.Vector3(-3.84, 3.6, -30.72),
        new THREE.Vector3( 3.84, 3.6, -30.72),
        new THREE.Vector3( 0,    3.6, -33.28),
      ];
      ctLamps.forEach(pos => {
        const l = new THREE.PointLight(0xfffae8, 2.2, 18, 2.0);
        l.position.copy(pos);
        this.addArenaObject(l);
      });

      // A Site 天光（从上方射入的暖阳）
      const aSiteLamps = [
        new THREE.Vector3(-25.6, 5.2, 12.8),
        new THREE.Vector3(-22.8, 4.8, 15.8),
        new THREE.Vector3(-28.8, 4.7, 10.2),
      ];
      aSiteLamps.forEach(pos => {
        const l = new THREE.PointLight(0xffefdc, 2.0, 18, 1.8);
        l.position.copy(pos);
        this.addArenaObject(l);
      });

      // B Site 灯光
      const bSiteLamps = [
        new THREE.Vector3( 25.6, 5.0,  12.8),
        new THREE.Vector3( 28.0, 4.5,   9.0),
        new THREE.Vector3( 22.0, 4.5,  16.0),
      ];
      bSiteLamps.forEach(pos => {
        const l = new THREE.PointLight(0xffeedd, 1.8, 20, 1.8);
        l.position.copy(pos);
        this.addArenaObject(l);
      });

      // Lower B Tunnels 壁灯 — 入口略亮，出口略暗
      [55.0, 42.0, 28.0, 14.0].forEach((zHU, i) => {
        const intensity = i < 2 ? 1.2 : 1.0;
        const l = new THREE.PointLight(0xff9930, intensity, 10, 2.4);
        l.position.set(32.64, 2.0, -zHU);
        this.addArenaObject(l);
      });
      // Upper Dark — 极暗冷光，强化暗角感
      const upperDarkLight = new THREE.PointLight(0x8090a0, 0.5, 8, 2.8);
      upperDarkLight.position.set(32.64, 3.8, -5.12);
      this.addArenaObject(upperDarkLight);
      // B Site 额外补光 — 比洞道亮
      const bSiteExtraLight = new THREE.PointLight(0xffeedd, 1.4, 16, 1.8);
      bSiteExtraLight.position.set(25.6, 4.8, 12.8);
      this.addArenaObject(bSiteExtraLight);

      // A Long 走廊壁灯（橙黄色，较暗）
      [50.0, 35.0, 15.0].forEach(zHU => {
        const l = new THREE.PointLight(0xff9930, 1.2, 12, 2.2);
        l.position.set(-39.04, 2.0, -zHU);
        this.addArenaObject(l);
      });

      // Mid 中路天光 + Doors 过渡光
      const midLights = [
        { pos: new THREE.Vector3(0, 4.8, -10.24), color: 0xfff0d0, intensity: 1.6, dist: 22 },
        { pos: new THREE.Vector3(0, 3.2, -20.48), color: 0xffd8a0, intensity: 1.3, dist: 14 },
        { pos: new THREE.Vector3(-15.36, 3.8, -12.16), color: 0xffe2b0, intensity: 1.1, dist: 12 },
      ];
      midLights.forEach(({ pos, color, intensity, dist }) => {
        const l = new THREE.PointLight(color, intensity, dist, 1.9);
        l.position.copy(pos);
        this.addArenaObject(l);
      });

      // T Spawn 顶光
      const tSpawnLight = new THREE.PointLight(0xffeebb, 1.6, 20, 1.8);
      tSpawnLight.position.set(0, 4.0, -61.44);
      this.addArenaObject(tSpawnLight);
      }

    } else {
      // 其他地图通用灯光
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
    }

    // Dust2 no lane stripes — they look wrong on the new large map
    if (!isD2) {
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
    }

    const dust2BombSites = isD2 && arena.bombSites
      ? arena.bombSites
      : {
          A: new THREE.Vector3(-25.6, 0.04, 12.8),
          B: new THREE.Vector3(25.6, 0.04, 12.8),
        };
    this.addBombSiteMarker('A', isD2
      ? dust2BombSites.A
      : new THREE.Vector3(-24,   0.04, -27));
    this.addBombSiteMarker('B', isD2
      ? dust2BombSites.B
      : new THREE.Vector3( 24,   0.04, -27));

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

  private addMesh(spec: MeshSpec): void {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(spec.positions.length * 3);

    spec.positions.forEach((position, index) => {
      positions[index * 3] = position.x;
      positions[index * 3 + 1] = position.y;
      positions[index * 3 + 2] = position.z;
    });

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setIndex(spec.indices);
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(spec.color).lerp(new THREE.Color(0xffffff), 0.08),
      metalness: spec.metalness ?? 0.05,
      roughness: spec.roughness ?? 0.8,
      transparent: spec.opacity !== undefined && spec.opacity < 1,
      opacity: spec.opacity ?? 1,
      side: THREE.DoubleSide
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = spec.name ?? 'arena-mesh';

    if (mesh.name.includes('dust2-goldsrc') || mesh.name.includes('inferno-goldsrc')) {
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry, 24),
        new THREE.LineBasicMaterial({
          color: 0x2f2a1f,
          transparent: true,
          opacity: this.arenaInspectionMode ? 0.42 : 0,
          depthTest: true,
        })
      );
      edges.name = `${mesh.name}-inspection-edges`;
      mesh.add(edges);
    }

    // 添加 trimesh 碰撞体（如果有碰撞数据）
    if (spec.collisionPositions && spec.collisionIndices && spec.collisionIndices.length > 0) {
      const collisionVertices: number[] = [];
      spec.collisionPositions.forEach((position) => {
        collisionVertices.push(position.x, position.y, position.z);
      });
      const body = this.physics.addStaticTrimesh(collisionVertices, spec.collisionIndices, spec.name ?? 'trimesh-collision');
      console.log(`[Scene] Added trimesh collision for ${spec.name}:`, collisionVertices.length / 3, 'vertices,', spec.collisionIndices.length / 3, 'triangles');
    } else {
      console.warn(`[Scene] No collision data for mesh: ${spec.name}`);
    }

    if (this.arenaInspectionMode) {
      this.applyInspectionMaterial(mesh);
    }
    this.addArenaObject(mesh);
  }

  setArenaInspectionMode(enabled: boolean): void {
    this.arenaInspectionMode = enabled;
    for (const object of this.arenaObjects) {
      object.traverse(child => {
        if (child instanceof THREE.Mesh && child.name.includes('dust2-goldsrc')) {
          this.applyInspectionMaterial(child);
        }
        if (child instanceof THREE.LineSegments && child.name.includes('inspection-edges')) {
          const material = child.material;
          if (material instanceof THREE.LineBasicMaterial) {
            material.opacity = enabled ? 0.42 : 0;
            material.needsUpdate = true;
          }
        }
      });
    }
  }

  private applyInspectionMaterial(mesh: THREE.Mesh): void {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      if (material instanceof THREE.MeshStandardMaterial) {
        material.transparent = this.arenaInspectionMode;
        material.opacity = this.arenaInspectionMode ? 0.86 : 1;
        material.depthWrite = !this.arenaInspectionMode;
        material.needsUpdate = true;
      }
    }
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

  getArenaMeshes(): MeshSpec[] {
    return this.meshes;
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
    this.previousCameraQuaternion.copy(this.camera.quaternion);
  }

  private updateFrustumCulling(): void {
    // 检查相机是否移动足够多来更新视锥
    const moved = this.camera.position.distanceTo(this.previousCameraPosition);
    const rotated = this.previousCameraQuaternion.angleTo(this.camera.quaternion);
    if (moved < this.cameraMovementThreshold && rotated < this.cameraRotationThreshold && this.frustumCullableObjects.length > 0) {
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
