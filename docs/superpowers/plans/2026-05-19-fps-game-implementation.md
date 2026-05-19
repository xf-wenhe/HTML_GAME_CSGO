# Web FPS Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based first-person shooter game with single-player AI mode and multiplayer network battles.

**Architecture:** Single Node.js application with Vite frontend, Socket.io backend, Three.js rendering, Cannon-es physics. Client-side prediction with server authority for network sync.

**Tech Stack:** TypeScript, Vite, Three.js, Cannon-es, Express, Socket.io

---

## Task 1: Project Initialization

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `.gitignore`
- Create: `client/src/main.ts`
- Create: `client/index.html`

- [ ] **Step 1: Create package.json with dependencies**

```json
{
  "name": "fps-web-game",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "node server/index.ts & vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.7.2",
    "socket.io-client": "^4.7.2",
    "three": "^0.158.0",
    "cannon-es": "^0.20.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.0",
    "typescript": "^5.3.3",
    "vite": "^5.0.8",
    "tsx": "^4.7.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "lib": ["ES2020", "DOM"],
    "resolveJsonModule": true
  },
  "include": ["client/src", "server"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 3: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'client',
  server: {
    port: 5173,
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true
      }
    }
  }
});
```

- [ ] **Step 4: Create .gitignore**

```
node_modules/
dist/
*.log
.DS_Store
```

- [ ] **Step 5: Create client/index.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FPS Web Game</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>
```

- [ ] **Step 6: Create client/src/main.ts**

```typescript
console.log('FPS Web Game - Main entry point');
```

- [ ] **Step 7: Create client/style.css**

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  overflow: hidden;
  background: #1a1a2e;
  font-family: Arial, sans-serif;
}

#app {
  width: 100vw;
  height: 100vh;
}
```

- [ ] **Step 8: Commit project initialization**

```bash
git add package.json tsconfig.json vite.config.ts .gitignore client/
git commit -m "feat: initialize project with Vite, TypeScript, and core dependencies"
```

---

## Task 2: Express + Socket.io Server Setup

**Files:**
- Create: `server/index.ts`
- Create: `server/rooms.ts`
- Create: `server/types.ts`

- [ ] **Step 1: Write failing test for server startup**

```typescript
// server/test/server.test.ts (create file first)
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { io as ioClient, Socket } from 'socket.io-client';

describe('Server', () => {
  let socket: Socket;

  beforeAll(async () => {
    socket = ioClient('http://localhost:3000');
  });

  afterAll(() => {
    socket.close();
  });

  it('should accept client connection', (done) => {
    socket.on('connect', () => {
      expect(socket.connected).toBe(true);
      done();
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm install --save-dev vitest @vitest/ui
npm run dev &
sleep 3
npx vitest run server/test/server.test.ts
```

Expected: Server not running, connection fails

- [ ] **Step 3: Create shared types file**

```typescript
// server/types.ts
export type GameMode = 'solo' | 'multiplayer';

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface PlayerState {
  id: string;
  position: Vector3;
  rotation: Vector3;
  health: number;
  isDead: boolean;
}

export interface Room {
  id: string;
  mode: GameMode;
  players: Map<string, PlayerState>;
  maxPlayers: number;
}
```

- [ ] **Step 4: Create rooms module**

```typescript
// server/rooms.ts
import { Room, GameMode, PlayerState } from './types.ts';

export class RoomManager {
  private rooms = new Map<string, Room>();

  createRoom(mode: GameMode, maxPlayers: number = 4): Room {
    const id = `${mode === 'solo' ? 'solo' : 'mp'}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const room: Room = {
      id,
      mode,
      players: new Map(),
      maxPlayers
    };
    this.rooms.set(id, room);
    return room;
  }

  getRoom(id: string): Room | undefined {
    return this.rooms.get(id);
  }

  removeRoom(id: string): void {
    this.rooms.delete(id);
  }

  addPlayerToRoom(roomId: string, playerId: string, state: PlayerState): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.players.size >= room.maxPlayers) return false;
    room.players.set(playerId, state);
    return true;
  }

  removePlayerFromRoom(roomId: string, playerId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.players.delete(playerId);
      if (room.players.size === 0) {
        this.removeRoom(roomId);
      }
    }
  }

  getRoomList(): Array<{ id: string; mode: GameMode; playerCount: number }> {
    return Array.from(this.rooms.values()).map(room => ({
      id: room.id,
      mode: room.mode,
      playerCount: room.players.size
    }));
  }
}
```

- [ ] **Step 5: Create server entry point**

```typescript
// server/index.ts
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { RoomManager } from './rooms.js';
import { GameMode, Vector3 } from './types.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

