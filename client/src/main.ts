import * as THREE from 'three';
import { Scene } from './game/Scene.js';
import { Physics } from './game/Physics.js';
import { InputManager } from './game/InputManager.js';
import { PlayerController } from './game/PlayerController.js';
import { WeaponManager } from './game/WeaponManager.js';
import { ProjectileSystem } from './game/ProjectileSystem.js';
import { NetworkManager } from './network/NetworkManager.js';
import { EnemyManager } from './game/EnemyManager.js';
import { HUD } from './ui/HUD.js';
import { MainMenu } from './ui/MainMenu.js';
import './ui/style.css';

const scene = new Scene();
const physics = new Physics();
const input = new InputManager();
const weaponManager = new WeaponManager();
const projectileSystem = new ProjectileSystem(scene.getScene(), physics);
const network = new NetworkManager();
const enemyManager = new EnemyManager(scene.getScene(), physics);
const hud = new HUD();
const mainMenu = new MainMenu();

let player: PlayerController | null = null;
let gameRunning = false;

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
  startGame('multiplayer');
});

function startGame(mode: 'solo' | 'multiplayer'): void {
  mainMenu.hide();
  hud.show();
  gameRunning = true;

  player = new PlayerController(scene, physics, input, new THREE.Vector3(0, 1.7, 0));
  hud.updateWeapon(weaponManager.getCurrentWeapon());
  hud.showNotification(mode === 'solo' ? 'Solo Campaign Started!' : 'Waiting for players...');

  if (mode === 'solo') {
    for (let i = 0; i < 3; i++) {
      enemyManager.spawnEnemy({
        position: new THREE.Vector3(10 + i * 5, 1.7, 0),
        type: 'patrol',
        patrolPath: [
          new THREE.Vector3(10 + i * 5, 1.7, 0),
          new THREE.Vector3(10 + i * 5, 1.7, 10),
          new THREE.Vector3(-10 + i * 5, 1.7, 10),
          new THREE.Vector3(-10 + i * 5, 1.7, 0)
        ]
      });
    }
  } else {
    network.connect();
  }

  input.requestPointerLock();
}

network.on('connected', () => {
  console.log('Connected to game server!');
  network.send({ type: 'joinLobby' });
});

network.on('roomList', (data) => {
  console.log('Available rooms:', data.rooms);
  hud.showNotification('Connected! Creating room...');
  network.send({ type: 'createRoom', mode: 'multiplayer' });
});

document.addEventListener('keydown', (e) => {
  if (!gameRunning) return;

  if (e.key === '1') weaponManager.switchWeapon('pistol');
  if (e.key === '2') weaponManager.switchWeapon('rifle');
  if (e.key === '3') weaponManager.switchWeapon('shotgun');
  if (e.key === 'r' || e.key === 'R') weaponManager.startReload();

  if (e.key === 'Escape') {
    endGame();
  }
});

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
  enemyManager.clear();
  if (player) {
    player.dispose();
    player = null;
  }
}

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

  const currentWeapon = weaponManager.getCurrentWeapon();
  hud.updateAmmo(currentWeapon.currentAmmo, currentWeapon.magazineSize);
  hud.updateReloadProgress(currentWeapon.getReloadProgress());
  hud.updateCrosshair(currentWeapon.spread * currentWeapon.getSpreadMultiplier());

  if (input.isKeyPressed('MouseLeft') && player) {
    const result = weaponManager.shoot(scene.getCamera(), now);
    if (result) {
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

export { scene, physics, input, player, weaponManager, projectileSystem, network, enemyManager, hud, mainMenu };