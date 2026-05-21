import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Scene } from './game/Scene.js';
import { Physics } from './game/Physics.js';
import { InputManager } from './game/InputManager.js';
import { PlayerController } from './game/PlayerController.js';
import { WeaponManager } from './game/WeaponManager.js';
import { ProjectileSystem } from './game/ProjectileSystem.js';
import { NetworkManager } from './network/NetworkManager.js';
import { EnemyManager } from './game/EnemyManager.js';
import { INDUSTRIAL_ARENA } from './game/MapData.js';
import { RemotePlayers } from './game/RemotePlayers.js';
import { SurvivalMode } from './game/SurvivalMode.js';
import { MatchMode, MatchSnapshot, WeaponId } from './game/types.js';
import { InputMode, canMove, canShoot } from './game/InputMode.js';
import { HUD } from './ui/HUD.js';
import { MainMenu } from './ui/MainMenu.js';
import './ui/style.css';

declare global {
  interface Window {
    __debugPlayerPosition?: () => { x: number; y: number; z: number } | null;
    __debugInputState?: () => {
      mode: InputMode;
      pointerLocked: boolean;
      horizontalSpeed: number;
      weaponId: string;
      ammo: number;
      keys: string[];
    };
  }
}

const scene = new Scene();
const physics = new Physics();
const input = new InputManager();
const weaponManager = new WeaponManager();
const projectileSystem = new ProjectileSystem(scene.getScene(), physics);
const network = new NetworkManager();
const enemyManager = new EnemyManager(scene.getScene(), physics);
const survival = new SurvivalMode(enemyManager);
const remotePlayers = new RemotePlayers(scene.getScene());
const hud = new HUD();
const mainMenu = new MainMenu();

let player: PlayerController | null = null;
let gameRunning = false;
let inputMode: InputMode = 'menu';
let currentMode: 'solo' | 'multiplayer' | null = null;
let desiredMultiplayerMode: MatchMode = 'tdm';
let currentSnapshot: MatchSnapshot | null = null;
let localPlayerId: string | undefined;
let lastNetworkInputAt = 0;
let lastFrameTime = performance.now();
let hadPointerLock = false;
const recordedKills = new Set<string>();

scene.getArenaColliders().forEach(collider => {
  physics.addStaticBox(
    new CANNON.Vec3(collider.position.x, collider.position.y, collider.position.z),
    new CANNON.Vec3(collider.size.x / 2, collider.size.y / 2, collider.size.z / 2)
  );
});

document.getElementById('app')?.appendChild(scene.getCanvas());
document.getElementById('app')?.appendChild(hud.getElement());
document.getElementById('app')?.appendChild(mainMenu.getElement());

// Ensure menu is shown on load
mainMenu.show();
hud.hide();

mainMenu.on('solo', () => {
  startGame('solo');
});

mainMenu.on('multiplayer', () => {
  startMultiplayer('tdm');
});

mainMenu.on('tdm', () => {
  startMultiplayer('tdm');
});

mainMenu.on('defusal', () => {
  startMultiplayer('defusal');
});

hud.onBuy((weaponId) => {
  network.send({ type: 'buyWeapon', request: { weaponId } });
  closeBuyMenu(true);
});

hud.onResume(() => {
  resumeGame();
});

function startMultiplayer(mode: MatchMode): void {
  desiredMultiplayerMode = mode;
  startGame('multiplayer');
}

function startGame(mode: 'solo' | 'multiplayer'): void {
  mainMenu.hide();
  hud.show();
  gameRunning = true;
  setInputMode('playing');
  currentMode = mode;
  recordedKills.clear();

  player = new PlayerController(scene, physics, input, INDUSTRIAL_ARENA.playerSpawn.clone());
  player.healFull();
  weaponManager.setPlayerCamera(scene.getCamera());

  hud.updateWeapon(weaponManager.getCurrentWeapon());
  hud.updateHealth(player.getHealth(), player.getMaxHealth());
  hud.showNotification(mode === 'solo' ? 'Survival protocol online' : 'Waiting for players...');

  if (mode === 'solo') {
    survival.start(performance.now());
  } else {
    network.connect();
  }

  requestGameFocus();
}

network.on('connected', () => {
  console.log('Connected to game server!');
  network.send({ type: 'joinLobby' });
  network.send({
    type: 'createRoom',
    config: {
      mode: desiredMultiplayerMode,
      mapId: 'forgepoint',
      maxPlayers: 10,
      tickRate: 30,
      isPrivate: false,
      friendlyFire: false,
      roundLimit: desiredMultiplayerMode === 'tdm' ? 100 : 15,
      warmupSeconds: desiredMultiplayerMode === 'tdm' ? 3 : 8
    }
  });
});