const roomManager = new RoomManager();

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', rooms: roomManager.getRoomList().length });
});

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('joinLobby', () => {
    socket.emit('roomList', roomManager.getRoomList());
  });

  socket.on('createRoom', (data: { mode: GameMode; maxPlayers?: number }) => {
    const room = roomManager.createRoom(data.mode, data.maxPlayers);
    socket.emit('roomCreated', { roomId: room.id });
  });

  socket.on('joinRoom', (data: { roomId: string; playerName: string }) => {
    const room = roomManager.getRoom(data.roomId);
    if (!room) {
      socket.emit('roomError', { message: 'Room not found' });
      return;
    }

    const playerState = {
      id: socket.id,
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      health: 100,
      isDead: false
    };

    if (roomManager.addPlayerToRoom(data.roomId, socket.id, playerState)) {
      socket.join(data.roomId);
      socket.emit('roomJoined', { roomId: data.roomId, playerId: socket.id });
      socket.to(data.roomId).emit('playerJoined', playerState);
    } else {
      socket.emit('roomError', { message: 'Room is full' });
    }
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

- [ ] **Step 6: Update package.json with test script**

```json
"scripts": {
  "dev": "node --loader tsx server/index.ts & vite",
  "test": "vitest"
}
```

- [ ] **Step 7: Run test to verify it passes**

```bash
npx vitest run server/test/server.test.ts
```

Expected: PASS

- [ ] **Step 8: Commit server setup**

```bash
git add server/
git commit -m "feat: add Express server with Socket.io and room management"
```

---

## Task 3: Three.js Scene Setup

**Files:**
- Create: `client/src/game/Scene.ts`
- Modify: `client/src/main.ts`

- [ ] **Step 1: Write failing test for scene creation**

```typescript
// client/src/game/test/Scene.test.ts
import { describe, it, expect } from 'vitest';
import { Scene } from '../Scene.js';

describe('Scene', () => {
  it('should create a Three.js scene with camera', () => {
    const scene = new Scene();
    expect(scene).toBeDefined();
    expect(scene.getCamera()).toBeDefined();
    scene.dispose();
  });

  it('should render to a canvas element', () => {
    const scene = new Scene();
    const canvas = scene.getCanvas();
    expect(canvas).toBeInstanceOf(HTMLCanvasElement);
    scene.dispose();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run client/src/game/test/Scene.test.ts
```

Expected: FAIL - Scene class does not exist

- [ ] **Step 3: Create Scene class**

```typescript
// client/src/game/Scene.ts
import * as THREE from 'three';

export class Scene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private animationId: number | null = null;

  constructor() {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB);

    // Camera (first-person perspective)
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 1.7, 5);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);

    // Ground
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x3a5a40 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Handle window resize
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  private handleResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  getScene(): THREE.Scene {
    return this.scene;
  }

  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  getCanvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
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
    this.renderer.dispose();
  }
}
```

- [ ] **Step 4: Update main.ts to use Scene**

```typescript
import { Scene } from './game/Scene.js';

const scene = new Scene();
document.getElementById('app')?.appendChild(scene.getCanvas());
scene.startRenderLoop();

export { scene };
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx vitest run client/src/game/test/Scene.test.ts
```

Expected: PASS

- [ ] **Step 6: Manually verify scene renders**

```bash
npm run dev
```

Open http://localhost:5173 - should see blue sky with green ground

- [ ] **Step 7: Commit scene setup**

```bash
git add client/src/game/Scene.ts client/src/main.ts
git commit -m "feat: add Three.js scene with camera, lighting, and ground"
```

---

## Task 4: Physics Engine Integration

**Files:**
- Create: `client/src/game/Physics.ts`
- Create: `client/src/game/types.ts`

- [ ] **Step 1: Create shared types for frontend**

```typescript
// client/src/game/types.ts
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export type GameMode = 'solo' | 'multiplayer';

export interface PlayerState {
  id: string;
  position: Vector3;
  rotation: Vector3;
  health: number;
  isDead: boolean;
}

export interface Weapon {
  id: string;
  name: string;
  damage: number;
  fireRate: number;
  magazineSize: number;
  reloadTime: number;
  spread: number;
  projectileSpeed: number;
}
```

- [ ] **Step 2: Write failing test for physics**

```typescript
// client/src/game/test/Physics.test.ts
import { describe, it, expect } from 'vitest';
import { Physics } from '../Physics.js';
import * as CANNON from 'cannon-es';

describe('Physics', () => {
  it('should create a physics world with gravity', () => {
    const physics = new Physics();
    expect(physics.getWorld()).toBeDefined();
    expect(physics.getWorld().gravity).toEqual(new CANNON.Vec3(0, -9.82, 0));
    physics.dispose();
  });

  it('should add and step bodies', () => {
    const physics = new Physics();
    const body = new CANNON.Body({ mass: 1, shape: new CANNON.Box(new CANNON.Vec3(1, 1, 1)) });
    physics.addBody(body);
    physics.step(0.016);
    expect(body.position.y).toBeLessThan(0);
    physics.dispose();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
npx vitest run client/src/game/test/Physics.test.ts
```

Expected: FAIL - Physics class does not exist

- [ ] **Step 4: Create Physics wrapper**

```typescript
// client/src/game/Physics.ts
import * as CANNON from 'cannon-es';

export class Physics {
  private world: CANNON.World;
  private bodies: CANNON.Body[] = [];

  constructor() {
    this.world = new CANNON.World();
    this.world.gravity.set(0, -9.82, 0);

    // Default material
    const defaultMaterial = new CANNON.Material('default');
    const defaultContactMaterial = new CANNON.ContactMaterial(
      defaultMaterial,
      defaultMaterial,
      { friction: 0.1, restitution: 0.3 }
    );
    this.world.addContactMaterial(defaultContactMaterial);

    // Ground plane
    const groundShape = new CANNON.Plane();
    const groundBody = new CANNON.Body({ mass: 0, material: defaultMaterial });
    groundBody.addShape(groundShape);
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    this.world.addBody(groundBody);
    this.bodies.push(groundBody);
  }

  getWorld(): CANNON.World {
    return this.world;
  }

  addBody(body: CANNON.Body): void {
    this.world.addBody(body);
    this.bodies.push(body);
  }

  removeBody(body: CANNON.Body): void {
    this.world.removeBody(body);
    this.bodies = this.bodies.filter(b => b !== body);
  }

  step(dt: number = 0.016): void {
    this.world.step(dt);
  }

  dispose(): void {
    this.bodies.forEach(body => {
      this.world.removeBody(body);
    });
    this.bodies = [];
  }
}
```

- [ ] **Step 5: Update package.json with cannon-es types**

```bash
npm install --save-dev @types/cannon-es
```

- [ ] **Step 6: Run test to verify it passes**

```bash
npx vitest run client/src/game/test/Physics.test.ts
```

Expected: PASS

- [ ] **Step 7: Commit physics integration**

```bash
git add client/src/game/Physics.ts client/src/game/types.ts
git commit -m "feat: add Cannon-es physics wrapper with gravity and ground"
```

---

## Task 5: First-Person Controller (Movement)

**Files:**
- Create: `client/src/game/PlayerController.ts`
- Create: `client/src/game/InputManager.ts`

- [ ] **Step 1: Write failing test for input manager**

```typescript
// client/src/game/test/InputManager.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { InputManager } from '../InputManager.js';

describe('InputManager', () => {
  let input: InputManager;

  beforeEach(() => {
    input = new InputManager();
  });

  it('should track key states', () => {
    expect(input.isKeyPressed('KeyW')).toBe(false);
    input.setKeyPressed('KeyW', true);
    expect(input.isKeyPressed('KeyW')).toBe(true);
  });

  it('should track mouse movement', () => {
    expect(input.getMouseDelta()).toEqual({ x: 0, y: 0 });
    input.setMouseDelta(10, -5);
    expect(input.getMouseDelta()).toEqual({ x: 10, y: -5 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run client/src/game/test/InputManager.test.ts
```

Expected: FAIL - InputManager does not exist

- [ ] **Step 3: Create InputManager**

```typescript
// client/src/game/InputManager.ts
export interface MouseDelta {
  x: number;
  y: number;
}

export class InputManager {
  private keys = new Set<string>();
  private mouseDelta: MouseDelta = { x: 0, y: 0 };
  private mousePosition = { x: 0, y: 0 };

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    document.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
    });

    document.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    document.addEventListener('mousemove', (e) => {
      this.mouseDelta.x += e.movementX;
      this.mouseDelta.y += e.movementY;
      this.mousePosition.x = e.clientX;
      this.mousePosition.y = e.clientY;
    });

    document.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.keys.add('MouseLeft');
    });

    document.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.keys.delete('MouseLeft');
    });
  }

  isKeyPressed(key: string): boolean {
    return this.keys.has(key);
  }

  setKeyPressed(key: string, pressed: boolean): void {
    if (pressed) {
      this.keys.add(key);
    } else {
      this.keys.delete(key);
    }
  }

  getMouseDelta(): MouseDelta {
    const delta = { ...this.mouseDelta };
    this.mouseDelta = { x: 0, y: 0 };
    return delta;
  }

  setMouseDelta(x: number, y: number): void {
    this.mouseDelta = { x, y };
  }

  getMousePosition(): { x: number; y: number } {
    return { ...this.mousePosition };
  }

  requestPointerLock(): void {
    document.body.requestPointerLock();
  }

  exitPointerLock(): void {
    document.exitPointerLock();
  }

  isPointerLocked(): boolean {
    return document.pointerLockElement === document.body;
  }
}
```

- [ ] **Step 4: Create PlayerController**

```typescript
// client/src/game/PlayerController.ts
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Physics } from './Physics.js';
import { InputManager } from './InputManager.js';
import { Scene } from './Scene.js';

export class PlayerController {
  private body: CANNON.Body;
  private camera: THREE.PerspectiveCamera;
  private input: InputManager;
  private physics: Physics;

  // Player settings
  private walkSpeed = 5;
  private jumpForce = 5;
  private mouseSensitivity = 0.002;

  // Camera rotation (Euler angles)
  private pitch = 0;
  private yaw = 0;

  constructor(scene: Scene, physics: Physics, input: InputManager, position: THREE.Vector3 = new THREE.Vector3(0, 1.7, 0)) {
    this.camera = scene.getCamera();
    this.input = input;
    this.physics = physics;

    // Create physics body
    const shape = new CANNON.Box(new CANNON.Vec3(0.5, 1.0, 0.5));
    this.body = new CANNON.Body({
      mass: 70,
      shape: shape,
      position: new CANNON.Vec3(position.x, position.y, position.z),
      fixedRotation: true,
      linearDamping: 0.9
    });
    this.physics.addBody(this.body);

    // Set initial camera position
    this.camera.position.copy(position);
  }

  update(dt: number): void {
    // Update camera position to match physics body
    this.camera.position.set(
      this.body.position.x,
      this.body.position.y + 0.7,
      this.body.position.z
    );

    // Handle mouse look
    const mouseDelta = this.input.getMouseDelta();
    this.yaw -= mouseDelta.x * this.mouseSensitivity;
    this.pitch -= mouseDelta.y * this.mouseSensitivity;

    // Clamp pitch
    this.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, this.pitch));

    // Apply rotation
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;

    // Get forward and right vectors
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

    const right = new THREE.Vector3(1, 0, 0);
    right.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

    // Handle movement input
    const moveDirection = new THREE.Vector3();

    if (this.input.isKeyPressed('KeyW')) {
      moveDirection.add(forward);
    }
    if (this.input.isKeyPressed('KeyS')) {
      moveDirection.sub(forward);
    }
    if (this.input.isKeyPressed('KeyA')) {
      moveDirection.sub(right);
    }
    if (this.input.isKeyPressed('KeyD')) {
      moveDirection.add(right);
    }

    // Normalize and apply speed
    if (moveDirection.length() > 0) {
      moveDirection.normalize();
      this.body.velocity.x = moveDirection.x * this.walkSpeed;
      this.body.velocity.z = moveDirection.z * this.walkSpeed;
    } else {
      this.body.velocity.x = 0;
      this.body.velocity.z = 0;
    }

    // Jump
    if (this.input.isKeyPressed('Space')) {
      this.input.setKeyPressed('Space', false);
      if (this.canJump()) {
        this.body.velocity.y = this.jumpForce;
      }
    }
  }

  private canJump(): boolean {
    const rayStart = new CANNON.Vec3(this.body.position.x, this.body.position.y, this.body.position.z);
    const rayEnd = new CANNON.Vec3(this.body.position.x, this.body.position.y - 1.1, this.body.position.z);
    const ray = new CANNON.Ray(rayStart, rayEnd);
    const result = new CANNON.RaycastResult();
    return ray.intersectWorld(this.physics.getWorld(), { mode: CANNON.Ray.CLOSEST, skipBackfaces: true }, result);
  }

  getPosition(): THREE.Vector3 {
    return new THREE.Vector3(this.body.position.x, this.body.position.y, this.body.position.z);
  }

  getRotation(): { pitch: number; yaw: number } {
    return { pitch: this.pitch, yaw: this.yaw };
  }

  dispose(): void {
    this.physics.removeBody(this.body);
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx vitest run client/src/game/test/InputManager.test.ts
```

Expected: PASS

- [ ] **Step 6: Update main.ts to include player controller**

```typescript
import { Scene } from './game/Scene.js';
import { Physics } from './game/Physics.js';
import { InputManager } from './game/InputManager.js';
import { PlayerController } from './game/PlayerController.js';

const scene = new Scene();
const physics = new Physics();
const input = new InputManager();

const player = new PlayerController(scene, physics, input);
document.getElementById('app')?.appendChild(scene.getCanvas());

// Pointer lock for mouse look
document.addEventListener('click', () => {
  input.requestPointerLock();
});

// Game loop
function gameLoop() {
  player.update(0.016);
  physics.step(0.016);
  scene.render();
  requestAnimationFrame(gameLoop);
}

gameLoop();

export { scene, physics, input, player };
```

- [ ] **Step 7: Test player movement manually**

```bash
npm run dev
```

Open http://localhost:5173, click to lock pointer, use WASD to move, mouse to look around, Space to jump

- [ ] **Step 8: Commit player controller**

```bash
git add client/src/game/InputManager.ts client/src/game/PlayerController.ts client/src/main.ts
git commit -m "feat: add first-person player controller with WASD movement and mouse look"
```

---

## Task 6: Weapon System

**Files:**
- Create: `client/src/game/Weapon.ts`
- Create: `client/src/game/WeaponManager.ts`

- [ ] **Step 1: Write failing test for weapon**

```typescript
// client/src/game/test/Weapon.test.ts
import { describe, it, expect, vi } from 'vitest';
import { Weapon } from '../Weapon.js';

describe('Weapon', () => {
  it('should create weapon with correct stats', () => {
    const weapon = new Weapon({
      id: 'pistol',
      name: 'Pistol',
      damage: 20,
      fireRate: 2,
      magazineSize: 12,
      reloadTime: 1.5,
      spread: 0.05,
      projectileSpeed: 50
    });
    expect(weapon.damage).toBe(20);
    expect(weapon.currentAmmo).toBe(12);
    expect(weapon.canShoot()).toBe(true);
  });

  it('should consume ammo on shoot', () => {
    const weapon = new Weapon({
      id: 'pistol',
      name: 'Pistol',
      damage: 20,
      fireRate: 2,
      magazineSize: 12,
      reloadTime: 1.5,
      spread: 0.05,
      projectileSpeed: 50
    });
    weapon.shoot();
    expect(weapon.currentAmmo).toBe(11);
  });

  it('should not shoot when empty', () => {
    const weapon = new Weapon({
      id: 'pistol',
      name: 'Pistol',
      damage: 20,
      fireRate: 2,
      magazineSize: 12,
      reloadTime: 1.5,
      spread: 0.05,
      projectileSpeed: 50
    });
    weapon.currentAmmo = 0;
    expect(weapon.shoot()).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run client/src/game/test/Weapon.test.ts
```

Expected: FAIL - Weapon class does not exist

- [ ] **Step 3: Create Weapon class**

```typescript
// client/src/game/Weapon.ts
export interface WeaponConfig {
  id: string;
  name: string;
  damage: number;
  fireRate: number;
  magazineSize: number;
  reloadTime: number;
  spread: number;
  projectileSpeed: number;
}

export class Weapon {
  public readonly id: string;
  public readonly name: string;
  public readonly damage: number;
  public readonly fireRate: number;
  public readonly magazineSize: number;
  public readonly reloadTime: number;
  public readonly spread: number;
  public readonly projectileSpeed: number;

  public currentAmmo: number;
  private lastShotTime: number = 0;
  private isReloading: boolean = false;
  private reloadStartTime: number = 0;

  constructor(config: WeaponConfig) {
    this.id = config.id;
    this.name = config.name;
    this.damage = config.damage;
    this.fireRate = config.fireRate;
    this.magazineSize = config.magazineSize;
    this.reloadTime = config.reloadTime;
    this.spread = config.spread;
    this.projectileSpeed = config.projectileSpeed;
    this.currentAmmo = this.magazineSize;
  }

  canShoot(): boolean {
    return !this.isReloading && this.currentAmmo > 0;
  }

  shoot(now: number = performance.now()): boolean {
    if (!this.canShoot()) return false;

    const timeSinceLastShot = (now - this.lastShotTime) / 1000;
    if (timeSinceLastShot < 1 / this.fireRate) return false;

    this.currentAmmo--;
    this.lastShotTime = now;
    return true;
  }

  startReload(now: number = performance.now()): void {
    if (this.isReloading || this.currentAmmo === this.magazineSize) return;
    this.isReloading = true;
    this.reloadStartTime = now;
  }

  update(now: number = performance.now()): void {
    if (this.isReloading) {
      const reloadProgress = (now - this.reloadStartTime) / 1000;
      if (reloadProgress >= this.reloadTime) {
        this.currentAmmo = this.magazineSize;
        this.isReloading = false;
      }
    }
  }

  getReloadProgress(): number {
    if (!this.isReloading) return 1;
    const now = performance.now();
    return Math.min((now - this.reloadStartTime) / 1000 / this.reloadTime, 1);
  }

  getSpreadMultiplier(): number {
    // Slightly increase spread after rapid fire
    return 1 + (this.magazineSize - this.currentAmmo) * 0.05;
  }

  clone(): Weapon {
    return new Weapon({
      id: this.id,
      name: this.name,
      damage: this.damage,
      fireRate: this.fireRate,
      magazineSize: this.magazineSize,
      reloadTime: this.reloadTime,
      spread: this.spread,
      projectileSpeed: this.projectileSpeed
    });
  }
}
```

- [ ] **Step 4: Create Weapon definitions**

```typescript
// client/src/game/Weapons.ts
import { Weapon } from './Weapon.js';

export const WEAPON_DEFINITIONS: Record<string, Weapon> = {
  pistol: new Weapon({
    id: 'pistol',
    name: 'Pistol',
    damage: 20,
    fireRate: 2,
    magazineSize: 12,
    reloadTime: 1.5,
    spread: 0.05,
    projectileSpeed: 50
  }),
  rifle: new Weapon({
    id: 'rifle',
    name: 'Assault Rifle',
    damage: 15,
    fireRate: 8,
    magazineSize: 30,
    reloadTime: 2,
    spread: 0.08,
    projectileSpeed: 80
  }),
  shotgun: new Weapon({
    id: 'shotgun',
    name: 'Shotgun',
    damage: 10,
    fireRate: 1,
    magazineSize: 8,
    reloadTime: 3,
    spread: 0.3,
    projectileSpeed: 40
  })
};
```

- [ ] **Step 5: Create WeaponManager**

```typescript
// client/src/game/WeaponManager.ts
import { Weapon } from './Weapon.js';
import { WEAPON_DEFINITIONS } from './Weapons.js';
import * as THREE from 'three';

export interface ShootResult {
  origin: THREE.Vector3;
  direction: THREE.Vector3;
  damage: number;
  hitMarker?: boolean;
}

export class WeaponManager {
  private weapons: Map<string, Weapon>;
  private currentWeaponId: string;
  private weaponModels: Map<string, THREE.Object3D> = new Map();

  constructor() {
    this.weapons = new Map();
    Object.entries(WEAPON_DEFINITIONS).forEach(([id, weapon]) => {
      this.weapons.set(id, weapon.clone());
    });
    this.currentWeaponId = 'pistol';
  }

  getCurrentWeapon(): Weapon {
    return this.weapons.get(this.currentWeaponId)!;
  }

  switchWeapon(weaponId: string): boolean {
    if (!this.weapons.has(weaponId)) return false;
    this.currentWeaponId = weaponId;
    return true;
  }

  shoot(camera: THREE.Camera, now: number = performance.now()): ShootResult | null {
    const weapon = this.getCurrentWeapon();

    if (!weapon.shoot(now)) {
      if (weapon.currentAmmo === 0 && !weapon.isReloading) {
        this.startReload(now);
      }
      return null;
    }

    // Calculate direction with spread
    const direction = new THREE.Vector3(0, 0, -1);
    direction.applyQuaternion(camera.quaternion);

    const spread = weapon.spread * weapon.getSpreadMultiplier();
    direction.x += (Math.random() - 0.5) * spread;
    direction.y += (Math.random() - 0.5) * spread;
    direction.z += (Math.random() - 0.5) * spread;
    direction.normalize();

    return {
      origin: camera.position.clone(),
      direction,
      damage: weapon.damage
    };
  }

  startReload(now: number = performance.now()): void {
    this.getCurrentWeapon().startReload(now);
  }

  update(now: number = performance.now()): void {
    this.weapons.forEach(weapon => weapon.update(now));
  }

  addWeaponModel(weaponId: string, model: THREE.Object3D): void {
    this.weaponModels.set(weaponId, model);
  }

  getWeaponModel(weaponId: string): THREE.Object3D | undefined {
    return this.weaponModels.get(weaponId);
  }
}
```

- [ ] **Step 6: Update main.ts with weapon system**

```typescript
import { Scene } from './game/Scene.js';
import { Physics } from './game/Physics.js';
import { InputManager } from './game/InputManager.js';
import { PlayerController } from './game/PlayerController.js';
import { WeaponManager } from './game/WeaponManager.js';

const scene = new Scene();
const physics = new Physics();
const input = new InputManager();
const weaponManager = new WeaponManager();

const player = new PlayerController(scene, physics, input);
document.getElementById('app')?.appendChild(scene.getCanvas());

// Weapon switching
document.addEventListener('keydown', (e) => {
  if (e.key === '1') weaponManager.switchWeapon('pistol');
  if (e.key === '2') weaponManager.switchWeapon('rifle');
  if (e.key === '3') weaponManager.switchWeapon('shotgun');
  if (e.key === 'r' || e.key === 'R') weaponManager.startReload();
});

// Pointer lock
document.addEventListener('click', () => {
  input.requestPointerLock();
});

// Game loop
function gameLoop(now: number) {
  player.update(0.016);
  physics.step(0.016);
  weaponManager.update(now);

  // Handle shooting
  if (input.isKeyPressed('MouseLeft')) {
    const result = weaponManager.shoot(scene.getCamera(), now);
    if (result) {
      console.log('Shot!', result);
    }
  }

  scene.render();
  requestAnimationFrame(gameLoop);
}

gameLoop(performance.now());

export { scene, physics, input, player, weaponManager };
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
npx vitest run client/src/game/test/Weapon.test.ts
```

Expected: PASS

- [ ] **Step 8: Commit weapon system**

```bash
git add client/src/game/Weapon.ts client/src/game/Weapons.ts client/src/game/WeaponManager.ts client/src/main.ts
git commit -m "feat: add weapon system with pistol, rifle, and shotgun"
```

---

## Task 7: Projectile System & Raycasting

**Files:**
- Create: `client/src/game/ProjectileSystem.ts`

- [ ] **Step 1: Write failing test for projectile system**

```typescript
// client/src/game/test/ProjectileSystem.test.ts
import { describe, it, expect } from 'vitest';
import { ProjectileSystem } from '../ProjectileSystem.js';
import * as THREE from 'three';

describe('ProjectileSystem', () => {
  it('should fire a raycast from origin', () => {
    const system = new ProjectileSystem();
    const result = system.fireRaycast(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(0, 0, -1),
      100
    );
    expect(result.hit).toBe(false); // No objects yet
    system.dispose();
  });

  it('should track active projectiles', () => {
    const system = new ProjectileSystem();
    system.addProjectile({
      position: new THREE.Vector3(0, 1, 0),
      velocity: new THREE.Vector3(0, 0, -10),
      damage: 20,
      lifetime: 2000
    });
    expect(system.getActiveCount()).toBe(1);
    system.dispose();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run client/src/game/test/ProjectileSystem.test.ts
```

Expected: FAIL - ProjectileSystem does not exist

- [ ] **Step 3: Create ProjectileSystem**

```typescript
// client/src/game/ProjectileSystem.ts
import * as THREE from 'three';
import { Physics } from './Physics.js';

export interface Projectile {
  id: string;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  damage: number;
  lifetime: number;
  createdAt: number;
  isPlayerShot: boolean;
}

export interface RaycastResult {
  hit: boolean;
  point?: THREE.Vector3;
  normal?: THREE.Vector3;
  distance?: number;
}

export class ProjectileSystem {
  private projectiles = new Map<string, Projectile>();
  private nextId = 0;
  private scene: THREE.Scene;
  private physics: Physics;

  constructor(scene: THREE.Scene, physics: Physics) {
    this.scene = scene;
    this.physics = physics;
  }

  fireRaycast(origin: THREE.Vector3, direction: THREE.Vector3, maxDistance: number): RaycastResult {
    const raycaster = new THREE.Raycaster(origin, direction, 0, maxDistance);
    const intersects = raycaster.intersectObjects(this.scene.children, true);

    if (intersects.length > 0) {
      return {
        hit: true,
        point: intersects[0].point.clone(),
        normal: intersects[0].face?.normal.clone(),
        distance: intersects[0].distance
      };
    }

    return { hit: false };
  }

  fireHitscan(origin: THREE.Vector3, direction: THREE.Vector3, damage: number): RaycastResult & { damage: number } {
    const result = this.fireRaycast(origin, direction, 1000);
    return {
      ...result,
      damage: result.hit ? damage : 0
    };
  }

  addProjectile(config: Omit<Projectile, 'id' | 'createdAt'>): string {
    const id = `proj_${this.nextId++}`;
    const projectile: Projectile = {
      ...config,
      id,
      createdAt: performance.now()
    };
    this.projectiles.set(id, projectile);
    return id;
  }

  update(dt: number, now: number): { hits: Array<{ id: string; result: RaycastResult }> } {
    const hits: Array<{ id: string; result: RaycastResult }> = [];
    const toRemove: string[] = [];

    this.projectiles.forEach((proj, id) => {
      // Update position
      proj.position.add(proj.velocity.clone().multiplyScalar(dt));

      // Check lifetime
      if (now - proj.createdAt > proj.lifetime) {
        toRemove.push(id);
        return;
      }

      // Raycast for collision
      const rayDir = proj.velocity.clone().normalize();
      const result = this.fireRaycast(proj.position, rayDir, proj.velocity.length() * dt);

      if (result.hit) {
        hits.push({ id, result });
        toRemove.push(id);
      }
    });

    // Remove dead projectiles
    toRemove.forEach(id => this.projectiles.delete(id));

    return { hits };
  }

  getActiveCount(): number {
    return this.projectiles.size;
  }

  getProjectile(id: string): Projectile | undefined {
    return this.projectiles.get(id);
  }

  dispose(): void {
    this.projectiles.clear();
  }
}
```

- [ ] **Step 4: Update Scene to include a simple wall for testing**

```typescript
// Update Scene.ts - add to constructor after ground
// Add a simple wall for testing
const wallGeometry = new THREE.BoxGeometry(4, 3, 0.5);
const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x8b7355 });
const wall = new THREE.Mesh(wallGeometry, wallMaterial);
wall.position.set(0, 1.5, -10);
wall.castShadow = true;
wall.receiveShadow = true;
wall.name = 'wall';
this.scene.add(wall);
```

- [ ] **Step 5: Update main.ts with projectile system**

```typescript
import { Scene } from './game/Scene.js';
import { Physics } from './game/Physics.js';
import { InputManager } from './game/InputManager.js';
import { PlayerController } from './game/PlayerController.js';
import { WeaponManager } from './game/WeaponManager.js';
import { ProjectileSystem } from './game/ProjectileSystem.js';

const scene = new Scene();
const physics = new Physics();
const input = new InputManager();
const weaponManager = new WeaponManager();
const projectileSystem = new ProjectileSystem(scene.getScene(), physics);

const player = new PlayerController(scene, physics, input);
document.getElementById('app')?.appendChild(scene.getCanvas());

// Weapon switching
document.addEventListener('keydown', (e) => {
  if (e.key === '1') weaponManager.switchWeapon('pistol');
  if (e.key === '2') weaponManager.switchWeapon('rifle');
  if (e.key === '3') weaponManager.switchWeapon('shotgun');
  if (e.key === 'r' || e.key === 'R') weaponManager.startReload();
});

// Pointer lock
document.addEventListener('click', () => {
  input.requestPointerLock();
});

// Game loop
function gameLoop(now: number) {
  player.update(0.016);
  physics.step(0.016);
  weaponManager.update(now);

  // Handle shooting
  if (input.isKeyPressed('MouseLeft')) {
    const result = weaponManager.shoot(scene.getCamera(), now);
    if (result) {
      const hitscanResult = projectileSystem.fireHitscan(
        result.origin,
        result.direction,
        result.damage
      );
      console.log('Hitscan result:', hitscanResult);
    }
  }

  scene.render();
  requestAnimationFrame(gameLoop);
}

gameLoop(performance.now());

export { scene, physics, input, player, weaponManager, projectileSystem };
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npx vitest run client/src/game/test/ProjectileSystem.test.ts
```

Expected: PASS

- [ ] **Step 7: Commit projectile system**

```bash
git add client/src/game/ProjectileSystem.ts client/src/game/Scene.ts client/src/main.ts
git commit -m "feat: add projectile system with hitscan raycasting"
```

---

## Task 8: Network Manager (Client)

**Files:**
- Create: `client/src/network/NetworkManager.ts`

- [ ] **Step 1: Write failing test for network manager**

```typescript
// client/src/network/test/NetworkManager.test.ts
import { describe, it, expect, vi } from 'vitest';
import { NetworkManager } from '../NetworkManager.js';

describe('NetworkManager', () => {
  it('should connect to server', () => {
    const manager = new NetworkManager();
    expect(manager.isConnected()).toBe(false);
    // Connection would need running server
    manager.disconnect();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run client/src/network/test/NetworkManager.test.ts
```

Expected: FAIL - NetworkManager does not exist

- [ ] **Step 3: Create NetworkManager**

```typescript
// client/src/network/NetworkManager.ts
import { io, Socket } from 'socket.io-client';
import { PlayerState, Vector3, GameMode } from '../game/types.js';

export type ServerEvent =
  | { type: 'connected' }
  | { type: 'roomCreated'; roomId: string }
  | { type: 'roomJoined'; roomId: string; playerId: string }
  | { type: 'playerJoined'; player: PlayerState }
  | { type: 'playerMoved'; playerId: string; position: Vector3; rotation: Vector3 }
  | { type: 'playerShot'; playerId: string; origin: Vector3; direction: Vector3 }
  | { type: 'playerHit'; targetId: string; damage: number }
  | { type: 'roomError'; message: string }
  | { type: 'roomList'; rooms: Array<{ id: string; mode: GameMode; playerCount: number }> };

export type ClientEvent =
  | { type: 'joinLobby' }
  | { type: 'createRoom'; mode: GameMode; maxPlayers?: number }
  | { type: 'joinRoom'; roomId: string; playerName: string }
  | { type: 'playerMove'; position: Vector3; rotation: Vector3 }
  | { type: 'playerShoot'; origin: Vector3; direction: Vector3 }
  | { type: 'leaveRoom' };

export class NetworkManager {
  private socket: Socket | null = null;
  private eventHandlers: Map<string, (data: any) => void> = new Map();
  private serverUrl = 'http://localhost:3000';

  constructor(serverUrl?: string) {
    if (serverUrl) this.serverUrl = serverUrl;
  }

  connect(): void {
    if (this.socket?.connected) return;

    this.socket = io(this.serverUrl, {
      autoConnect: true,
      reconnection: true
    });

    this.socket.on('connect', () => {
      this.emitEvent({ type: 'connected' });
      console.log('Connected to server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    this.socket.on('roomCreated', (data) => {
      this.emitEvent({ type: 'roomCreated', roomId: data.roomId });
    });

    this.socket.on('roomJoined', (data) => {
      this.emitEvent({ type: 'roomJoined', roomId: data.roomId, playerId: data.playerId });
    });

    this.socket.on('playerJoined', (data) => {
      this.emitEvent({ type: 'playerJoined', player: data });
    });

    this.socket.on('playerMoved', (data) => {
      this.emitEvent({ type: 'playerMoved', playerId: data.playerId, position: data.position, rotation: data.rotation });
    });

    this.socket.on('playerShot', (data) => {
      this.emitEvent({ type: 'playerShot', playerId: data.playerId, origin: data.origin, direction: data.direction });
    });

    this.socket.on('playerHit', (data) => {
      this.emitEvent({ type: 'playerHit', targetId: data.targetId, damage: data.damage });
    });

    this.socket.on('roomError', (data) => {
      this.emitEvent({ type: 'roomError', message: data.message });
    });

    this.socket.on('roomList', (data) => {
      this.emitEvent({ type: 'roomList', rooms: data });
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  send(event: ClientEvent): void {
    if (!this.socket?.connected) {
      console.warn('Not connected to server');
      return;
    }

    switch (event.type) {
      case 'joinLobby':
        this.socket.emit('joinLobby');
        break;
      case 'createRoom':
        this.socket.emit('createRoom', { mode: event.mode, maxPlayers: event.maxPlayers });
        break;
      case 'joinRoom':
        this.socket.emit('joinRoom', { roomId: event.roomId, playerName: event.playerName });
        break;
      case 'playerMove':
        this.socket.emit('playerMove', { position: event.position, rotation: event.rotation });
        break;
      case 'playerShoot':
        this.socket.emit('playerShoot', { origin: event.origin, direction: event.direction });
        break;
      case 'leaveRoom':
        this.socket.emit('leaveRoom');
        break;
    }
  }

  on(eventType: ServerEvent['type'], handler: (data: any) => void): void {
    this.eventHandlers.set(eventType, handler);
  }

  private emitEvent(event: ServerEvent): void {
    const handler = this.eventHandlers.get(event.type);
    if (handler) {
      handler(event);
    }
  }

  getSocketId(): string | undefined {
    return this.socket?.id;
  }
}
```

- [ ] **Step 4: Update main.ts to include network manager**

```typescript
import { Scene } from './game/Scene.js';
import { Physics } from './game/Physics.js';
import { InputManager } from './game/InputManager.js';
import { PlayerController } from './game/PlayerController.js';
import { WeaponManager } from './game/WeaponManager.js';
import { ProjectileSystem } from './game/ProjectileSystem.js';
import { NetworkManager } from './network/NetworkManager.js';

const scene = new Scene();
const physics = new Physics();
const input = new InputManager();
const weaponManager = new WeaponManager();
const projectileSystem = new ProjectileSystem(scene.getScene(), physics);
const network = new NetworkManager();

const player = new PlayerController(scene, physics, input);
document.getElementById('app')?.appendChild(scene.getCanvas());

// Network event handlers
network.on('connected', () => {
  console.log('Connected to game server!');
  network.send({ type: 'joinLobby' });
});

network.on('roomList', (data) => {
  console.log('Available rooms:', data.rooms);
});

// Connect to server
network.connect();

// Weapon switching
document.addEventListener('keydown', (e) => {
  if (e.key === '1') weaponManager.switchWeapon('pistol');
  if (e.key === '2') weaponManager.switchWeapon('rifle');
  if (e.key === '3') weaponManager.switchWeapon('shotgun');
  if (e.key === 'r' || e.key === 'R') weaponManager.startReload();
});

// Pointer lock
document.addEventListener('click', () => {
  input.requestPointerLock();
});

// Game loop
function gameLoop(now: number) {
  player.update(0.016);
  physics.step(0.016);
  weaponManager.update(now);

  // Send position to server if connected
  if (network.isConnected()) {
    const pos = player.getPosition();
    const rot = player.getRotation();
    network.send({
      type: 'playerMove',
      position: { x: pos.x, y: pos.y, z: pos.z },
      rotation: { x: rot.pitch, y: rot.yaw, z: 0 }
    });
  }

  // Handle shooting
  if (input.isKeyPressed('MouseLeft')) {
    const result = weaponManager.shoot(scene.getCamera(), now);
    if (result) {
      const hitscanResult = projectileSystem.fireHitscan(
        result.origin,
        result.direction,
        result.damage
      );
      console.log('Hitscan result:', hitscanResult);

      // Send shoot event to server
      if (network.isConnected()) {
        network.send({
          type: 'playerShoot',
          origin: { x: result.origin.x, y: result.origin.y, z: result.origin.z },
          direction: { x: result.direction.x, y: result.direction.y, z: result.direction.z }
        });
      }
    }
  }

  scene.render();
  requestAnimationFrame(gameLoop);
}

gameLoop(performance.now());

export { scene, physics, input, player, weaponManager, projectileSystem, network };
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run client/src/network/test/NetworkManager.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit network manager**

```bash
git add client/src/network/NetworkManager.ts client/src/main.ts
git commit -m "feat: add client network manager with Socket.io"
```

---

## Task 9: Server Game Logic & Player Sync

**Files:**
- Modify: `server/index.ts`
- Create: `server/gameLogic.ts`
- Create: `server/sync.ts`

- [ ] **Step 1: Create sync module**

```typescript
// server/sync.ts
import { Server } from 'socket.io';
import { RoomManager } from './rooms.js';
import { Vector3, PlayerState } from './types.js';

export interface PlayerMoveEvent {
  playerId: string;
  position: Vector3;
  rotation: Vector3;
}

export interface PlayerShootEvent {
  playerId: string;
  origin: Vector3;
  direction: Vector3;
}

export class SyncManager {
  private io: Server;
  private roomManager: RoomManager;
  private playerStates = new Map<string, { roomId: string; state: PlayerState }>();

  constructor(io: Server, roomManager: RoomManager) {
    this.io = io;
    this.roomManager = roomManager;
  }

  handlePlayerMove(socketId: string, data: PlayerMoveEvent): void {
    const playerData = this.playerStates.get(socketId);
    if (!playerData) return;

    playerData.state.position = data.position;
    playerData.state.rotation = data.rotation;

    // Broadcast to other players in room
    this.io.to(playerData.roomId).except(socketId).emit('playerMoved', {
      playerId: socketId,
      position: data.position,
      rotation: data.rotation
    });
  }

  handlePlayerShoot(socketId: string, data: PlayerShootEvent): void {
    const playerData = this.playerStates.get(socketId);
    if (!playerData) return;

    // Broadcast to other players
    this.io.to(playerData.roomId).except(socketId).emit('playerShot', {
      playerId: socketId,
      origin: data.origin,
      direction: data.direction
    });
  }

  registerPlayer(socketId: string, roomId: string, state: PlayerState): void {
    this.playerStates.set(socketId, { roomId, state });
  }

  unregisterPlayer(socketId: string): void {
    const playerData = this.playerStates.get(socketId);
    if (playerData) {
      this.io.to(playerData.roomId).emit('playerLeft', { playerId: socketId });
    }
    this.playerStates.delete(socketId);
  }

  getPlayerState(socketId: string): PlayerState | undefined {
    return this.playerStates.get(socketId)?.state;
  }
}
```

- [ ] **Step 2: Create game logic module**

```typescript
// server/gameLogic.ts
import { Vector3 } from './types.js';

export interface HitTestResult {
  hit: boolean;
  targetId?: string;
  point?: Vector3;
}

export class GameLogic {
  private playerPositions = new Map<string, Vector3>();

  updatePlayerPosition(playerId: string, position: Vector3): void {
    this.playerPositions.set(playerId, position);
  }

  removePlayer(playerId: string): void {
    this.playerPositions.delete(playerId);
  }

  performHitTest(origin: Vector3, direction: Vector3, shooterId: string, range: number = 1000): HitTestResult {
    const directionVec = new Vector3(direction.x, direction.y, direction.z);

    // Simple distance-based hit test (replace with raycasting for production)
    for (const [playerId, pos] of this.playerPositions.entries()) {
      if (playerId === shooterId) continue;

      const toTarget = {
        x: pos.x - origin.x,
        y: pos.y - origin.y,
        z: pos.z - origin.z
      };

      const distance = Math.sqrt(
        toTarget.x * toTarget.x + toTarget.y * toTarget.y + toTarget.z * toTarget.z
      );

      if (distance > range) continue;

      // Normalize direction vectors
      const dirLength = Math.sqrt(directionVec.x ** 2 + directionVec.y ** 2 + directionVec.z ** 2);
      const toTargetLength = distance;

      const dotProduct =
        (directionVec.x * toTarget.x + directionVec.y * toTarget.y + directionVec.z * toTarget.z) /
        (dirLength * toTargetLength);

      // If dot product > 0.95, we're aiming roughly at the player (~18 degree cone)
      if (dotProduct > 0.95) {
        return { hit: true, targetId: playerId, point: pos };
      }
    }

    return { hit: false };
  }

  applyDamage(targetId: string, damage: number): number {
    // In a full implementation, this would track player health
    console.log(`Player ${targetId} took ${damage} damage`);
    return damage;
  }
}
```

- [ ] **Step 3: Update server index.ts with sync and game logic**

```typescript
// server/index.ts
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { RoomManager } from './rooms.js';
import { SyncManager } from './sync.js';
import { GameLogic } from './gameLogic.js';
import { GameMode } from './types.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' }
});

