# FPS Web Game

A browser-based first-person shooter game with single-player AI mode and multiplayer network battles.

## Features

- Single-player mode with AI enemies (patrol, chase, attack behaviors)
- Multiplayer network battles via Socket.io
- Three weapons: Pistol, Rifle, Shotgun
- 3D graphics with Three.js
- Physics simulation with Cannon-es
- HUD with health, ammo, crosshair
- Main menu with solo/multiplayer selection

## Controls

| Action | Key/Mouse |
|--------|-----------|
| Move | WASD |
| Look | Mouse |
| Jump | Space |
| Shoot | Left Click |
| Reload | R |
| Switch Weapon | 1, 2, 3 |
| Menu | Escape |

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

Open http://localhost:5173

## Tech Stack

- Frontend: Three.js, Vite, TypeScript
- Backend: Node.js, Express, Socket.io
- Physics: Cannon-es

## License

MIT