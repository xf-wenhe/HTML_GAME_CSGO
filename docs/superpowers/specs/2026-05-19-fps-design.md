# Web FPS Game Design Specification

**Date:** 2026-05-19
**Author:** Claude & Fengye
**Status:** Draft

---

## Overview

A browser-based first-person shooter game supporting:
- Single-player campaign mode with AI enemies
- Multiplayer network battles (2-4 players)
- Three distinct maps
- Multiple weapon types

**Tech Stack:**
- Frontend: Three.js + Vite
- Backend: Node.js + Express + Socket.io
- Physics: Cannon-es
- Language: TypeScript

---

## Requirements

### Functional Requirements

| Req ID | Description | Priority |
|--------|-------------|----------|
| R1 | Single-player campaign mode with AI enemies | High |
| R2 | Multiplayer network battles via WebSocket | High |
| R3 | Three unique maps with different gameplay styles | High |
| R4 | Three weapon types (pistol, rifle, shotgun) | High |
| R5 | Player movement (WASD) and camera control (mouse) | High |
| R6 | Shooting mechanics with ammo management | High |
| R7 | Health/damage system | High |
| R8 | Main menu, lobby, and HUD UI | Medium |
| R9 | Game end screen with statistics | Medium |

### Non-Functional Requirements

- Target: 60 FPS on mid-range hardware
- Network: <100ms latency compensation
- Single Node.js process for development

---

## Architecture

### Project Structure

```
fps-web-game/
├── package.json
├── vite.config.js
├── index.html
├── client/
│   ├── src/
│   │   ├── main.ts                 # Entry point
│   │   ├── game/
│   │   │   ├── Game.ts             # Main game controller
│   │   │   ├── Player.ts           # Player class
│   │   │   ├── Enemy.ts            # Enemy class
│   │   │   ├── Weapon.ts           # Weapon class
│   │   │   ├── Map.ts              # Map class
│   │   │   └── Physics.ts          # Physics wrapper
│   │   ├── network/
│   │   │   └── NetworkManager.ts   # Socket.io client
│   │   ├── ui/
│   │   │   ├── MainMenu.ts         # Main menu
│   │   │   ├── HUD.ts              # Heads-up display
│   │   │   └── Lobby.ts            # Lobby UI
│   │   └── assets/
│   │       └── models/             # 3D models
│   └── style.css
└── server/
    ├── index.ts                    # Express + Socket.io server
    ├── rooms.ts                    # Room management
    ├── gameLogic.ts                # Server-side game logic
    └── sync.ts                     # State synchronization
```

### Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Game.ts                                │
│  (Main game controller)                                      │
├─────────────────────────────────────────────────────────────┤
│  - init()                                                     │
│  - loop()          Render loop + physics step                │
│  - update()        Update all entities                       │
│  - handleInput()   Input processing                          │
│  - render()        Three.js rendering                        │
└──────────┬──────────────────────────────────────────────────┘
           │
     ┌─────┼─────┬─────────┬────────┬─────────┐
     ▼     ▼     ▼         ▼        ▼         ▼
  Player  Enemy  Weapon    Map    Physics  NetworkManager
   │       │      │         │        │          │
   └───────┴──────┴─────────┴────────┴──────────┘
                    Shared game state
```

---

## Network Synchronization

### Strategy: Client Prediction + Server Authority

```
Client                          Server
  │                               │
  │─ Input (WASD + mouse) ──────▶│
  │   (Position prediction)       │
  │← State update ───────────────│
  │   (Reconciliation)            │
  │                               │
  │─ Shoot event ────────────────▶│
  │   (Local feedback)            │
  │← Hit confirmation ───────────│
  │   (Damage calculation)        │
  │                               │