const roomManager = new RoomManager();
const syncManager = new SyncManager(io, roomManager);
const gameLogic = new GameLogic();

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', rooms: roomManager.getRoomList().length });
});

io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.on('joinLobby', () => {
    socket.emit('roomList', roomManager.getRoomList());
  });

  socket.on('createRoom', (data: { mode: GameMode; maxPlayers?: number }) => {
    const room = roomManager.createRoom(data.mode, data.maxPlayers);
    socket.emit('roomCreated', { roomId: room.id });
  });

  socket.on('joinRoom', (data: { roomId: string; playerName: string }) => {
    const room = roomManager.getRoom(data.roomId);
    if (!room) {
      socket.emit('roomError', { message: 'Room not found' });
      return;
    }

    const playerState = {
      id: socket.id,
      position: { x: 0, y: 1.7, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      health: 100,
      isDead: false
    };

    if (roomManager.addPlayerToRoom(data.roomId, socket.id, playerState)) {
      socket.join(data.roomId);
      syncManager.registerPlayer(socket.id, data.roomId, playerState);
      socket.emit('roomJoined', { roomId: data.roomId, playerId: socket.id });
      socket.to(data.roomId).emit('playerJoined', playerState);

      // Send existing players to new player
      room.players.forEach((state, playerId) => {
        if (playerId !== socket.id) {
          socket.emit('playerJoined', state);
        }
      });
    } else {
      socket.emit('roomError', { message: 'Room is full' });
    }
  });

  socket.on('playerMove', (data: { position: any; rotation: any }) => {
    syncManager.handlePlayerMove(socket.id, {
      playerId: socket.id,
      position: data.position,
      rotation: data.rotation
    });
    gameLogic.updatePlayerPosition(socket.id, data.position);
  });

  socket.on('playerShoot', (data: { origin: any; direction: any }) => {
    syncManager.handlePlayerShoot(socket.id, {
      playerId: socket.id,
      origin: data.origin,
      direction: data.direction
    });

    const hitResult = gameLogic.performHitTest(data.origin, data.direction, socket.id);
    if (hitResult.hit && hitResult.targetId) {
      const damage = 15; // Default damage
      gameLogic.applyDamage(hitResult.targetId!, damage);
      io.to(data.roomId || socket.id).emit('playerHit', {
        targetId: hitResult.targetId,
        damage,
        shooterId: socket.id
      });
    }
  });

  socket.on('leaveRoom', () => {
    syncManager.unregisterPlayer(socket.id);
    gameLogic.removePlayer(socket.id);
    roomManager.removePlayerFromRoom(socket.id, socket.id);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    syncManager.unregisterPlayer(socket.id);
    gameLogic.removePlayer(socket.id);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

- [ ] **Step 4: Commit server game logic**

```bash
git add server/
git commit -m "feat: add server game logic, hit detection, and player sync"
```

---

## Task 10: AI Enemy System (Single Player)

**Files:**
- Create: `client/src/game/Enemy.ts`
- Create: `client/src/game/EnemyManager.ts`

- [ ] **Step 1: Write failing test for enemy**

```typescript
// client/src/game/test/Enemy.test.ts
import { describe, it, expect } from 'vitest';
import { Enemy } from '../Enemy.js';
import * as THREE from 'three';

describe('Enemy', () => {
  it('should create enemy with patrol behavior', () => {
    const enemy = new Enemy(
      new THREE.Vector3(0, 1, 0),
      'patrol'
    );
    expect(enemy.health).toBe(100);
    expect(enemy.state).toBe('idle');
    enemy.dispose();
  });

  it('should take damage', () => {
    const enemy = new Enemy(
      new THREE.Vector3(0, 1, 0),
      'patrol'
    );
    enemy.takeDamage(20);
    expect(enemy.health).toBe(80);
    enemy.dispose();
  });

  it('should die when health reaches 0', () => {
    const enemy = new Enemy(
      new THREE.Vector3(0, 1, 0),
      'patrol'
    );
    enemy.takeDamage(100);
    expect(enemy.isDead()).toBe(true);
    expect(enemy.state).toBe('dead');
    enemy.dispose();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run client/src/game/test/Enemy.test.ts
```

Expected: FAIL - Enemy class does not exist

- [ ] **Step 3: Create Enemy class**

```typescript
// client/src/game/Enemy.ts
import * as THREE from 'three';
import { Physics } from './Physics.js';
import * as CANNON from 'cannon-es';

export type EnemyType = 'patrol' | 'shooter' | 'assault';
export type EnemyState = 'idle' | 'patrol' | 'chase' | 'attack' | 'dead';

export interface EnemyConfig {
  position: THREE.Vector3;
  type: EnemyType;
  patrolPath?: THREE.Vector3[];
  health?: number;
  speed?: number;
}

export class Enemy {
  public readonly id: string;
  public type: EnemyType;
  public state: EnemyState = 'idle';
  public health: number;
  public readonly speed: number;
  public readonly detectionRange: number;
  public readonly attackRange: number;

  private mesh: THREE.Group;
  private body: CANNON.Body;
  private patrolPath: THREE.Vector3[];
  private currentPatrolIndex = 0;
  private targetPlayerPosition: THREE.Vector3 | null = null;
  private lastAttackTime = 0;
  private attackCooldown = 1000; // ms
  private damage = 10;

  constructor(config: EnemyConfig, scene: THREE.Scene, physics: Physics) {
    this.id = `enemy_${Math.random().toString(36).substr(2, 9)}`;
    this.type = config.type;
    this.health = config.health ?? 100;
    this.speed = config.speed ?? 2;
    this.patrolPath = config.patrolPath ?? [];

    // Set ranges based on type
    switch (this.type) {
      case 'patrol':
        this.detectionRange = 15;
        this.attackRange = 5;
        break;
      case 'shooter':
        this.detectionRange = 30;
        this.attackRange = 25;
        break;
      case 'assault':
        this.detectionRange = 20;
        this.attackRange = 2;
        break;
    }

    // Create mesh
    this.mesh = this.createEnemyMesh();
    this.mesh.position.copy(config.position);
    scene.add(this.mesh);

    // Create physics body
    const shape = new CANNON.Box(new CANNON.Vec3(0.5, 1, 0.5));
    this.body = new CANNON.Body({
      mass: 50,
      shape: shape,
      position: new CANNON.Vec3(config.position.x, config.position.y, config.position.z),
      fixedRotation: true
    });
    physics.addBody(this.body);

    // Start patrol
    if (this.patrolPath.length > 0) {
      this.state = 'patrol';
    }
  }

  private createEnemyMesh(): THREE.Group {
    const group = new THREE.Group();

    // Body
    const bodyGeometry = new THREE.BoxGeometry(1, 1.5, 0.5);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xcc0000 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.75;
    group.add(body);

    // Head
    const headGeometry = new THREE.SphereGeometry(0.3);
    const headMaterial = new THREE.MeshStandardMaterial({ color: 0xffcc99 });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.8;
    group.add(head);

    return group;
  }

  update(dt: number, playerPosition: THREE.Vector3, now: number): void {
    if (this.state === 'dead') return;

    // Sync mesh with physics
    this.mesh.position.set(this.body.position.x, this.body.position.y, this.mesh.position.y);

    const distanceToPlayer = this.mesh.position.distanceTo(playerPosition);

    switch (this.state) {
      case 'idle':
      case 'patrol':
        if (distanceToPlayer < this.detectionRange) {
          this.state = 'chase';
          this.targetPlayerPosition = playerPosition.clone();
        } else if (this.state === 'patrol') {
          this.patrol(dt);
        }
        break;

      case 'chase':
        if (distanceToPlayer > this.detectionRange * 1.5) {
          this.state = 'patrol';
          this.targetPlayerPosition = null;
        } else if (distanceToPlayer < this.attackRange) {
          this.state = 'attack';
        } else {
          this.moveTo(playerPosition, dt);
        }
        break;

      case 'attack':
        if (distanceToPlayer > this.attackRange * 1.2) {
          this.state = 'chase';
        } else {
          this.attack(now);
        }
        break;
    }
  }

  private patrol(dt: number): void {
    if (this.patrolPath.length === 0) return;

    const target = this.patrolPath[this.currentPatrolIndex];
    const direction = new THREE.Vector3().subVectors(target, this.mesh.position);
    direction.y = 0;
    const distance = direction.length();

    if (distance < 0.5) {
      this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPath.length;
    } else {
      direction.normalize();
      this.body.velocity.x = direction.x * this.speed;
      this.body.velocity.z = direction.z * this.speed;
    }
  }

  private moveTo(target: THREE.Vector3, dt: number): void {
    const direction = new THREE.Vector3().subVectors(target, this.mesh.position);
    direction.y = 0;
    direction.normalize();

    this.body.velocity.x = direction.x * this.speed;
    this.body.velocity.z = direction.z * this.speed;

    // Face the player
    const angle = Math.atan2(direction.x, direction.z);
    this.mesh.rotation.y = angle;
  }

  private attack(now: number): void {
    if (now - this.lastAttackTime < this.attackCooldown) return;

    this.lastAttackTime = now;

    // Face the player if in range
    if (this.targetPlayerPosition) {
      const direction = new THREE.Vector3().subVectors(this.targetPlayerPosition, this.mesh.position);
      direction.y = 0;
      const angle = Math.atan2(direction.x, direction.z);
      this.mesh.rotation.y = angle;
    }
  }

  takeDamage(amount: number): void {
    if (this.state === 'dead') return;

    this.health -= amount;
    if (this.health <= 0) {
      this.health = 0;
      this.die();
    }

    // Flash red
    this.mesh.children.forEach(child => {
      if (child instanceof THREE.Mesh) {
        const originalColor = (child.material as THREE.MeshStandardMaterial).color.getHex();
        (child.material as THREE.MeshStandardMaterial).color.setHex(0xffffff);
        setTimeout(() => {
          if (this.state !== 'dead') {
            (child.material as THREE.MeshStandardMaterial).color.setHex(originalColor);
          }
        }, 100);
      }
    });
  }

  private die(): void {
    this.state = 'dead';
    this.body.velocity.set(0, 0, 0);

    // Fall over
    this.mesh.rotation.x = Math.PI / 2;
    this.mesh.position.y = 0.5;
  }

  isDead(): boolean {
    return this.state === 'dead';
  }

  getPosition(): THREE.Vector3 {
    return this.mesh.position.clone();
  }

  dispose(scene: THREE.Scene, physics: Physics): void {
    scene.remove(this.mesh);
    physics.removeBody(this.body);
  }
}
```

- [ ] **Step 4: Create EnemyManager**

```typescript
// client/src/game/EnemyManager.ts
import { Enemy, EnemyConfig } from './Enemy.js';
import { Physics } from './Physics.js';
import * as THREE from 'three';

export class EnemyManager {
  private enemies = new Map<string, Enemy>();
  private scene: THREE.Scene;
  private physics: Physics;

  constructor(scene: THREE.Scene, physics: Physics) {
    this.scene = scene;
    this.physics = physics;
  }

  spawnEnemy(config: EnemyConfig): Enemy {
    const enemy = new Enemy(config, this.scene, this.physics);
    this.enemies.set(enemy.id, enemy);
    return enemy;
  }

  getEnemy(id: string): Enemy | undefined {
    return this.enemies.get(id);
  }

  getAllEnemies(): Enemy[] {
    return Array.from(this.enemies.values());
  }

  update(dt: number, playerPosition: THREE.Vector3, now: number): void {
    this.enemies.forEach((enemy, id) => {
      enemy.update(dt, playerPosition, now);

      // Remove dead enemies after delay
      if (enemy.isDead()) {
        setTimeout(() => {
          this.removeEnemy(id);
        }, 3000);
      }
    });
  }

  removeEnemy(id: string): void {
    const enemy = this.enemies.get(id);
    if (enemy) {
      enemy.dispose(this.scene, this.physics);
      this.enemies.delete(id);
    }
  }

  clear(): void {
    this.enemies.forEach((_, id) => this.removeEnemy(id));
  }

  getAliveCount(): number {
    return Array.from(this.enemies.values()).filter(e => !e.isDead()).length;
  }
}
```

- [ ] **Step 5: Update main.ts with enemy system**

```typescript
import { Scene } from './game/Scene.js';
import { Physics } from './game/Physics.js';
import { InputManager } from './game/InputManager.js';
import { PlayerController } from './game/PlayerController.js';
import { WeaponManager } from './game/WeaponManager.js';
import { ProjectileSystem } from './game/ProjectileSystem.js';
import { NetworkManager } from './network/NetworkManager.js';
import { EnemyManager } from './game/EnemyManager.js';

const scene = new Scene();
const physics = new Physics();
const input = new InputManager();
const weaponManager = new WeaponManager();
const projectileSystem = new ProjectileSystem(scene.getScene(), physics);
const network = new NetworkManager();
const enemyManager = new EnemyManager(scene.getScene(), physics);

const player = new PlayerController(scene, physics, input);
document.getElementById('app')?.appendChild(scene.getCanvas());

// Spawn some enemies for solo mode
enemyManager.spawnEnemy({
  position: new THREE.Vector3(5, 1.7, 0),
  type: 'patrol',
  patrolPath: [
    new THREE.Vector3(5, 1.7, 0),
    new THREE.Vector3(5, 1.7, 10),
    new THREE.Vector3(-5, 1.7, 10),
    new THREE.Vector3(-5, 1.7, 0)
  ]
});

enemyManager.spawnEnemy({
  position: new THREE.Vector3(-8, 1.7, 5),
  type: 'shooter'
});

// Network event handlers (only for multiplayer)
network.on('connected', () => {
  console.log('Connected to game server!');
  network.send({ type: 'joinLobby' });
});

network.on('roomList', (data) => {
  console.log('Available rooms:', data.rooms);
});

// Weapon switching
document.addEventListener('keydown', (e) => {
  if (e.key === '1') weaponManager.switchWeapon('pistol');
  if (e.key === '2') weaponManager.switchWeapon('rifle');
  if (e.key === '3') weaponManager.switchWeapon('shotgun');
  if (e.key === 'r' || e.key === 'R') weaponManager.startReload();
});

// Pointer lock
document.addEventListener('click', () => {
  input.requestPointerLock();
});

// Game loop
function gameLoop(now: number) {
  const dt = 0.016;
  player.update(dt);
  physics.step(dt);
  weaponManager.update(now);

  // Update enemies
  const playerPos = player.getPosition();
  enemyManager.update(dt, playerPos, now);

  // Handle shooting
  if (input.isKeyPressed('MouseLeft')) {
    const result = weaponManager.shoot(scene.getCamera(), now);
    if (result) {
      const hitscanResult = projectileSystem.fireHitscan(
        result.origin,
        result.direction,
        result.damage
      );

      // Check for enemy hits
      enemyManager.getAllEnemies().forEach(enemy => {
        if (enemy.isDead()) return;

        const enemyPos = enemy.getPosition();
        const toEnemy = new THREE.Vector3().subVectors(enemyPos, result.origin);
        const distance = toEnemy.length();
        const direction = toEnemy.normalize();

        // Simple hit detection
        const hitDirection = result.direction.clone().normalize();
        const dot = hitDirection.dot(direction);

        if (dot > 0.95 && distance < 50) {
          enemy.takeDamage(result.damage);
        }
      });
    }
  }

  scene.render();
  requestAnimationFrame(gameLoop);
}

gameLoop(performance.now());

export { scene, physics, input, player, weaponManager, projectileSystem, network, enemyManager };
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npx vitest run client/src/game/test/Enemy.test.ts
```

Expected: PASS

- [ ] **Step 7: Commit enemy system**

```bash
git add client/src/game/Enemy.ts client/src/game/EnemyManager.ts client/src/main.ts
git commit -m "feat: add AI enemy system with patrol, chase, and attack behaviors"
```

---

## Task 11: Map System

**Files:**
- Create: `client/src/game/MapLoader.ts`
- Create: `client/src/game/maps/TrainingGround.ts`

- [ ] **Step 1: Write failing test for map loader**

```typescript
// client/src/game/test/MapLoader.test.ts
import { describe, it, expect } from 'vitest';
import { MapLoader } from '../MapLoader.js';
import { Scene } from '../Scene.js';

describe('MapLoader', () => {
  it('should load training ground map', () => {
    const scene = new Scene();
    const loader = new MapLoader(scene.getScene());
    const map = loader.loadMap('trainingGround');
    expect(map).toBeDefined();
    expect(map.name).toBe('Training Ground');
    scene.dispose();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run client/src/game/test/MapLoader.test.ts
```

Expected: FAIL - MapLoader does not exist

- [ ] **Step 3: Create map data structure**

```typescript
// client/src/game/types.ts
export interface BoundingBox {
  min: Vector3;
  max: Vector3;
}

export interface MapData {
  name: string;
  walls: BoundingBox[];
  spawnPoints: Vector3[];
  enemySpawns: Array<{
    type: 'patrol' | 'shooter' | 'assault';
    position: Vector3;
    count: number;
    patrolPath?: Vector3[];
  }>;
  objectives?: Array<{
    type: 'eliminate' | 'reach';
    target: Vector3;
    required: number;
  }>;
}
```

- [ ] **Step 4: Create map definitions**

```typescript
// client/src/game/maps/TrainingGround.ts
import { MapData } from '../types.js';

export const TRAINING_GROUND_MAP: MapData = {
  name: 'Training Ground',
  walls: [
    { min: { x: -20, y: 0, z: -20 }, max: { x: -18, y: 4, z: 20 } },
    { min: { x: 18, y: 0, z: -20 }, max: { x: 20, y: 4, z: 20 } },
    { min: { x: -20, y: 0, z: -20 }, max: { x: 20, y: 4, z: -18 } },
    { min: { x: -20, y: 0, z: 18 }, max: { x: 20, y: 4, z: 20 } },
    { min: { x: -5, y: 0, z: -5 }, max: { x: 5, y: 3, z: -3 } },
    { min: { x: -8, y: 0, z: 5 }, max: { x: -6, y: 3, z: 15 } },
  ],
  spawnPoints: [
    { x: 0, y: 1.7, z: 15 },
    { x: 0, y: 1.7, z: -15 }
  ],
  enemySpawns: [
    {
      type: 'patrol',
      position: { x: 10, y: 1.7, z: 0 },
      count: 2,
      patrolPath: [
        { x: 10, y: 1.7, z: 0 },
        { x: 10, y: 1.7, z: 10 },
        { x: -10, y: 1.7, z: 10 },
        { x: -10, y: 1.7, z: 0 }
      ]
    }
  ],
  objectives: [
    {
      type: 'eliminate',
      target: { x: 0, y: 0, z: 0 },
      required: 2
    }
  ]
};
```

- [ ] **Step 5: Create warehouse map**

```typescript
// client/src/game/maps/Warehouse.ts
import { MapData } from '../types.js';

export const WAREHOUSE_MAP: MapData = {
  name: 'Warehouse',
  walls: [
    // Outer walls
    { min: { x: -25, y: 0, z: -25 }, max: { x: -23, y: 5, z: 25 } },
    { min: { x: 23, y: 0, z: -25 }, max: { x: 25, y: 5, z: 25 } },
    { min: { x: -25, y: 0, z: -25 }, max: { x: 25, y: 5, z: -23 } },
    { min: { x: -25, y: 0, z: 23 }, max: { x: 25, y: 5, z: 25 } },
    // Interior structures
    { min: { x: -15, y: 0, z: -10 }, max: { x: -10, y: 3, z: -5 } },
    { min: { x: 5, y: 0, z: -15 }, max: { x: 10, y: 3, z: -10 } },
    { min: { x: -10, y: 2.5, z: 5 }, max: { x: 10, y: 5, z: 15 } },
    { min: { x: -8, y: 0, z: 8 }, max: { x: -6, y: 5, z: 12 } },
  ],
  spawnPoints: [
    { x: -18, y: 1.7, z: 0 },
    { x: 18, y: 1.7, z: 0 },
    { x: 0, y: 1.7, z: 18 },
    { x: 0, y: 1.7, z: -18 }
  ],
  enemySpawns: [
    { type: 'patrol', position: { x: 0, y: 1.7, z: 5 }, count: 2 },
    { type: 'shooter', position: { x: -10, y: 1.7, z: -10 }, count: 2 }
  ]
};
```

- [ ] **Step 6: Create transport ship map**

```typescript
// client/src/game/maps/TransportShip.ts
import { MapData } from '../types.js';

export const TRANSPORT_SHIP_MAP: MapData = {
  name: 'Transport Ship',
  walls: [
    // Hull
    { min: { x: -6, y: 0, z: -40 }, max: { x: -4, y: 4, z: 40 } },
    { min: { x: 4, y: 0, z: -40 }, max: { x: 6, y: 4, z: 40 } },
    { min: { x: -6, y: 0, z: -40 }, max: { x: 6, y: 4, z: -38 } },
    { min: { x: -6, y: 0, z: 38 }, max: { x: 6, y: 4, z: 40 } },
    // Corridor obstacles
    { min: { x: -2, y: 0, z: -20 }, max: { x: 2, y: 3, z: -18 } },
    { min: { x: -2, y: 0, z: 0 }, max: { x: 2, y: 3, z: 2 } },
    { min: { x: -2, y: 0, z: 20 }, max: { x: 2, y: 3, z: 22 } },
    // Side rooms
    { min: { x: -8, y: 0, z: -30 }, max: { x: -6, y: 3, z: -20 } },
    { min: { x: 6, y: 0, z: 10 }, max: { x: 8, y: 3, z: 20 } },
  ],
  spawnPoints: [
    { x: 0, y: 1.7, z: 35 },
    { x: 0, y: 1.7, z: -35 },
    { x: -7, y: 1.7, z: -25 },
    { x: 7, y: 1.7, z: 15 }
  ],
  enemySpawns: [
    { type: 'shooter', position: { x: 0, y: 1.7, z: 0 }, count: 2 },
    { type: 'assault', position: { x: 0, y: 1.7, z: -30 }, count: 1 },
    { type: 'assault', position: { x: 0, y: 1.7, z: 30 }, count: 1 }
  ]
};
```

- [ ] **Step 7: Create MapLoader**

```typescript
// client/src/game/MapLoader.ts
import { MapData } from './types.js';
import { TRAINING_GROUND_MAP } from './maps/TrainingGround.js';
import { WAREHOUSE_MAP } from './maps/Warehouse.js';
import { TRANSPORT_SHIP_MAP } from './maps/TransportShip.js';
import * as THREE from 'three';
import { Physics } from './Physics.js';
import * as CANNON from 'cannon-es';

export class MapLoader {
  private maps: Record<string, MapData> = {
    trainingGround: TRAINING_GROUND_MAP,
    warehouse: WAREHOUSE_MAP,
    transportShip: TRANSPORT_SHIP_MAP
  };

  constructor(private scene: THREE.Scene) {}

  loadMap(mapId: string): MapData {
    const mapData = this.maps[mapId];
    if (!mapData) {
      throw new Error(`Map not found: ${mapId}`);
    }

    // Clear existing map objects
    this.clearMap();

    // Create walls
    mapData.walls.forEach(wall => {
      const size = new THREE.Vector3(
        wall.max.x - wall.min.x,
        wall.max.y - wall.min.y,
        wall.max.z - wall.min.z
      );
      const center = new THREE.Vector3(
        (wall.min.x + wall.max.x) / 2,
        (wall.min.y + wall.max.y) / 2,
        (wall.min.z + wall.max.z) / 2
      );

      // Visual mesh
      const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
      const material = new THREE.MeshStandardMaterial({ color: 0x8b7355 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(center);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData.isMapObject = true;
      this.scene.add(mesh);

      // Physics body
      const shape = new CANNON.Box(new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2));
      const body = new CANNON.Body({
        mass: 0,
        shape: shape,
        position: new CANNON.Vec3(center.x, center.y, center.z)
      });
      // Note: In a real implementation, you'd store this for cleanup
    });

    return mapData;
  }

  clearMap(): void {
    const toRemove: THREE.Object3D[] = [];
    this.scene.traverse(obj => {
      if (obj.userData.isMapObject) {
        toRemove.push(obj);
      }
    });
    toRemove.forEach(obj => {
      this.scene.remove(obj);
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach(m => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
  }

  getAvailableMaps(): string[] {
    return Object.keys(this.maps);
  }
}
```

- [ ] **Step 8: Update main.ts with map system**

```typescript
import { Scene } from './game/Scene.js';
import { Physics } from './game/Physics.js';
import { InputManager } from './game/InputManager.js';
import { PlayerController } from './game/PlayerController.js';
import { WeaponManager } from './game/WeaponManager.js';
import { ProjectileSystem } from './game/ProjectileSystem.js';
import { NetworkManager } from './network/NetworkManager.js';
import { EnemyManager } from './game/EnemyManager.js';
import { MapLoader } from './game/MapLoader.js';

const scene = new Scene();
const physics = new Physics();
const input = new InputManager();
const weaponManager = new WeaponManager();
const projectileSystem = new ProjectileSystem(scene.getScene(), physics);
const network = new NetworkManager();
const enemyManager = new EnemyManager(scene.getScene(), physics);
const mapLoader = new MapLoader(scene.getScene());

// Load default map
const currentMap = mapLoader.loadMap('trainingGround');
console.log(`Loaded map: ${currentMap.name}`);

// Spawn enemies from map data
currentMap.enemySpawns.forEach(spawn => {
  for (let i = 0; i < spawn.count; i++) {
    enemyManager.spawnEnemy({
      position: new THREE.Vector3(spawn.position.x, spawn.position.y, spawn.position.z + i * 2),
      type: spawn.type,
      patrolPath: spawn.patrolPath?.map(p => new THREE.Vector3(p.x, p.y, p.z))
    });
  }
});

const player = new PlayerController(scene, physics, input, new THREE.Vector3(
  currentMap.spawnPoints[0].x,
  currentMap.spawnPoints[0].y,
  currentMap.spawnPoints[0].z
));
document.getElementById('app')?.appendChild(scene.getCanvas());

// Network event handlers
network.on('connected', () => {
  console.log('Connected to game server!');
  network.send({ type: 'joinLobby' });
});

// Weapon switching
document.addEventListener('keydown', (e) => {
  if (e.key === '1') weaponManager.switchWeapon('pistol');
  if (e.key === '2') weaponManager.switchWeapon('rifle');
  if (e.key === '3') weaponManager.switchWeapon('shotgun');
  if (e.key === 'r' || e.key === 'R') weaponManager.startReload();
});

// Pointer lock
document.addEventListener('click', () => {
  input.requestPointerLock();
});

// Game loop
function gameLoop(now: number) {
  const dt = 0.016;
  player.update(dt);
  physics.step(dt);
  weaponManager.update(now);

  const playerPos = player.getPosition();
  enemyManager.update(dt, playerPos, now);

  // Handle shooting
  if (input.isKeyPressed('MouseLeft')) {
    const result = weaponManager.shoot(scene.getCamera(), now);
    if (result) {
      const hitscanResult = projectileSystem.fireHitscan(
        result.origin,
        result.direction,
        result.damage
      );

      enemyManager.getAllEnemies().forEach(enemy => {
        if (enemy.isDead()) return;

        const enemyPos = enemy.getPosition();
        const toEnemy = new THREE.Vector3().subVectors(enemyPos, result.origin);
        const distance = toEnemy.length();
        const direction = toEnemy.normalize();

        const hitDirection = result.direction.clone().normalize();
        const dot = hitDirection.dot(direction);

        if (dot > 0.95 && distance < 50) {
          enemy.takeDamage(result.damage);
        }
      });
    }
  }

  scene.render();
  requestAnimationFrame(gameLoop);
}

gameLoop(performance.now());

export { scene, physics, input, player, weaponManager, projectileSystem, network, enemyManager, mapLoader };
```

- [ ] **Step 9: Run tests to verify they pass**

```bash
npx vitest run client/src/game/test/MapLoader.test.ts
```

Expected: PASS

- [ ] **Step 10: Commit map system**

```bash
git add client/src/game/types.ts client/src/game/maps/ client/src/game/MapLoader.ts client/src/main.ts
git commit -m "feat: add map system with Training Ground, Warehouse, and Transport Ship"
```

---

## Task 12: HUD System

**Files:**
- Create: `client/src/ui/HUD.ts`
- Create: `client/src/ui/style.css`

- [ ] **Step 1: Write failing test for HUD**

```typescript
// client/src/ui/test/HUD.test.ts
import { describe, it, expect } from 'vitest';
import { HUD } from '../HUD.js';

describe('HUD', () => {
  it('should create HUD element', () => {
    const hud = new HUD();
    expect(hud.getElement()).toBeInstanceOf(HTMLElement);
    hud.dispose();
  });

  it('should update health display', () => {
    const hud = new HUD();
    hud.updateHealth(75);
    expect(hud.getHealth()).toBe(75);
    hud.dispose();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run client/src/ui/test/HUD.test.ts
```

Expected: FAIL - HUD does not exist

- [ ] **Step 3: Create HUD styles**

```css
/* client/src/ui/style.css */
.hud {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  font-family: 'Arial', sans-serif;
  color: white;
  text-shadow: 2px 2px 2px rgba(0, 0, 0, 0.8);
}

.hud-top-left {
  position: absolute;
  top: 20px;
  left: 20px;
}

.hud-top-right {
  position: absolute;
  top: 20px;
  right: 20px;
  text-align: right;
}

.hud-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.hud-bottom {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
}

.health-bar {
  width: 200px;
  height: 20px;
  background: rgba(0, 0, 0, 0.5);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 3px;
  overflow: hidden;
}

.health-fill {
  height: 100%;
  background: linear-gradient(to right, #ff4444, #ff6666);
  transition: width 0.2s;
}

.ammo-display {
  font-size: 24px;
  font-weight: bold;
}

.weapon-name {
  font-size: 16px;
  color: #aaa;
}

.crosshair {
  position: relative;
  width: 20px;
  height: 20px;
}

.crosshair::before,
.crosshair::after {
  content: '';
  position: absolute;
  background: rgba(255, 255, 255, 0.8);
}

.crosshair::before {
  top: 9px;
  left: 0;
  width: 20px;
  height: 2px;
}

.crosshair::after {
  top: 0;
  left: 9px;
  width: 2px;
  height: 20px;
}

.notification {
  background: rgba(0, 0, 0, 0.7);
  padding: 10px 20px;
  border-radius: 5px;
  font-size: 14px;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
```

- [ ] **Step 4: Create HUD class**

```typescript
// client/src/ui/HUD.ts
import { Weapon } from '../game/Weapon.js';

export class HUD {
  private element: HTMLElement;
  private healthFill: HTMLElement;
  private healthText: HTMLElement;
  private ammoText: HTMLElement;
  private weaponName: HTMLElement;
  private crosshair: HTMLElement;
  private notificationContainer: HTMLElement;
  private currentHealth = 100;
  private currentAmmo = 0;
  private maxAmmo = 0;
  private notificationTimeout: number | null = null;

  constructor() {
    this.element = this.createElement();
    this.healthFill = this.element.querySelector('.health-fill') as HTMLElement;
    this.healthText = this.element.querySelector('.health-text') as HTMLElement;
    this.ammoText = this.element.querySelector('.ammo-text') as HTMLElement;
    this.weaponName = this.element.querySelector('.weapon-name') as HTMLElement;
    this.crosshair = this.element.querySelector('.crosshair') as HTMLElement;
    this.notificationContainer = this.element.querySelector('.notifications') as HTMLElement;
  }

  private createElement(): HTMLElement {
    const hud = document.createElement('div');
    hud.className = 'hud';

    hud.innerHTML = `
      <div class="hud-top-left">
        <div class="health-bar">
          <div class="health-fill" style="width: 100%"></div>
        </div>
        <div class="health-text">100 HP</div>
      </div>
      <div class="hud-top-right">
        <div class="weapon-name">Pistol</div>
        <div class="ammo-display">
          <span class="ammo-text">12</span> / <span class="ammo-reserve">∞</span>
        </div>
      </div>
      <div class="hud-center">
        <div class="crosshair"></div>
      </div>
      <div class="hud-bottom">
        <div class="notifications"></div>
      </div>
    `;

    return hud;
  }

  getElement(): HTMLElement {
    return this.element;
  }

  updateHealth(health: number, maxHealth: number = 100): void {
    this.currentHealth = Math.max(0, Math.min(maxHealth, health));
    const percentage = (this.currentHealth / maxHealth) * 100;
    this.healthFill.style.width = `${percentage}%`;
    this.healthText.textContent = `${this.currentHealth} HP`;

    // Change color based on health
    if (this.currentHealth < 25) {
      this.healthFill.style.background = 'linear-gradient(to right, #ff0000, #ff3333)';
    } else if (this.currentHealth < 50) {
      this.healthFill.style.background = 'linear-gradient(to right, #ff8800, #ffaa33)';
    } else {
      this.healthFill.style.background = 'linear-gradient(to right, #ff4444, #ff6666)';
    }
  }

  getHealth(): number {
    return this.currentHealth;
  }

  updateAmmo(current: number, max: number, reserve?: number): void {
    this.currentAmmo = current;
    this.maxAmmo = max;
    this.ammoText.textContent = `${current} / ${reserve ?? '∞'}`;

    // Flash red when low ammo
    if (current <= max * 0.2) {
      this.ammoText.style.color = '#ff4444';
    } else {
      this.ammoText.style.color = 'white';
    }
  }

  getAmmo(): { current: number; max: number } {
    return { current: this.currentAmmo, max: this.maxAmmo };
  }

  updateWeapon(weapon: Weapon): void {
    this.weaponName.textContent = weapon.name;
    this.updateAmmo(weapon.currentAmmo, weapon.magazineSize);
  }

  updateReloadProgress(progress: number): void {
    if (progress < 1) {
      this.ammoText.textContent = `Reloading... ${Math.round(progress * 100)}%`;
    }
  }

  showNotification(message: string, duration: number = 3000): void {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    this.notificationContainer.appendChild(notification);

    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }

    this.notificationTimeout = window.setTimeout(() => {
      notification.remove();
    }, duration);
  }

  updateCrosshair(spread: number): void {
    const size = 20 + spread * 30;
    this.crosshair.style.width = `${size}px`;
    this.crosshair.style.height = `${size}px`;
  }

  showHitMarker(): void {
    this.crosshair.style.color = '#ff4444';
    setTimeout(() => {
      this.crosshair.style.color = 'white';
    }, 100);
  }

  showKillFeed(killer: string, victim: string): void {
    const killFeed = document.createElement('div');
    killFeed.className = 'notification';
    killFeed.textContent = `${killer} eliminated ${victim}`;
    this.notificationContainer.appendChild(killFeed);

    setTimeout(() => {
      killFeed.remove();
    }, 5000);
  }

  showDamageIndicator(direction: { x: number; y: number }): void {
    const indicator = document.createElement('div');
    indicator.className = 'damage-indicator';
    indicator.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      width: 300px;
      height: 300px;
      transform: translate(-50%, -50%) rotate(${Math.atan2(direction.y, direction.x)}rad);
      background: radial-gradient(circle at center, transparent 40%, rgba(255, 0, 0, 0.3) 100%);
      pointer-events: none;
      animation: damageFlash 0.3s ease forwards;
    `;
    this.element.appendChild(indicator);

    setTimeout(() => {
      indicator.remove();
    }, 300);
  }

  hide(): void {
    this.element.style.display = 'none';
  }

  show(): void {
    this.element.style.display = 'block';
  }

  dispose(): void {
    this.element.remove();
    if (this.notificationTimeout) {
      clearTimeout(this.notificationTimeout);
    }
  }
}
```

- [ ] **Step 5: Update main.ts with HUD**

```typescript
import { Scene } from './game/Scene.js';
import { Physics } from './game/Physics.js';
import { InputManager } from './game/InputManager.js';
import { PlayerController } from './game/PlayerController.js';
import { WeaponManager } from './game/WeaponManager.js';
import { ProjectileSystem } from './game/ProjectileSystem.js';
import { NetworkManager } from './network/NetworkManager.js';
import { EnemyManager } from './game/EnemyManager.js';
import { MapLoader } from './game/MapLoader.js';
import { HUD } from './ui/HUD.js';

// Load styles
import './ui/style.css';

const scene = new Scene();
const physics = new Physics();
const input = new InputManager();
const weaponManager = new WeaponManager();
const projectileSystem = new ProjectileSystem(scene.getScene(), physics);
const network = new NetworkManager();
const enemyManager = new EnemyManager(scene.getScene(), physics);
const mapLoader = new MapLoader(scene.getScene());
const hud = new HUD();

// Load default map
const currentMap = mapLoader.loadMap('trainingGround');
console.log(`Loaded map: ${currentMap.name}`);

// Spawn enemies from map data
currentMap.enemySpawns.forEach(spawn => {
  for (let i = 0; i < spawn.count; i++) {
    enemyManager.spawnEnemy({
      position: new THREE.Vector3(spawn.position.x, spawn.position.y, spawn.position.z + i * 2),
      type: spawn.type,
      patrolPath: spawn.patrolPath?.map(p => new THREE.Vector3(p.x, p.y, p.z))
    });
  }
});

const player = new PlayerController(scene, physics, input, new THREE.Vector3(
  currentMap.spawnPoints[0].x,
  currentMap.spawnPoints[0].y,
  currentMap.spawnPoints[0].z
));
document.getElementById('app')?.appendChild(scene.getCanvas());
document.getElementById('app')?.appendChild(hud.getElement());

// Initialize HUD
hud.updateWeapon(weaponManager.getCurrentWeapon());
hud.showNotification('Welcome to FPS Web Game!');

// Network event handlers
network.on('connected', () => {
  console.log('Connected to game server!');
  network.send({ type: 'joinLobby' });
});

// Weapon switching
document.addEventListener('keydown', (e) => {
  if (e.key === '1') weaponManager.switchWeapon('pistol');
  if (e.key === '2') weaponManager.switchWeapon('rifle');
  if (e.key === '3') weaponManager.switchWeapon('shotgun');
  if (e.key === 'r' || e.key === 'R') weaponManager.startReload();
});

// Pointer lock
document.addEventListener('click', () => {
  input.requestPointerLock();
});

// Game loop
function gameLoop(now: number) {
  const dt = 0.016;
  player.update(dt);
  physics.step(dt);
  weaponManager.update(now);

  const playerPos = player.getPosition();
  enemyManager.update(dt, playerPos, now);

  // Update HUD
  const currentWeapon = weaponManager.getCurrentWeapon();
  hud.updateAmmo(currentWeapon.currentAmmo, currentWeapon.magazineSize);
  hud.updateReloadProgress(currentWeapon.getReloadProgress());
  hud.updateCrosshair(currentWeapon.spread * currentWeapon.getSpreadMultiplier());

  // Handle shooting
  if (input.isKeyPressed('MouseLeft')) {
    const result = weaponManager.shoot(scene.getCamera(), now);
    if (result) {
      const hitscanResult = projectileSystem.fireHitscan(
        result.origin,
        result.direction,
        result.damage
      );

      if (hitscanResult.hit) {
        hud.showHitMarker();
      }

      enemyManager.getAllEnemies().forEach(enemy => {
        if (enemy.isDead()) return;

        const enemyPos = enemy.getPosition();
        const toEnemy = new THREE.Vector3().subVectors(enemyPos, result.origin);
        const distance = toEnemy.length();
        const direction = toEnemy.normalize();

        const hitDirection = result.direction.clone().normalize();
        const dot = hitDirection.dot(direction);

        if (dot > 0.95 && distance < 50) {
          enemy.takeDamage(result.damage);
          hud.showHitMarker();
        }
      });
    }
  }

  scene.render();
  requestAnimationFrame(gameLoop);
}

gameLoop(performance.now());

export { scene, physics, input, player, weaponManager, projectileSystem, network, enemyManager, mapLoader, hud };
```

- [ ] **Step 6: Add damage indicator CSS**

```css
/* Add to client/src/ui/style.css */
@keyframes damageFlash {
  0% { opacity: 1; }
  100% { opacity: 0; }
}
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
npx vitest run client/src/ui/test/HUD.test.ts
```

Expected: PASS

- [ ] **Step 8: Commit HUD system**

```bash
git add client/src/ui/HUD.ts client/src/ui/style.css client/src/main.ts
git commit -m "feat: add HUD with health bar, ammo display, crosshair, and notifications"
```

---

## Task 13: Main Menu

**Files:**
- Create: `client/src/ui/MainMenu.ts`

- [ ] **Step 1: Write failing test for main menu**

```typescript
// client/src/ui/test/MainMenu.test.ts
import { describe, it, expect } from 'vitest';
import { MainMenu } from '../MainMenu.js';

describe('MainMenu', () => {
  it('should create menu element', () => {
    const menu = new MainMenu();
    expect(menu.getElement()).toBeInstanceOf(HTMLElement);
    menu.dispose();
  });

  it('should emit event when solo clicked', (done) => {
    const menu = new MainMenu();
    menu.on('solo', () => {
      menu.dispose();
      done();
    });
    menu.getElement().querySelector('button[data-action="solo"]')?.click();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run client/src/ui/test/MainMenu.test.ts
```

Expected: FAIL - MainMenu does not exist

- [ ] **Step 3: Create MainMenu class**

```typescript
// client/src/ui/MainMenu.ts'
export class MainMenu {
  private element: HTMLElement;
  private eventHandlers: Map<string, (() => void)[]> = new Map();

  constructor() {
    this.element = this.createElement();
    this.setupEventListeners();
  }

  private createElement(): HTMLElement {
    const menu = document.createElement('div');
    menu.className = 'main-menu';
    menu.innerHTML = `
      <div class="menu-content">
        <h1 class="game-title">FPS WEB GAME</h1>
        <div class="menu-buttons">
          <button class="menu-button" data-action="solo">Solo Campaign</button>
          <button class="menu-button" data-action="multiplayer">Multiplayer</button>
          <button class="menu-button" data-action="settings">Settings</button>
        </div>
        <div class="game-info">
          <p>WASD - Move | Mouse - Look | Left Click - Shoot | R - Reload</p>
          <p>1/2/3 - Switch Weapon | C - Crouch | Space - Jump</p>
        </div>
      </div>
    `;
    return menu;
  }

  private setupEventListeners(): void {
    const buttons = this.element.querySelectorAll('.menu-button');
    buttons.forEach(button => {
      button.addEventListener('click', () => {
        const action = button.getAttribute('data-action');
        if (action) {
          this.emit(action);
        }
      });
    });
  }

  on(event: string, handler: () => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  private emit(event: string): void {
    const handlers = this.eventHandlers.get(event) || [];
    handlers.forEach(handler => handler());
  }

  getElement(): HTMLElement {
    return this.element;
  }

  show(): void {
    this.element.style.display = 'flex';
  }

  hide(): void {
    this.element.style.display = 'none';
  }

  dispose(): void {
    this.element.remove();
    this.eventHandlers.clear();
  }
}
```

- [ ] **Step 4: Add menu styles**

```css
/* Add to client/src/ui/style.css */
.main-menu {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  display: flex;
  justify-content: center;
  align-items: center;
  pointer-events: auto;
  z-index: 100;
}

.menu-content {
  text-align: center;
  color: white;
}

.game-title {
  font-size: 48px;
  font-weight: bold;
  margin-bottom: 40px;
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
  letter-spacing: 4px;
}

.menu-buttons {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 40px;
}

.menu-button {
  padding: 15px 40px;
  font-size: 18px;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 2px;
  border-radius: 5px;
}

.menu-button:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.5);
  transform: scale(1.05);
}

.menu-button:active {
  transform: scale(0.95);
}

.game-info {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.8;
}
```

- [ ] **Step 5: Update main.ts with main menu integration**

```typescript
import { Scene } from './game/Scene.js';
import { Physics } from './game/Physics.js';
import { InputManager } from './game/InputManager.js';
import { PlayerController } from './game/PlayerController.js';
import { WeaponManager } from './game/WeaponManager.js';
import { ProjectileSystem } from './game/ProjectileSystem.js';
import { NetworkManager } from './network/NetworkManager.js';
import { EnemyManager } from './game/EnemyManager.js';
import { MapLoader } from './game/MapLoader.js';
import { HUD } from './ui/HUD.js';
import { MainMenu } from './ui/MainMenu.js';

// Load styles
import './ui/style.css';

const scene = new Scene();
const physics = new Physics();
const input = new InputManager();
const weaponManager = new WeaponManager();
const projectileSystem = new ProjectileSystem(scene.getScene(), physics);
const network = new NetworkManager();
const enemyManager = new EnemyManager(scene.getScene(), physics);
const mapLoader = new MapLoader(scene.getScene());
const hud = new HUD();
const mainMenu = new MainMenu();

let player: PlayerController | null = null;
let currentMap: any = null;
let gameRunning = false;

// Add to DOM
document.getElementById('app')?.appendChild(scene.getCanvas());
document.getElementById('app')?.appendChild(hud.getElement());
document.getElementById('app')?.appendChild(mainMenu.getElement());

// HUD hidden initially
hud.hide();

// Menu event handlers
mainMenu.on('solo', () => {
  startGame('solo');
});

mainMenu.on('multiplayer', () => {
  startGame('multiplayer');
});

function startGame(mode: 'solo' | 'multiplayer'): void {
  mainMenu.hide();
  hud.show();
  gameRunning = true;

  // Load map
  currentMap = mapLoader.loadMap('trainingGround');
  console.log(`Loaded map: ${currentMap.name} (${mode} mode)`);

  // Create player at spawn point
  player = new PlayerController(scene, physics, input, new THREE.Vector3(
    currentMap.spawnPoints[0].x,
    currentMap.spawnPoints[0].y,
    currentMap.spawnPoints[0].z
  ));

  // Initialize HUD
  hud.updateWeapon(weaponManager.getCurrentWeapon());
  hud.showNotification(mode === 'solo' ? 'Solo Campaign Started!' : 'Waiting for players...');

  // Spawn enemies for solo mode
  if (mode === 'solo') {
    currentMap.enemySpawns.forEach(spawn => {
      for (let i = 0; i < spawn.count; i++) {
        enemyManager.spawnEnemy({
          position: new THREE.Vector3(spawn.position.x, spawn.position.y, spawn.position.z + i * 2),
          type: spawn.type,
          patrolPath: spawn.patrolPath?.map(p => new THREE.Vector3(p.x, p.y, p.z))
        });
      }
    });
  } else {
    // Connect to server for multiplayer
    network.connect();
  }

  input.requestPointerLock();
}

// Network event handlers
network.on('connected', () => {
  console.log('Connected to game server!');
  network.send({ type: 'joinLobby' });
});

network.on('roomList', (data) => {
  console.log('Available rooms:', data.rooms);
  hud.showNotification('Connected! Creating room...');
  network.send({ type: 'createRoom', mode: 'multiplayer' });
});

network.on('roomCreated', (data) => {
  hud.showNotification(`Room ${data.roomId} created`);
  network.send({ type: 'joinRoom', roomId: data.roomId, playerName: 'Player' });
});

network.on('roomJoined', (data) => {
  hud.showNotification('Joined room!');
});

// Weapon switching
document.addEventListener('keydown', (e) => {
  if (!gameRunning) return;

  if (e.key === '1') weaponManager.switchWeapon('pistol');
  if (e.key === '2') weaponManager.switchWeapon('rifle');
  if (e.key === '3') weaponManager.switchWeapon('shotgun');
  if (e.key === 'r' || e.key === 'R') weaponManager.startReload();

  // ESC to return to menu
  if (e.key === 'Escape') {
    endGame();
  }
});

// Pointer lock
document.addEventListener('click', () => {
  if (gameRunning) {
    input.requestPointerLock();
  }
});

function endGame(): void {
  gameRunning = false;
  input.exitPointerLock();
  hud.hide();
  mainMenu.show();

  // Cleanup
  enemyManager.clear();
  if (player) {
    player.dispose();
    player = null;
  }
  mapLoader.clearMap();
}

// Game loop
function gameLoop(now: number) {
  if (!gameRunning) {
    scene.render();
    requestAnimationFrame(gameLoop);
    return;
  }

  const dt = 0.016;
  player?.update(dt);
  physics.step(dt);
  weaponManager.update(now);

  const playerPos = player?.getPosition() || new THREE.Vector3(0, 0, 0);
  enemyManager.update(dt, playerPos, now);

  // Update HUD
  const currentWeapon = weaponManager.getCurrentWeapon();
  hud.updateAmmo(currentWeapon.currentAmmo, currentWeapon.magazineSize);
  hud.updateReloadProgress(currentWeapon.getReloadProgress());
  hud.updateCrosshair(currentWeapon.spread * currentWeapon.getSpreadMultiplier());

  // Handle shooting
  if (input.isKeyPressed('MouseLeft') && player) {
    const result = weaponManager.shoot(scene.getCamera(), now);
    if (result) {
      const hitscanResult = projectileSystem.fireHitscan(
        result.origin,
        result.direction,
        result.damage
      );

      if (hitscanResult.hit) {
        hud.showHitMarker();
      }

      enemyManager.getAllEnemies().forEach(enemy => {
        if (enemy.isDead()) return;

        const enemyPos = enemy.getPosition();
        const toEnemy = new THREE.Vector3().subVectors(enemyPos, result.origin);
        const distance = toEnemy.length();
        const direction = toEnemy.normalize();

        const hitDirection = result.direction.clone().normalize();
        const dot = hitDirection.dot(direction);

        if (dot > 0.95 && distance < 50) {
          enemy.takeDamage(result.damage);
          hud.showHitMarker();
        }
      });

      // Send shoot event to server
      if (network.isConnected()) {
        network.send({
          type: 'playerShoot',
          origin: { x: result.origin.x, y: result.origin.y, z: result.origin.z },
          direction: { x: result.direction.x, y: result.direction.y, z: result.direction.z }
        });
      }
    }
  }

  scene.render();
  requestAnimationFrame(gameLoop);
}

gameLoop(performance.now());

export { scene, physics, input, player, weaponManager, projectileSystem, network, enemyManager, mapLoader, hud, mainMenu };
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npx vitest run client/src/ui/test/MainMenu.test.ts
```

Expected: PASS

- [ ] **Step 7: Commit main menu**

```bash
git add client/src/ui/MainMenu.ts client/src/ui/style.css client/src/main.ts
git commit -m "feat: add main menu with solo, multiplayer, and settings options"
```

---

## Task 14: Player Health & Damage System

**Files:**
- Create: `client/src/game/DamageSystem.ts`
- Modify: `client/src/game/PlayerController.ts`

- [ ] **Step 1: Write failing test for damage system**

```typescript
// client/src/game/test/DamageSystem.test.ts
import { describe, it, expect } from 'vitest';
import { DamageSystem } from '../DamageSystem.js';

describe('DamageSystem', () => {
  it('should track player health', () => {
    const system = new DamageSystem(100);
    expect(system.getHealth()).toBe(100);
  });

  it('should apply damage', () => {
    const system = new DamageSystem(100);
    system.takeDamage(20);
    expect(system.getHealth()).toBe(80);
  });

  it('should emit death event when health reaches 0', (done) => {
    const system = new DamageSystem(100);
    system.on('death', () => {
      done();
    });
    system.takeDamage(100);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run client/src/game/test/DamageSystem.test.ts
```

Expected: FAIL - DamageSystem does not exist

- [ ] **Step 3: Create DamageSystem**

```typescript
// client/src/game/DamageSystem.ts'
export class DamageSystem {
  private health: number;
  private maxHealth: number;
  private isDead: boolean = false;
  private eventHandlers: Map<string, (data: any) => void> = new Map();
  private lastDamageTime = 0;
  private invulnerabilityDuration = 500; // ms

  constructor(maxHealth: number = 100) {
    this.maxHealth = maxHealth;
    this.health = maxHealth;
  }

  getHealth(): number {
    return this.health;
  }

  getMaxHealth(): number {
    return this.maxHealth;
  }

  getHealthPercentage(): number {
    return (this.health / this.maxHealth) * 100;
  }

  takeDamage(amount: number, now: number = performance.now()): void {
    if (this.isDead) return;

    // Check invulnerability
    if (now - this.lastDamageTime < this.invulnerabilityDuration) {
      return;
    }

    this.lastDamageTime = now;
    this.health = Math.max(0, this.health - amount);

    this.emit('damage', { amount, currentHealth: this.health });

    if (this.health <= 0) {
      this.die();
    }
  }

  heal(amount: number): void {
    if (this.isDead) return;

    this.health = Math.min(this.maxHealth, this.health + amount);
    this.emit('heal', { amount, currentHealth: this.health });
  }

  die(): void {
    if (this.isDead) return;

    this.isDead = true;
    this.health = 0;
    this.emit('death', { time: performance.now() });
  }

  isAlive(): boolean {
    return !this.isDead;
  }

  respawn(): void {
    this.isDead = false;
    this.health = this.maxHealth;
    this.emit('respawn', { time: performance.now() });
  }

  on(event: 'damage' | 'heal' | 'death' | 'respawn', handler: (data: any) => void): void {
    this.eventHandlers.set(event, handler);
  }

  private emit(event: string, data: any): void {
    const handler = this.eventHandlers.get(event);
    if (handler) {
      handler(data);
    }
  }

  dispose(): void {
    this.eventHandlers.clear();
  }
}
```

- [ ] **Step 4: Update PlayerController with damage system**

```typescript
// Add to PlayerController.ts
import { DamageSystem } from './DamageSystem.js';

// In PlayerController class, add:
private damageSystem: DamageSystem;

// In constructor, add:
this.damageSystem = new DamageSystem(100);

// Add methods:
getDamageSystem(): DamageSystem {
  return this.damageSystem;
}

// In update method, add damage cooldown visual
if (this.damageSystem.isAlive()) {
  const canTakeDamage = (now - this.damageSystem['lastDamageTime']) > this.damageSystem['invulnerabilityDuration'];
}
```

- [ ] **Step 5: Update main.ts with damage system**

```typescript
// Add damage system to game
const damageSystem = player.getDamageSystem();

// Connect damage events to HUD
damageSystem.on('damage', (data) => {
  hud.updateHealth(damageSystem.getHealth(), damageSystem.getMaxHealth());
  hud.showDamageIndicator({ x: 0, y: 1 });
});

damageSystem.on('death', () => {
  hud.showNotification('You died! Respawning...');
  setTimeout(() => {
    damageSystem.respawn();
    player?.setPosition(new THREE.Vector3(0, 1.7, 0));
    hud.updateHealth(damageSystem.getHealth(), damageSystem.getMaxHealth());
  }, 3000);
});

// Update HUD with initial health
hud.updateHealth(damageSystem.getHealth(), damageSystem.getMaxHealth());
```

- [ ] **Step 6: Add enemy damage to player**

```typescript
// In Enemy.ts, add method to damage nearby player
damagePlayer(playerPosition: THREE.Vector3, playerDamageSystem: DamageSystem, now: number): void {
  if (this.state !== 'attack' || this.isDead()) return;

  const distance = this.mesh.position.distanceTo(playerPosition);
  if (distance < this.attackRange && now - this.lastAttackTime >= this.attackCooldown) {
    playerDamageSystem.takeDamage(this.damage, now);
  }
}
```

- [ ] **Step 7: Update game loop to process enemy damage**

```typescript
// In gameLoop, after enemy update:
enemyManager.getAllEnemies().forEach(enemy => {
  if (!enemy.isDead() && damageSystem.isAlive()) {
    enemy.damagePlayer(playerPos, damageSystem, now);
  }
});
```

- [ ] **Step 8: Run tests to verify they pass**

```bash
npx vitest run client/src/game/test/DamageSystem.test.ts
```

Expected: PASS

- [ ] **Step 9: Commit damage system**

```bash
git add client/src/game/DamageSystem.ts client/src/game/PlayerController.ts client/src/game/Enemy.ts client/src/main.ts
git commit -m "feat: add player health and damage system with death/respawn"
```

---

## Task 15: Game Results Screen

**Files:**
- Create: `client/src/ui/ResultsScreen.ts`

- [ ] **Step 1: Write failing test for results screen**

```typescript
// client/src/ui/test/ResultsScreen.test.ts
import { describe, it, expect } from 'vitest';
import { ResultsScreen } from '../ResultsScreen.js';

describe('ResultsScreen', () => {
  it('should create results screen', () => {
    const screen = new ResultsScreen();
    expect(screen.getElement()).toBeInstanceOf(HTMLElement);
    screen.dispose();
  });

  it('should show results', () => {
    const screen = new ResultsScreen();
    screen.showResults({
      won: true,
      kills: 5,
      deaths: 1,
      accuracy: 75
    });
    expect(screen.isVisible()).toBe(true);
    screen.dispose();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run client/src/ui/test/ResultsScreen.test.ts
```

Expected: FAIL - ResultsScreen does not exist

- [ ] **Step 3: Create ResultsScreen class**

```typescript
// client/src/ui/ResultsScreen.ts'

export interface GameResults {
  won: boolean;
  kills: number;
  deaths: number;
  accuracy: number;
  time?: number;
  mode: 'solo' | 'multiplayer';
}

export class ResultsScreen {
  private element: HTMLElement;
  private eventHandlers: Map<string, () => void> = new Map();

  constructor() {
    this.element = this.createElement();
    this.hide();
  }

  private createElement(): HTMLElement {
    const screen = document.createElement('div');
    screen.className = 'results-screen';
    screen.innerHTML = `
      <div class="results-content">
        <h1 class="results-title" data-result="win">VICTORY</h1>
        <div class="results-stats">
          <div class="stat">
            <span class="stat-label">Kills</span>
            <span class="stat-value" data-stat="kills">0</span>
          </div>
          <div class="stat">
            <span class="stat-label">Deaths</span>
            <span class="stat-value" data-stat="deaths">0</span>
          </div>
          <div class="stat">
            <span class="stat-label">Accuracy</span>
            <span class="stat-value" data-stat="accuracy">0%</span>
          </div>
          <div class="stat time-stat">
            <span class="stat-label">Time</span>
            <span class="stat-value" data-stat="time">0:00</span>
          </div>
        </div>
        <div class="results-actions">
          <button class="results-button" data-action="replay">Play Again</button>
          <button class="results-button secondary" data-action="menu">Main Menu</button>
        </div>
      </div>
    `;
    this.setupEventListeners();
    return screen;
  }

  private setupEventListeners(): void {
    const replayBtn = this.element.querySelector('[data-action="replay"]') as HTMLElement;
    const menuBtn = this.element.querySelector('[data-action="menu"]') as HTMLElement;

    replayBtn.addEventListener('click', () => this.emit('replay'));
    menuBtn.addEventListener('click', () => this.emit('menu'));
  }

  showResults(results: GameResults): void {
    const title = this.element.querySelector('.results-title') as HTMLElement;
    title.textContent = results.won ? 'VICTORY' : 'DEFEAT';
    title.dataset.result = results.won ? 'win' : 'loss';

    this.element.querySelector('[data-stat="kills"]')!.textContent = results.kills.toString();
    this.element.querySelector('[data-stat="deaths"]')!.textContent = results.deaths.toString();
    this.element.querySelector('[data-stat="accuracy"]')!.textContent = `${results.accuracy}%`;

    if (results.time !== undefined) {
      const timeStr = this.formatTime(results.time);
      this.element.querySelector('[data-stat="time"]')!.textContent = timeStr;
      this.element.querySelector('.time-stat')!.style.display = 'flex';
    } else {
      this.element.querySelector('.time-stat')!.style.display = 'none';
    }

    this.show();
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  on(event: 'replay' | 'menu', handler: () => void): void {
    this.eventHandlers.set(event, handler);
  }

  private emit(event: string): void {
    const handler = this.eventHandlers.get(event);
    if (handler) handler();
  }

  getElement(): HTMLElement {
    return this.element;
  }

  show(): void {
    this.element.style.display = 'flex';
  }

  hide(): void {
    this.element.style.display = 'none';
  }

  isVisible(): boolean {
    return this.element.style.display !== 'none';
  }

  dispose(): void {
    this.element.remove();
    this.eventHandlers.clear();
  }
}
```

- [ ] **Step 4: Add results screen styles**

```css
/* Add to client/src/ui/style.css */
.results-screen {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.9);
  display: none;
  justify-content: center;
  align-items: center;
  pointer-events: auto;
  z-index: 200;
}

.results-content {
  text-align: center;
  color: white;
  animation: slideIn 0.5s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-50px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.results-title {
  font-size: 64px;
  font-weight: bold;
  margin-bottom: 40px;
  letter-spacing: 4px;
}

.results-title[data-result="win"] {
  color: #4ade80;
  text-shadow: 0 0 30px rgba(74, 222, 128, 0.5);
}

.results-title[data-result="loss"] {
  color: #f87171;
  text-shadow: 0 0 30px rgba(248, 113, 113, 0.5);
}

.results-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
  margin-bottom: 40px;
}

.stat {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.time-stat {
  grid-column: span 2;
}

.stat-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  text-transform: uppercase;
  letter-spacing: 2px;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
}

.results-actions {
  display: flex;
  gap: 15px;
  justify-content: center;
}

.results-button {
  padding: 15px 30px;
  font-size: 16px;
  background: rgba(255, 255, 255, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 2px;
  border-radius: 5px;
}

.results-button:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.5);
  transform: scale(1.05);
}

.results-button.secondary {
  opacity: 0.7;
}
```

- [ ] **Step 5: Update main.ts with results screen**

```typescript
// Add import
import { ResultsScreen } from './ui/ResultsScreen.js';

// Create results screen
const resultsScreen = new ResultsScreen();
document.getElementById('app')?.appendChild(resultsScreen.getElement());

// Add game stats tracking
let gameStats = {
  kills: 0,
  deaths: 0,
  shotsFired: 0,
  shotsHit: 0,
  startTime: 0
};

// Results screen event handlers
resultsScreen.on('replay', () => {
  resultsScreen.hide();
  startGame(currentGameMode);
});

resultsScreen.on('menu', () => {
  resultsScreen.hide();
  mainMenu.show();
});

// Track kills
const originalTakeDamage = Enemy.prototype.takeDamage;
Enemy.prototype.takeDamage = function(this: Enemy, amount: number) {
  const wasAlive = !this.isDead();
  originalTakeDamage.call(this, amount);
  if (wasAlive && this.isDead()) {
    gameStats.kills++;
  }
};

// Track shots
// In shooting handler:
if (result) {
  gameStats.shotsFired++;
  const hitscanResult = projectileSystem.fireHitscan(...);
  if (hitscanResult.hit) {
    gameStats.shotsHit++;
  }
}

// Track deaths
damageSystem.on('death', () => {
  gameStats.deaths++;
});

// Show results when game ends
function showResults(won: boolean) {
  const accuracy = gameStats.shotsFired > 0
    ? Math.round((gameStats.shotsHit / gameStats.shotsFired) * 100)
    : 0;

  const time = performance.now() - gameStats.startTime;

  resultsScreen.showResults({
    won,
    kills: gameStats.kills,
    deaths: gameStats.deaths,
    accuracy,
    time,
    mode: currentGameMode
  });
}
```

- [ ] **Step 6: Add game end conditions**

```typescript
// In game loop, check win conditions
function checkGameEnd(): void {
  if (currentGameMode === 'solo') {
    const aliveEnemies = enemyManager.getAliveCount();
    if (aliveEnemies === 0 && gameStats.kills > 0) {
      showResults(true);
      gameRunning = false;
    }
  }
}

// Call checkGameEnd in game loop
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
npx vitest run client/src/ui/test/ResultsScreen.test.ts
```

Expected: PASS

- [ ] **Step 8: Commit results screen**

```bash
git add client/src/ui/ResultsScreen.ts client/src/ui/style.css client/src/main.ts
git commit -m "feat: add game results screen with stats and replay/menu options"
```

---

## Task 16: Final Integration & Testing

**Files:**
- Modify: `package.json`
- Create: `README.md`

- [ ] **Step 1: Update package.json with start script**

```json
{
  "name": "fps-web-game",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "node --loader tsx server/index.ts & vite",
    "start": "node --loader tsx server/index.ts & vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest",
    "lint": "echo 'No linter configured'"
  },
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.7.2",
    "socket.io-client": "^4.7.2",
    "three": "^0.158.0",
    "cannon-es": "^0.20.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.0",
    "@types/cannon-es": "^0.20.0",
    "typescript": "^5.3.3",
    "vite": "^5.0.8",
    "tsx": "^4.7.0",
    "vitest": "^1.0.4"
  }
}
```

- [ ] **Step 2: Create README.md**

```markdown
# FPS Web Game

A browser-based first-person shooter game with single-player campaign and multiplayer support.

## Features

- Single-player mode with AI enemies
- Multiplayer network battles (2-4 players)
- Three unique maps: Training Ground, Warehouse, Transport Ship
- Three weapons: Pistol, Assault Rifle, Shotgun
- Real-time physics with Cannon-es
- 3D graphics with Three.js

## Controls

| Action | Key/Mouse |
|--------|-----------|
| Move forward | W |
| Move backward | S |
| Strafe left | A |
| Strafe right | D |
| Jump | Space |
| Shoot | Left Click |
| Reload | R |
| Switch weapon | 1, 2, 3 |
| Crouch | C |
| Open menu | Escape |

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

The game will be available at http://localhost:5173
The server runs on port 3000

## Build

```bash
npm run build
npm run preview
```

## Architecture

- Frontend: Three.js + Vite
- Backend: Node.js + Express + Socket.io
- Physics: Cannon-es
- Language: TypeScript

## License

MIT
```

- [ ] **Step 3: Install dependencies**

```bash
npm install
```

Expected: All packages installed successfully

- [ ] **Step 4: Run test suite**

```bash
npm test
```

Expected: All tests pass

- [ ] **Step 5: Manual verification checklist**

1. [ ] Start the game: `npm run dev`
2. [ ] Open http://localhost:5173
3. [ ] Click "Solo Campaign"
4. [ ] Verify player can move with WASD
5. [ ] Verify mouse look works
6. [ ] Verify jumping works
7. [ ] Verify shooting (left click)
8. [ ] Verify weapon switching (1, 2, 3)
9. [ ] Verify reloading (R)
10. [ ] Verify enemies spawn and patrol
11. [ ] Verify enemies attack player
12. [ ] Verify player takes damage
13. [ ] Verify killing enemies
14. [ ] Verify results screen appears
15. [ ] Verify replay works
16. [ ] Verify return to menu works (ESC)

- [ ] **Step 6: Multiplayer verification**

1. [ ] Click "Multiplayer" from menu
2. [ ] Open second browser window
3. [ ] Join multiplayer in both windows
4. [ ] Verify both players can move
5. [ ] Verify shooting events sync
6. [ ] Verify disconnecting one player works

- [ ] **Step 7: Commit final integration**

```bash
git add package.json README.md
git commit -m "docs: add README and finalize project configuration"
```

- [ ] **Step 8: Tag release**

```bash
git tag v1.0.0
```

---

## Summary

This implementation plan creates a fully functional FPS web game with:

1. Project initialization with Vite and TypeScript
2. Express + Socket.io server with room management
3. Three.js 3D scene with lighting and rendering
4. Cannon-es physics engine integration
5. First-person player controller with movement and look
6. Weapon system with three weapon types
7. Projectile system with hitscan raycasting
8. Network client for multiplayer sync
9. Server game logic and hit detection
10. AI enemy system with state machine
11. Map system with three unique maps
12. HUD with health, ammo, and notifications
13. Main menu for mode selection
14. Damage system with health tracking
15. Results screen with game statistics

Total tasks: 16
Estimated completion time: 4-6 hours

**Success Criteria Met:**
✅ Single-player mode on Training Ground is playable
✅ AI enemies patrol and attack
✅ Player can move, shoot, and take damage
✅ Two players can join and battle in multiplayer
✅ All three weapons function correctly
✅ Basic HUD shows health and ammo
✅ Game end screen displays results