network.on('roomList', (data) => {
  console.log('Available rooms:', data.rooms);
});

network.on('roomCreated', (data) => {
  network.send({ type: 'joinRoom', roomId: data.roomId, playerName: `Player-${Math.floor(Math.random() * 1000)}` });
});

network.on('roomJoined', (data) => {
  localPlayerId = data.playerId;
  currentSnapshot = data.snapshot ?? null;
  network.send({ type: 'setReady', ready: true });
  hud.showNotification(`${desiredMultiplayerMode.toUpperCase()} room ready`);
});

network.on('roomState', (data) => {
  applyMatchSnapshot(data.snapshot);
});

network.on('matchSnapshot', (data) => {
  applyMatchSnapshot(data.snapshot);
});

network.on('roomError', (data) => {
  hud.showNotification(data.message);
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (inputMode === 'playing' || inputMode === 'scoreboard') {
      pauseGame();
    } else if (inputMode === 'paused' || inputMode === 'buyMenu' || inputMode === 'gameOver') {
      endGame();
    }
    return;
  }
  if (!gameRunning) return;
  if (inputMode === 'paused' || inputMode === 'gameOver') return;

  if (e.key === '1') weaponManager.switchWeapon('pistol');
  if (e.key === '2') weaponManager.switchWeapon('rifle');
  if (e.key === '3') weaponManager.switchWeapon('shotgun');
  if (e.key === 'r' || e.key === 'R') {
    weaponManager.startReload();
    if (currentMode === 'multiplayer') network.send({ type: 'reload' });
  }

  if (['1', '2', '3'].includes(e.key)) {
    hud.updateWeapon(weaponManager.getCurrentWeapon());
    if (currentMode === 'multiplayer') network.send({ type: 'switchWeapon', weaponId: currentMultiplayerWeaponId() });
  }

  if (e.key === 'b' || e.key === 'B') {
    if (inputMode === 'buyMenu') closeBuyMenu(false);
    else openBuyMenu();
  }
  if (e.key === 'Tab') {
    e.preventDefault();
    if (inputMode === 'playing') {
      setInputMode('scoreboard');
      hud.toggleScoreboard(true);
    }
  }
  if (e.key === 'e' || e.key === 'E') {
    const site = nearestBombSite();
    if (currentSnapshot?.bomb?.plantedAt) network.send({ type: 'defuseBomb' });
    else network.send({ type: 'plantBomb', request: { site } });
  }

});

document.addEventListener('keyup', (e) => {
  if (e.key === 'Tab' && inputMode === 'scoreboard') {
    hud.toggleScoreboard(false);
    setInputMode('playing');
  }
});

document.addEventListener('click', () => {
  if (gameRunning && inputMode === 'playing' && !input.isPointerLocked()) {
    requestGameFocus();
  }
});

document.addEventListener('pointerlockchange', () => {
  if (input.isPointerLocked()) {
    hadPointerLock = true;
    return;
  }
  if (gameRunning && inputMode === 'playing' && hadPointerLock) {
    hadPointerLock = false;
    pauseGame();
  }
});

function endGame(): void {
  gameRunning = false;
  input.exitPointerLock();
  hud.hide();
  mainMenu.show();
  setInputMode('menu');
  enemyManager.clear();
  remotePlayers.clear();
  network.send({ type: 'leaveRoom' });
  network.disconnect();
  currentSnapshot = null;
  localPlayerId = undefined;
  currentMode = null;
  weaponManager.dispose();
  hud.hideResults();
  if (player) {
    player.dispose();
    player = null;
  }
}