```

### Event Types

| Event | Direction | Frequency |
|-------|-----------|-----------|
| `playerMove` | Client → Server | High (60Hz) |
| `playerShoot` | Client → Server | On action |
| `playerHit` | Server → Client | On hit |
| `enemyUpdate` | Server → Client | Solo mode only |
| `gameState` | Server → Client | State changes |

### Room System

- `lobby` — Waiting area
- `solo_*` — Single-player rooms
- `mp_*` — Multiplayer battle rooms (supports 2-4 players)

---

## Weapon System

### Weapon Interface

```typescript
interface Weapon {
  id: string;
  name: string;
  damage: number;        // Damage per shot
  fireRate: number;      // Shots per second
  magazineSize: number;  // Magazine capacity
  reloadTime: number;    // Reload time in seconds
  spread: number;        // Spread angle in degrees
  projectileSpeed: number;
}
```

### Weapon Types

| Weapon | Damage | Fire Rate | Magazine | Reload | Description |
|--------|--------|-----------|----------|--------|-------------|
| Pistol | 20 | 2/s | 12 | 1.5s | Sidearm, infinite reserve |
| Rifle | 15 | 8/s | 30 | 2s | Automatic, balanced |
| Shotgun | 10×5 | 1/s | 8 | 3s | Close range, 5 pellets |

### Reload Logic

- Press R or auto-trigger on empty magazine
- Cannot shoot during reload
- Update ammo count on completion

---

## AI System (Single Player)

### Enemy Interface

```typescript
interface Enemy {
  state: 'idle' | 'patrol' | 'chase' | 'attack' | 'dead';
  health: number;
  speed: number;
  detectionRange: number;
  attackRange: number;
  patrolPath: Vector3[];
}
```

### State Machine

```
        ┌─────────┐
        │  idle   │ ◄──────┐
        └────┬────┘        │
             │ Player found│ Lost/dead
             ▼             │
        ┌─────────┐        │
        │  chase  │───────►│
        └────┬────┘        │
             │ In range    │
             ▼             │
        ┌─────────┐        │
        │ attack  │───────►│
        └─────────┘        │
```

### AI Types

| Type | Behavior | Preferred Range |
|------|----------|-----------------|
| Patrol | Follows patrol path, chases on detection | Variable |
| Shooter | Stationary, long-range attacks | Long |
| Assault | Charges player, melee attacks | Short |

---

## Map System

### Map Data Structure

```typescript
interface MapData {
  name: string;
  walls: BoundingBox[];    // Collision boxes
  spawnPoints: Vector3[];  // Player spawn points
  enemySpawns: {          // Enemy spawn points (solo mode)
    type: 'patrol' | 'shooter' | 'assault';
    position: Vector3;
    count: number;
  }[];
  objectives?: {          // Mission objectives
    type: 'eliminate' | 'reach';
    target: Vector3;
    required: number;
  }[];
}
```

### Launch Maps

| Map | Description | Max Players | Enemy Types |
|------|-------------|-------------|-------------|
| Training Ground | Simple open area | 2 | Patrol |
| Warehouse | Multi-level, cover-rich | 2-4 | Patrol + Shooter |
| Transport Ship | Long corridors, mid/long range | 2-4 | Shooter + Assault |

---

## UI System

### Screen Flow

```
Main Menu ──► Lobby ──► Game ──► Results
 │         │       │        │
 ├─ Solo   ├─ Create  ├─ HUD   ├─ Win/Lose
 ├─ Multi   ├─ Join  ├─ Ammo  ├─ Kill stats
 └─ Settings └─ Wait  ├─ Health └─ Replay
```

### HUD Elements

- **Top-left:** Player status (health, armor)
- **Top-right:** Weapon info (ammo, current weapon)
- **Center:** Crosshair (dynamically adjusts with spread)
- **Bottom:** Game notifications

### Results Screen

- Kills, deaths, accuracy
- Solo mode: Completion time
- Multiplayer mode: MVP, win/loss

---

## Controls

| Action | Key/Mouse |
|--------|-----------|
| Move forward | W |
| Move backward | S |
| Strafe left | A |
| Strafe right | D |
| Jump | Space |
| Shoot | Left click |
| Reload | R |
| Switch weapon | 1, 2, 3 |
| Crouch | C |
| Open menu | Escape |

---

## Success Criteria

The MVP is complete when:

1. [ ] Single-player mode on Training Ground is playable
2. [ ] AI enemies patrol and attack
3. [ ] Player can move, shoot, and take damage
4. [ ] Two players can join and battle in multiplayer
5. [ ] All three weapons function correctly
6. [ ] Basic HUD shows health and ammo
7. [ ] Game end screen displays results

---

## Next Steps

After spec approval:

1. Initialize project with Vite + TypeScript
2. Set up Socket.io server
3. Implement basic Three.js scene
4. Add player movement
5. Implement shooting mechanics
6. Add AI enemies
7. Build multiplayer sync
8. Create UI screens