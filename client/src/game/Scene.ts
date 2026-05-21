import * as THREE from 'three';
import { BoxSpec, INDUSTRIAL_ARENA } from './MapData.js';

export class Scene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer | null = null;
  private fallbackCanvas: HTMLCanvasElement | null = null;
  private animationId: number | null = null;
  private colliders: BoxSpec[] = [];

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111827);
    this.scene.fog = new THREE.Fog(0x111827, 26, 74);

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
      this.renderer.toneMappingExposure = 1.22;
    } catch (error) {
      this.fallbackCanvas = this.createWebGLErrorCanvas(error);
    }

    const ambientLight = new THREE.AmbientLight(0xe8f1ff, 0.56);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xfff3d0, 2.15);
    directionalLight.position.set(-12, 22, 12);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 1;
    directionalLight.shadow.camera.far = 80;
    directionalLight.shadow.camera.left = -38;
    directionalLight.shadow.camera.right = 38;
    directionalLight.shadow.camera.top = 38;
    directionalLight.shadow.camera.bottom = -38;
    this.scene.add(directionalLight);

    const hemiLight = new THREE.HemisphereLight(0x9fc4ff, 0x403a31, 0.82);
    this.scene.add(hemiLight);

    const groundGeometry = new THREE.PlaneGeometry(46, 48, 12, 12);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x555e66,
      metalness: 0.1,
      roughness: 0.78
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.z = -5.5;
    ground.receiveShadow = true;
    this.scene.add(ground);

    this.buildArena();

    window.addEventListener('resize', this.handleResize.bind(this));
  }

  private handleResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer?.setSize(window.innerWidth, window.innerHeight);
  }

  private buildArena(): void {
    this.colliders = INDUSTRIAL_ARENA.colliders;
    [...INDUSTRIAL_ARENA.colliders, ...INDUSTRIAL_ARENA.props].forEach(spec => this.addBox(spec));

    const laneMaterial = new THREE.MeshStandardMaterial({
      color: 0xd0a74f,
      roughness: 0.42,
      metalness: 0.25,
      emissive: 0x1a1204
    });

    for (const x of [-12, 12]) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.03, 31), laneMaterial);
      stripe.position.set(x, 0.025, -5.5);
      stripe.receiveShadow = true;
      this.scene.add(stripe);
    }

    for (const position of [new THREE.Vector3(-15, 3.2, -13), new THREE.Vector3(15, 3.2, -13), new THREE.Vector3(0, 3.6, 8)]) {
      const lamp = new THREE.PointLight(0xffc98b, 1.85, 24, 2.0);
      lamp.position.copy(position);
      this.scene.add(lamp);
    }

    this.addBombSiteMarker('A', new THREE.Vector3(-13, 0.04, -13));
    this.addBombSiteMarker('B', new THREE.Vector3(13, 0.04, -13));

    const particleGeometry = new THREE.BufferGeometry();
    const particleCount = 80;
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 42;
      positions[i * 3 + 1] = 1 + Math.random() * 7;
      positions[i * 3 + 2] = -28 + Math.random() * 45;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.055,
      transparent: true,
      opacity: 0.22
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    this.scene.add(particles);
  }

  private addBox(spec: BoxSpec): void {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(spec.size.x, spec.size.y, spec.size.z),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(spec.color).lerp(new THREE.Color(0xffffff), 0.14),
        metalness: spec.metalness ?? 0.2,
        roughness: spec.roughness ?? 0.6
      })
    );
    mesh.position.copy(spec.position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = spec.name ?? 'arena-box';
    this.scene.add(mesh);
  }

  private addBombSiteMarker(label: string, position: THREE.Vector3): void {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(2.8, 3.1, 48),
      new THREE.MeshBasicMaterial({ color: 0xd6a84f, transparent: true, opacity: 0.65, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(position);
    this.scene.add(ring);

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
    this.scene.add(sprite);
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
    this.renderer?.render(this.scene, this.camera);
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
    window.removeEventListener('resize', this.handleResize.bind(this));
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