function gameLoop(now: number) {
  const dt = Math.min((now - lastFrameTime) / 1000, 0.033);
  lastFrameTime = now;

  if (!gameRunning || inputMode === 'paused' || inputMode === 'gameOver') {
    scene.render();
    requestAnimationFrame(gameLoop);
    return;
  }

  if (player && canMove(inputMode)) {
    player.update(dt);
  } else {
    input.getMouseDelta();
  }
  physics.step(dt);
  weaponManager.update(now, dt, player?.isMoving() ?? false);

  const playerPos = player?.getPosition() || new THREE.Vector3(0, 0, 0);
  const enemyDamage = enemyManager.update(dt, playerPos, now);
  if (enemyDamage > 0 && player) {
    player.takeDamage(enemyDamage);
    hud.updateHealth(player.getHealth(), player.getMaxHealth());
    hud.showDamage();
    if (player.isDead()) {
      survival.gameOver();
      hud.showResults(survival.getStats(now));
      setInputMode('gameOver');
      gameRunning = false;
      input.exitPointerLock();
    }
  }

  enemyManager.getAllEnemies().forEach(enemy => {
    if (enemy.isDead() && !recordedKills.has(enemy.id)) {
      recordedKills.add(enemy.id);
      survival.recordKill(enemy.getPosition());
    }
  });

  if (currentMode === 'solo' && gameRunning) {
    hud.updateSurvival(survival.update(dt, now));
  } else if (currentMode === 'multiplayer' && currentSnapshot) {
    hud.updateMatch(currentSnapshot, localPlayerId);
    if (player && now - lastNetworkInputAt > 50) {
      lastNetworkInputAt = now;
      const rotation = player.getRotation();
      network.send({
        type: 'playerInput',
        input: {
          position: vectorToPlain(player.getPosition()),
          rotation: { x: rotation.pitch, y: rotation.yaw, z: 0 }
        }
      });
    }
  }

  const currentWeapon = weaponManager.getCurrentWeapon();
  hud.updateAmmo(currentWeapon.currentAmmo, currentWeapon.magazineSize);
  hud.updateReloadProgress(currentWeapon.getReloadProgress());
  hud.updateCrosshair(currentWeapon.spread * currentWeapon.getSpreadMultiplier());

  if (canShoot(inputMode) && input.isPointerLocked() && input.isKeyPressed('MouseLeft') && player) {
    const result = weaponManager.shoot(scene.getCamera(), now);
    if (result) {
      if (currentMode === 'multiplayer') {
        network.send({
          type: 'shoot',
          request: {
            origin: vectorToPlain(result.origin),
            direction: vectorToPlain(result.direction),
            weaponId: currentMultiplayerWeaponId(),
            clientTime: now
          }
        });
      }
      const hitscanResult = projectileSystem.fireHitscan(result.origin, result.direction, result.damage);

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

        if (dot > 0.985 && distance < 65) {
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

export { scene, physics, input, player, weaponManager, projectileSystem, network, enemyManager, hud, mainMenu };

function setInputMode(mode: InputMode): void {
  inputMode = mode;
}

function requestGameFocus(): void {
  hud.hidePause();
  hud.toggleBuyMenu(false);
  input.clearActionKeys();
  setInputMode('playing');
  input.requestPointerLock();
}

function pauseGame(): void {
  if (!gameRunning) return;
  hadPointerLock = false;
  setInputMode('paused');
  input.exitPointerLock();
  hud.toggleBuyMenu(false);
  hud.toggleScoreboard(false);
  hud.showPause();
}

function resumeGame(): void {
  if (!gameRunning) return;
  requestGameFocus();
}

function openBuyMenu(): void {
  if (!gameRunning || currentMode !== 'multiplayer') return;
  setInputMode('buyMenu');
  input.exitPointerLock();
  hud.toggleBuyMenu(true);
}

function closeBuyMenu(refocus: boolean): void {
  hud.toggleBuyMenu(false);
  if (gameRunning) {
    setInputMode('playing');
    if (refocus) requestGameFocus();
  }
}

function applyMatchSnapshot(snapshot: MatchSnapshot): void {
  currentSnapshot = snapshot;
  remotePlayers.update(snapshot, localPlayerId);
  hud.updateMatch(snapshot, localPlayerId);
}

function vectorToPlain(vector: THREE.Vector3) {
  return { x: vector.x, y: vector.y, z: vector.z };
}

function currentMultiplayerWeaponId(): WeaponId {
  switch (weaponManager.getCurrentWeaponId()) {
    case 'pistol':
      return 'sidearm';
    case 'shotgun':
      return 'bulldog';
    case 'rifle':
    default:
      return currentSnapshot?.players.find(playerSnapshot => playerSnapshot.id === localPlayerId)?.team === 'defenders'
        ? 'sentinel'
        : 'vandal';
  }
}

function nearestBombSite(): 'A' | 'B' {
  if (!player) return 'A';
  const position = player.getPosition();
  return position.x < 0 ? 'A' : 'B';
}

window.__debugPlayerPosition = () => player ? vectorToPlain(player.getPosition()) : null;
window.__debugInputState = () => ({
  mode: inputMode,
  pointerLocked: input.isPointerLocked(),
  horizontalSpeed: player?.getHorizontalSpeed() ?? 0,
  weaponId: weaponManager.getCurrentWeaponId(),
  ammo: weaponManager.getCurrentWeapon().currentAmmo,
  keys: input.getPressedKeys()
});
