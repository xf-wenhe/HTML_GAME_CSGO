import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Scene } from './game/Scene.js';
import { Physics } from './game/Physics.js';
import { InputManager } from './game/InputManager.js';
import { PlayerController } from './game/PlayerController.js';
import { ShootResult, WeaponManager } from './game/WeaponManager.js';
import { ProjectileSystem } from './game/ProjectileSystem.js';
import { NetworkManager } from './network/NetworkManager.js';
import { EnemyManager } from './game/EnemyManager.js';
import { Enemy } from './game/Enemy.js';
import { RemotePlayers } from './game/RemotePlayers.js';
import { SurvivalMode } from './game/SurvivalMode.js';
import { GrenadeSystem } from './game/GrenadeSystem.js';
import { DroppedWeapon, DroppedWeaponSystem } from './game/DroppedWeaponSystem.js';
import { HitRegion, calculateDamage } from './game/Combat.js';
import { AudioFeedback } from './game/AudioFeedback.js';
import { WEAPON_DEFINITIONS } from './game/Weapons.js';
import { Prediction } from './network/Prediction.js';
import type { BuyRequest, GrenadeThrowRequest, MapId, MatchMode, MatchSnapshot, PlayerSnapshot, WeaponId } from './game/types.js';
import { InputMode, PointerLockState, canMove, canShoot } from './game/InputMode.js';
import { HUD } from './ui/HUD.js';
import { MainMenu } from './ui/MainMenu.js';
import { Settings } from './ui/Settings.js';
import { MULTIPLAYER_MAPS } from './game/config/maps.js';
import './ui/style.css';

declare global {
  interface Window {
    __debugPlayerPosition?: () => { x: number; y: number; z: number } | null;
    __debugInputState?: () => {
      mode: InputMode;
      pointerLocked: boolean;
      pointerLockState: PointerLockState;
      pointerLockRequired: boolean;
      lockFailureReason: string | null;
      canShoot: boolean;
      activePanel: string;
      isBuyMenuOpen: boolean;
      isScoreboardOpen: boolean;
      horizontalSpeed: number;
      grounded: boolean;
      airborneTime: number;
      mapBounds: { width: number; depth: number; centerZ: number };
      weaponId: string;
      assetSource: 'glb' | 'fallback';
      enemyAssetSources: Array<'glb' | 'fallback'>;
      activeSlot: 'primary' | 'pistol' | 'knife' | 'grenade';
      ammo: number;
      reserveAmmo: number;
      armor: number;
      aiming: boolean;
      nearbyPickup: string | null;
      lastHitRegion: string | null;
      crouched: boolean;
      crouchJumping: boolean;
      collisionHeight: number;
      grenadeId: string;
      grenadeInventory: { he: number; flash: number; smoke: number; incendiary: number; decoy: number };
      keys: string[];
      mousePlatform: string;
      rawMouseInput: boolean;
      mouseSensitivity: number;
    };
    __debugAllowPointerLockBypassForTests?: () => void;
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
const grenades = new GrenadeSystem(scene.getScene());
const droppedWeapons = new DroppedWeaponSystem(scene.getScene());
const remotePlayers = new RemotePlayers(scene.getScene());
const hud = new HUD();
const mainMenu = new MainMenu();
const audioFeedback = new AudioFeedback();
const settings = new Settings();
const prediction = new Prediction();

let player: PlayerController | null = null;
let gameRunning = false;
let inputMode: InputMode = 'menu';
let pointerLockState: PointerLockState = 'supported';
const pointerLockRequired = true;
let lockFailureReason: string | null = null;
let debugPointerLockBypass = false;
let networkLatencyMs: number | null = null;
const allowDebugPointerLockBypass = typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
let currentMode: 'solo' | 'multiplayer' | null = null;
let desiredMultiplayerMode: MatchMode = 'tdm';
let currentSnapshot: MatchSnapshot | null = null;
let localPlayerId: string | undefined;
let pendingRoomId: string | null = null;
let pendingSpectator = false;
let isSpectating = false;
let lastNetworkInputAt = 0;
let lastFrameTime = performance.now();
let hadPointerLock = false;
let usingGrenade = false;
let activeSlot: 'primary' | 'pistol' | 'knife' | 'grenade' = 'pistol';
let equippedPrimary = '';
let equippedPistol = 'pistol';
let nearbyDrop: DroppedWeapon | null = null;
let lastHitRegion: HitRegion | null = null;
const recordedKills = new Set<string>();
let selectedMapId: MapId = 'dust2';
let arenaColliderBodies: CANNON.Body[] = [];
let wasGrounded = true;
const multiplayerSessionStorageKey = 'fps-web-game:multiplayer-session:v1';
let currentPlayerName = '';

interface SavedMultiplayerSession {
  roomId: string;
  playerId: string;
  sessionId: string;
  mode: MatchMode;
  mapId: MapId;
  playerName: string;
}

syncArenaPhysics();

function syncArenaPhysics(): void {
  arenaColliderBodies.forEach(body => physics.removeBody(body));
  arenaColliderBodies = scene.getArenaColliders().map(collider => {
    const body = physics.addStaticBox(
      new CANNON.Vec3(collider.position.x, collider.position.y, collider.position.z),
      new CANNON.Vec3(collider.size.x / 2, collider.size.y / 2, collider.size.z / 2),
      collider.rotation,
      collider.name
    );
    return body;
  });
  enemyManager.setLineOfSightColliders(scene.getArenaColliders());
}

document.getElementById('app')?.appendChild(scene.getCanvas());
document.getElementById('app')?.appendChild(hud.getElement());
document.getElementById('app')?.appendChild(mainMenu.getElement());
input.bindTouchControls(hud.getTouchControlsElement());
hud.setTouchControlsVisible(input.isTouchControlsActive());

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

mainMenu.on('settings', () => {
  settings.show();
});

mainMenu.on('refreshRooms', () => {
  if (network.isConnected()) network.send({ type: 'joinLobby' });
  else network.connect();
});

mainMenu.on('joinRoom', (roomId) => {
  if (typeof roomId !== 'string') return;
  pendingRoomId = roomId;
  pendingSpectator = false;
  startGame('multiplayer');
});

mainMenu.on('spectateRoom', (roomId) => {
  if (typeof roomId !== 'string') return;
  pendingRoomId = roomId;
  pendingSpectator = true;
  startGame('multiplayer');
});

settings.onChange((s) => {
  input.setMouseSettings({ baseSensitivity: 0.00165 * s.mouseSensitivity });
  applyCrosshairStyle(s.crosshairStyle, s.crosshairColor);
});

settings.onClose(() => {
  const s = settings.getSettings();
  input.setMouseSettings({ baseSensitivity: 0.00165 * s.mouseSensitivity });
  applyCrosshairStyle(s.crosshairStyle, s.crosshairColor);
});

hud.onBuy((request) => {
  if (isSpectating) {
    hud.showNotification('观战中不能购买');
    closeBuyMenu(true);
    return;
  }
  if (currentMode === 'solo') {
    applySoloBuy(request);
  } else {
    network.send({ type: 'buyWeapon', request });
  }
  closeBuyMenu(true);
});

hud.onResume(() => {
  resumeGame();
});

function startMultiplayer(mode: MatchMode): void {
  desiredMultiplayerMode = mode;
  pendingRoomId = null;
  pendingSpectator = false;
  startGame('multiplayer');
}

function startGame(mode: 'solo' | 'multiplayer'): void {
  mainMenu.hide();
  hud.show();
  hud.setTouchControlsVisible(input.isTouchControlsActive());
  gameRunning = true;
  setInputMode('playing');
  debugPointerLockBypass = false;
  currentMode = mode;
  isSpectating = false;
  selectedMapId = mainMenu.getMapId();
  const currentSettings = settings.getSettings();
  input.setMouseSettings({ baseSensitivity: 0.00165 * currentSettings.mouseSensitivity });
  applyCrosshairStyle(currentSettings.crosshairStyle, currentSettings.crosshairColor);
  const mapName = MULTIPLAYER_MAPS[selectedMapId]?.name ?? selectedMapId;
  hud.showMapLoading(mapName);
  scene.setArena(selectedMapId);
  hud.hideMapLoading();
  syncArenaPhysics();
  usingGrenade = false;
  activeSlot = 'pistol';
  equippedPrimary = '';
  equippedPistol = 'pistol';
  recordedKills.clear();
  droppedWeapons.clear();
  nearbyDrop = null;
  lastHitRegion = null;

  player = new PlayerController(scene, physics, input, scene.getCurrentArena().playerSpawn.clone());
  player.healFull();
  weaponManager.setPlayerCamera(scene.getCamera());
  weaponManager.switchWeapon(equippedPistol);
  grenades.reset();

  hud.updateWeapon(weaponManager.getCurrentWeapon());
  syncWeaponHud();
  hud.updateHealth(player.getHealth(), player.getMaxHealth(), player.getArmor());
  hud.updateNetworkStatus(mode === 'solo' ? '单机' : '连接中...');
  hud.updateRoomPlayers(mode === 'solo' ? 1 : 0, mode === 'solo' ? 1 : 10);
  hud.showNotification(mode === 'solo' ? '单人任务已开始' : '正在等待玩家...');

  if (mode === 'solo') {
    survival.start(performance.now(), mainMenu.getDifficulty());
  } else {
    if (network.isConnected()) joinMultiplayerAfterConnection();
    else network.connect();
  }

  requestGameFocus();
}

network.on('connected', () => {
  debugLog('Connected to game server!');
  hud.updateNetworkStatus(`已连接 ${network.getServerUrl()}`);
  if (currentMode !== 'multiplayer') {
    network.send({ type: 'joinLobby' });
    return;
  }
  joinMultiplayerAfterConnection();
});

function joinMultiplayerAfterConnection(): void {
  if (pendingRoomId) {
    currentPlayerName = mainMenu.getPlayerName();
    network.send(pendingSpectator
      ? { type: 'spectateRoom', roomId: pendingRoomId }
      : { type: 'joinRoom', roomId: pendingRoomId, playerName: currentPlayerName });
    return;
  }
  const savedSession = loadMultiplayerSession();
  if (savedSession?.mode === desiredMultiplayerMode && savedSession.mapId === selectedMapId) {
    network.send({ type: 'resumeSession', roomId: savedSession.roomId, playerId: savedSession.playerId, sessionId: savedSession.sessionId });
    return;
  }
  joinOrCreateCurrentRoom();
}

network.on('reconnecting', () => {
  hud.updateNetworkStatus('重连中...');
  hud.showNotification('网络波动，正在尝试重连');
});

network.on('reconnected', () => {
  hud.updateNetworkStatus(`已重连 ${network.getServerUrl()}`);
  hud.showNotification('重连成功');
});

network.on('disconnected', () => {
  hud.updateNetworkStatus('连接已断开');
});

network.on('protocolMismatch', (data) => {
  hud.updateNetworkStatus('版本不兼容');
  hud.showNotification(`客户端协议 ${data.expected} 与服务器 ${data.actual} 不兼容`);
  if (gameRunning && currentMode === 'multiplayer') {
    pauseGame();
  }
});

network.on('latency', (data) => {
  networkLatencyMs = data.latencyMs;
});

network.on('roomList', (data) => {
  debugLog('Available rooms:', data.rooms);
  mainMenu.updateRooms(data.rooms);
});

network.on('roomCreated', (data) => {
  currentPlayerName = currentPlayerName || createPlayerName();
  network.send({ type: 'joinRoom', roomId: data.roomId, playerName: currentPlayerName });
});

network.on('roomJoined', (data) => {
  localPlayerId = data.playerId;
  isSpectating = Boolean(data.spectator);
  currentSnapshot = data.snapshot ?? null;
  if (data.sessionId && !isSpectating) saveMultiplayerSession({
    roomId: data.roomId,
    playerId: data.playerId,
    sessionId: data.sessionId,
    mode: desiredMultiplayerMode,
    mapId: data.snapshot?.config.mapId ?? selectedMapId,
    playerName: currentPlayerName || loadMultiplayerSession()?.playerName || createPlayerName()
  });
  if (data.snapshot) {
    const mpMapName = MULTIPLAYER_MAPS[data.snapshot.config.mapId]?.name ?? data.snapshot.config.mapId;
    hud.showMapLoading(mpMapName);
    scene.setArena(data.snapshot.config.mapId);
    hud.hideMapLoading();
    syncArenaPhysics();
    const localSnapshot = data.snapshot.players.find(snapshotPlayer => snapshotPlayer.id === data.playerId);
    if (player && localSnapshot) player.setPosition(new THREE.Vector3(localSnapshot.position.x, localSnapshot.position.y, localSnapshot.position.z));
    hud.updateRoomPlayers(data.snapshot.players.length, data.snapshot.config.maxPlayers);
  }
  if (!isSpectating) network.send({ type: 'setReady', ready: true });
  hud.showNotification(isSpectating ? '已进入观战' : data.resumed ? '已回到上一局' : `${desiredMultiplayerMode === 'tdm' ? '团队死斗' : '爆破'} 房间已就绪`);
});

network.on('roomState', (data) => {
  applyMatchSnapshot(data.snapshot);
});

network.on('matchSnapshot', (data) => {
  applyMatchSnapshot(data.snapshot);
});

network.on('roomError', (data) => {
  hud.updateNetworkStatus('连接异常');
  hud.showNotification(data.message);
  if (data.code === 'resumeFailed') {
    clearMultiplayerSession();
    joinOrCreateCurrentRoom();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (inputMode === 'playing' || inputMode === 'scoreboard') {
      pauseGame();
    } else if (inputMode === 'paused' || inputMode === 'buyMenu' || inputMode === 'gameOver') {
      hud.showLeaveConfirm(() => endGame());
    }
    return;
  }
  if (!gameRunning) return;
  if (inputMode === 'paused' || inputMode === 'gameOver') return;
  if (isSpectating && e.key !== 'Tab') return;

  if (e.key === '1') {
    usingGrenade = false;
    if (equippedPrimary) {
      activeSlot = 'primary';
      weaponManager.switchWeapon(equippedPrimary);
    } else {
      hud.showNotification('尚未购买主武器');
      return;
    }
  }
  if (e.key === '2') { usingGrenade = false; activeSlot = 'pistol'; weaponManager.switchWeapon(equippedPistol); }
  if (e.key === '3') { usingGrenade = false; activeSlot = 'knife'; weaponManager.switchWeapon('knife'); }
  if (e.key === '4') {
    usingGrenade = true;
    activeSlot = 'grenade';
    const selected = grenades.cycle();
    hud.showNotification(`已选择${grenades.getSelectedLabel()}`);
    hud.updateGrenade(grenades.getSelectedLabel(), grenades.getInventory()[selected]);
    syncWeaponHud();
  }
  if (e.key === 'r' || e.key === 'R') {
    weaponManager.startReload();
    hud.setScoped(false);
    if (currentMode === 'multiplayer') network.send({ type: 'reload' });
  }

  if (['1', '2', '3'].includes(e.key)) {
    hud.updateWeapon(weaponManager.getCurrentWeapon());
    syncWeaponHud();
    if (currentMode === 'multiplayer') network.send({ type: 'switchWeapon', weaponId: currentMultiplayerWeaponId() });
  }

  if (e.key === 'b' || e.key === 'B') {
    if (inputMode === 'buyMenu') closeBuyMenu(false);
    else openBuyMenu();
  }
  if (e.key === 'Tab') {
    e.preventDefault();
    if (inputMode === 'playing') {
      updateScoreboardPanel();
      setInputMode('scoreboard');
      hud.toggleScoreboard(true);
    }
  }
  if (e.key === 'e' || e.key === 'E') {
    if (nearbyDrop) {
      equipPickedWeapon(droppedWeapons.pickup(nearbyDrop));
      nearbyDrop = null;
      return;
    }
    const site = nearestBombSite();
    if (!isSpectating) {
      if (currentSnapshot?.bomb?.plantedAt) network.send({ type: 'defuseBomb' });
      else network.send({ type: 'plantBomb', request: { site } });
    }
  }

});

document.addEventListener('keyup', (e) => {
  if (e.key === 'Tab' && inputMode === 'scoreboard') {
    hud.toggleScoreboard(false);
    setInputMode('playing');
  }
});

document.addEventListener('click', () => {
  if (gameRunning && inputMode === 'playing' && !input.isPointerLocked() && !input.isTouchControlsActive()) {
    requestGameFocus();
  }
});

document.addEventListener('pointerlockchange', () => {
  if (input.isPointerLocked()) {
    hadPointerLock = true;
    pointerLockState = 'locked';
    lockFailureReason = null;
    hud.hidePointerLockGuide();
    return;
  }
  if (gameRunning && inputMode === 'playing' && hadPointerLock && !input.isTouchControlsActive()) {
    hadPointerLock = false;
    pauseGame();
  }
  if (gameRunning && input.wasPointerLockDenied()) {
    pointerLockState = 'denied';
    lockFailureReason = '浏览器没有允许鼠标锁定';
    hud.showPointerLockGuide();
  }
});

function endGame(): void {
  gameRunning = false;
  input.exitPointerLock();
  weaponManager.setAiming(false);
  hud.setScoped(false);
  hud.hide();
  mainMenu.show();
  setInputMode('menu');
  enemyManager.clear();
  remotePlayers.clear();
  network.send({ type: 'leaveRoom' });
  network.disconnect();
  clearMultiplayerSession();
  hud.updateNetworkStatus('离线');
  hud.updateRoomPlayers(0, 0);
  currentSnapshot = null;
  localPlayerId = undefined;
  pendingRoomId = null;
  pendingSpectator = false;
  isSpectating = false;
  currentMode = null;
  usingGrenade = false;
  activeSlot = 'pistol';
  droppedWeapons.clear();
  nearbyDrop = null;
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
  handleVirtualActions();

  if (player && !isSpectating && canMove(inputMode) && hasGameplayFocus()) {
    player.update(dt);
    audioFeedback.playFootstep({
      moving: player.isMoving(),
      walking: input.isKeyPressed('ShiftLeft') || input.isKeyPressed('ShiftRight'),
      crouched: player.isCrouched(),
      grounded: player.isGrounded()
    }, now);
    if (!wasGrounded && player.isGrounded()) audioFeedback.playLand(player.getLastLandingSpeed());
    wasGrounded = player.isGrounded();
  } else {
    input.getMouseDelta();
  }
  physics.step(dt);
  weaponManager.update(now, dt, player?.isMoving() ?? false);
  weaponManager.consumeFeedbackEvents().forEach(event => {
    audioFeedback.playWeapon(event.type, event.weaponId);
  });

  const playerPos = player?.getPosition() || new THREE.Vector3(0, 0, 0);
  updateRadarPanel();
  updateWeaponAimState();
  updateAimFov(dt);
  nearbyDrop = player ? droppedWeapons.update(playerPos) : null;
  if (nearbyDrop) {
    hud.showNotification(`按 E 拾取 ${weaponDisplayName(nearbyDrop.weaponId)}`, 450);
  }
  const enemyDamage = enemyManager.update(dt, playerPos, now);
  if (enemyDamage > 0 && player) {
    player.takeDamage(enemyDamage, 'chest', 0.28);
    hud.updateHealth(player.getHealth(), player.getMaxHealth(), player.getArmor());
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
    hud.updateMatch(currentSnapshot, localPlayerId, {
      latencyMs: networkLatencyMs,
      inputStatus: getMouseInputStatus()
    });
    if (player && !isSpectating && now - lastNetworkInputAt > 50) {
      lastNetworkInputAt = now;
      const rotation = player.getRotation();
      const wishdir = getWishdir();
      const buttons = getInputButtons();
      const cmd = prediction.generateInput(wishdir, buttons, rotation.yaw, rotation.pitch);
      network.send({
        type: 'playerInput',
        input: {
          position: vectorToPlain(player.getPosition()),
          rotation: { x: rotation.pitch, y: rotation.yaw, z: 0 },
          seq: cmd.seq,
          timestamp: cmd.timestamp,
          wishdir: cmd.wishdir,
          buttons: cmd.buttons
        }
      });
    }
  }

  const currentWeapon = weaponManager.getCurrentWeapon();
  hud.updateAmmo(currentWeapon.currentAmmo, currentWeapon.magazineSize, currentWeapon.currentReserveAmmo);
  hud.updateReloadProgress(currentWeapon.getReloadProgress());
  hud.updateCrosshair(currentWeapon.getEffectiveSpread(player?.isMoving() ?? false, weaponManager.isAiming()));
  hud.updateGrenade(grenades.getSelectedLabel(), grenades.getInventory()[grenades.getSelected()]);
  syncWeaponHud();

  const grenadeResult = grenades.update(dt, playerPos);
  if (grenadeResult.damage > 0 && player) {
    player.takeDamage(grenadeResult.damage, 'chest', 0.15);
    hud.updateHealth(player.getHealth(), player.getMaxHealth(), player.getArmor());
    hud.showDamage();
  }

  if (!isSpectating && canShoot(inputMode) && hasGameplayFocus() && usingGrenade && input.isKeyPressed('MouseRight') && player) {
    input.setKeyPressed('MouseRight', false);
    const result = grenades.throwSelected(scene.getCamera(), 'light');
    if (result.success) {
      hud.showNotification(`轻抛${grenades.getSelectedLabel()}`);
      if (currentMode === 'multiplayer' && result.origin && result.velocity) {
        network.send({ type: 'grenadeThrow', request: {
          type: mapGrenadeId(grenades.getSelected()),
          origin: vectorToPlain(result.origin),
          velocity: vectorToPlain(result.velocity),
          clientTime: now
        }});
      }
    } else {
      hud.showNotification(`${grenades.getSelectedLabel()}已用完`);
    }
    syncWeaponHud();
  }

  if (!isSpectating && canShoot(inputMode) && hasGameplayFocus() && !usingGrenade && input.isKeyPressed('MouseRight') && weaponManager.getCurrentWeapon().isMelee && player) {
    input.setKeyPressed('MouseRight', false);
    const result = weaponManager.shoot(scene.getCamera(), now, { heavyMelee: true });
    if (result) applyLocalWeaponHit(result);
  }

  if (!isSpectating && canShoot(inputMode) && hasGameplayFocus() && input.isKeyPressed('MouseLeft') && player) {
    if (usingGrenade) {
      input.setKeyPressed('MouseLeft', false);
      const result = grenades.throwSelected(scene.getCamera(), 'full');
      if (result.success) {
        hud.showNotification(`投掷${grenades.getSelectedLabel()}`);
        if (currentMode === 'multiplayer' && result.origin && result.velocity) {
          network.send({ type: 'grenadeThrow', request: {
            type: mapGrenadeId(grenades.getSelected()),
            origin: vectorToPlain(result.origin),
            velocity: vectorToPlain(result.velocity),
            clientTime: now
          }});
        }
      } else {
        hud.showNotification(`${grenades.getSelectedLabel()}已用完`);
      }
      syncWeaponHud();
    } else {
      const result = weaponManager.shoot(scene.getCamera(), now, { isMoving: player.isMoving() });
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
      const hitscanResult = result.isMelee ? { hit: false } : projectileSystem.fireHitscan(result.origin, result.direction, result.damage);

      if (hitscanResult.hit) {
        hud.showHitMarker();
      }

      applyLocalWeaponHit(result);
      if (weaponManager.isScoped()) {
        weaponManager.setAiming(false);
        hud.setScoped(false);
      }
    }
    }
  }

  scene.render();
  requestAnimationFrame(gameLoop);
}

gameLoop(performance.now());

export { scene, physics, input, player, weaponManager, projectileSystem, network, enemyManager, hud, mainMenu };

function handleVirtualActions(): void {
  if (!input.isTouchControlsActive() || !gameRunning || inputMode === 'paused' || inputMode === 'gameOver') return;
  if (isSpectating) return;

  if (input.consumeKeyPress('Digit1')) {
    usingGrenade = false;
    if (equippedPrimary) {
      activeSlot = 'primary';
      weaponManager.switchWeapon(equippedPrimary);
      syncSwitchedWeapon();
    } else {
      hud.showNotification('尚未购买主武器');
    }
  }
  if (input.consumeKeyPress('Digit2')) {
    usingGrenade = false;
    activeSlot = 'pistol';
    weaponManager.switchWeapon(equippedPistol);
    syncSwitchedWeapon();
  }
  if (input.consumeKeyPress('Digit3')) {
    usingGrenade = false;
    activeSlot = 'knife';
    weaponManager.switchWeapon('knife');
    syncSwitchedWeapon();
  }
  if (input.consumeKeyPress('Digit4')) {
    usingGrenade = true;
    activeSlot = 'grenade';
    const selected = grenades.cycle();
    hud.showNotification(`已选择${grenades.getSelectedLabel()}`);
    hud.updateGrenade(grenades.getSelectedLabel(), grenades.getInventory()[selected]);
    syncWeaponHud();
  }
  if (input.consumeKeyPress('KeyR')) {
    weaponManager.startReload();
    hud.setScoped(false);
    if (currentMode === 'multiplayer') network.send({ type: 'reload' });
  }
  if (input.consumeKeyPress('KeyB')) {
    if (inputMode === 'buyMenu') closeBuyMenu(false);
    else openBuyMenu();
  }
  if (input.consumeKeyPress('KeyE') && inputMode === 'playing') {
    if (nearbyDrop) {
      equipPickedWeapon(droppedWeapons.pickup(nearbyDrop));
      nearbyDrop = null;
      return;
    }
    const site = nearestBombSite();
    if (currentSnapshot?.bomb?.plantedAt) network.send({ type: 'defuseBomb' });
    else network.send({ type: 'plantBomb', request: { site } });
  }
}

function syncSwitchedWeapon(): void {
  hud.updateWeapon(weaponManager.getCurrentWeapon());
  syncWeaponHud();
  if (currentMode === 'multiplayer') network.send({ type: 'switchWeapon', weaponId: currentMultiplayerWeaponId() });
}

function setInputMode(mode: InputMode): void {
  inputMode = mode;
}

function joinOrCreateCurrentRoom(): void {
  currentPlayerName = loadMultiplayerSession()?.playerName ?? (currentPlayerName || mainMenu.getPlayerName() || createPlayerName());
  network.send({
    type: 'joinOrCreateRoom',
    mode: desiredMultiplayerMode,
    playerName: currentPlayerName,
    mapId: selectedMapId,
    startingMoney: settings.getSettings().startingMoney
  });
}

function createPlayerName(): string {
  return `Player-${Math.floor(Math.random() * 1000)}`;
}

function loadMultiplayerSession(): SavedMultiplayerSession | null {
  try {
    const raw = window.localStorage.getItem(multiplayerSessionStorageKey);
    return raw ? JSON.parse(raw) as SavedMultiplayerSession : null;
  } catch {
    return null;
  }
}

function saveMultiplayerSession(session: SavedMultiplayerSession): void {
  try {
    window.localStorage.setItem(multiplayerSessionStorageKey, JSON.stringify(session));
  } catch {
    // Storage can be unavailable in private browsing; gameplay should continue without resume.
  }
}

function clearMultiplayerSession(): void {
  try {
    window.localStorage.removeItem(multiplayerSessionStorageKey);
  } catch {
    // Ignore storage failures; explicit leave already told the server to remove the player.
  }
}

function requestGameFocus(): void {
  hud.hidePause();
  hud.hidePointerLockGuide();
  hud.toggleBuyMenu(false);
  input.clearActionKeys();
  setInputMode('playing');
  if (input.isTouchControlsActive()) {
    pointerLockState = 'focusedNoLock';
    lockFailureReason = null;
    return;
  }
  void input.requestPointerLock().then((locked) => {
    pointerLockState = locked ? 'locked' : input.wasPointerLockDenied() ? 'denied' : 'supported';
    lockFailureReason = locked ? null : '浏览器没有允许鼠标锁定';
    if (!locked) {
      input.clearActionKeys();
      hud.showPointerLockGuide();
      hud.showNotification('请点击锁定鼠标后再开始战斗', 1600);
    }
  });
}

function hasGameplayFocus(): boolean {
  return input.isPointerLocked() || input.isTouchControlsActive() || (allowDebugPointerLockBypass && debugPointerLockBypass);
}

function pauseGame(): void {
  if (!gameRunning) return;
  hadPointerLock = false;
  pointerLockState = input.wasPointerLockDenied() ? 'denied' : 'supported';
  lockFailureReason = null;
  setInputMode('paused');
  input.exitPointerLock();
  weaponManager.setAiming(false);
  hud.setScoped(false);
  hud.toggleBuyMenu(false);
  hud.toggleScoreboard(false);
  hud.hidePointerLockGuide();
  hud.showPause();
}

function resumeGame(): void {
  if (!gameRunning) return;
  hud.hideLeaveConfirm();
  requestGameFocus();
}

function openBuyMenu(): void {
  if (!gameRunning) return;
  setInputMode('buyMenu');
  input.exitPointerLock();
  weaponManager.setAiming(false);
  hud.setScoped(false);
  const disabledReason = currentMode === 'multiplayer' && currentSnapshot?.config.mode === 'defusal' && currentSnapshot.phase !== 'buy'
    ? '只能在购买阶段购买'
    : undefined;
  hud.toggleBuyMenu(true, { solo: currentMode === 'solo', disabledReason });
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
  hud.updateRoomPlayers(snapshot.players.length, snapshot.config.maxPlayers);
  remotePlayers.update(snapshot, localPlayerId);
  hud.updateMatch(snapshot, localPlayerId, {
    latencyMs: networkLatencyMs,
    inputStatus: getMouseInputStatus()
  });
  // Acknowledge processed inputs for client prediction
  const localSnap = snapshot.players.find(p => p.id === localPlayerId);
  if (localSnap?.lastProcessedSeq !== undefined) {
    prediction.acknowledge(localSnap.lastProcessedSeq);
  }
  if (localSnap) syncLocalLoadoutFromSnapshot(localSnap);
  // Handle server-authoritative flash effect
  const flashIntensity = localSnap?.flashIntensity ?? 0;
  if (flashIntensity > 0 && hud) {
    hud.setFlashOverlay(flashIntensity);
  }
  if (snapshot.phase === 'matchEnd' && snapshot.summary) {
    hud.showMatchSummary(snapshot, localPlayerId);
    setInputMode('gameOver');
  }
}

function getMouseInputStatus(): string {
  const pointer = input.getPointerLockInfo();
  if (pointer.rawMouseInput) return 'Raw';
  if (pointer.locked) return 'Locked';
  return 'Fallback';
}

function vectorToPlain(vector: THREE.Vector3) {
  return { x: vector.x, y: vector.y, z: vector.z };
}

function updateAimFov(dt: number): void {
  const camera = scene.getCamera();
  const targetFov = weaponManager.isScoped() ? 40 : 82;
  camera.fov = THREE.MathUtils.lerp(camera.fov, targetFov, Math.min(1, dt * 14));
  camera.updateProjectionMatrix();
}

function updateWeaponAimState(): void {
  const canUseWeapon = canShoot(inputMode) && hasGameplayFocus() && !usingGrenade && !weaponManager.getCurrentWeapon().isMelee;
  if (!canUseWeapon) {
    weaponManager.setAiming(false);
    hud.setScoped(false);
    return;
  }
  if (input.isKeyPressed('MouseRight')) {
    input.setKeyPressed('MouseRight', false);
    weaponManager.setAiming(!weaponManager.isScoped());
  }
  hud.setScoped(weaponManager.isScoped());
}

function applyLocalWeaponHit(result: ShootResult): void {
  const weapon = weaponManager.getCurrentWeapon();
  if (result.isMelee) {
    const target = findMeleeTarget(result.origin, result.direction, weapon.range);
    if (!target) return;
    const damage = calculateDamage(
      { ...weapon.getDamageProfile(), baseDamage: result.damage },
      target.region,
      0
    ).healthDamage;
    target.enemy.takeDamage(damage, target.region);
    lastHitRegion = target.region;
    hud.showHitMarker();
    if (target.enemy.isDead()) {
      hud.showKillFeedEntry(`你 ${weapon.displayName}${target.region === 'head' ? ' 爆头' : ''} NPC`);
      audioFeedback.playKill();
    }
    audioFeedback.playHit(target.region);
    hud.showNotification(result.heavyMelee ? `重击命中 ${regionLabel(target.region)}` : `挥刀命中 ${regionLabel(target.region)}`, 650);
    return;
  }

  const shots = weapon.pellets > 1 ? weapon.pellets : 1;
  for (let i = 0; i < shots; i++) {
    const pelletDirection = shots === 1 ? result.direction : spreadDirection(result.direction, weapon.spread * 0.75);
    const target = findClosestRayTarget(result.origin, pelletDirection, weapon.range);
    if (!target) continue;
    const damage = calculateDamage(weapon.getDamageProfile(), target.region, 0).healthDamage;
    target.enemy.takeDamage(damage, target.region);
    lastHitRegion = target.region;
    hud.showHitMarker();
    if (target.enemy.isDead()) {
      hud.showKillFeedEntry(`你 ${weapon.displayName}${target.region === 'head' ? ' 爆头' : ''} NPC`);
      audioFeedback.playKill();
    }
    audioFeedback.playHit(target.region);
    if (target.region === 'head') hud.showNotification('爆头命中', 650);
  }
}

function findClosestRayTarget(origin: THREE.Vector3, direction: THREE.Vector3, range: number) {
  let best: { enemy: Enemy; region: HitRegion; distance: number } | null = null;
  for (const enemy of enemyManager.getAllEnemies()) {
    const hit = enemy.getRayHit(origin, direction, range);
    if (!hit) continue;
    if (!best || hit.distance < best.distance) {
      best = { enemy, region: hit.region, distance: hit.distance };
    }
  }
  return best;
}

function findMeleeTarget(origin: THREE.Vector3, direction: THREE.Vector3, range: number) {
  let best: { enemy: Enemy; region: HitRegion; distance: number } | null = null;
  for (const enemy of enemyManager.getAllEnemies()) {
    if (enemy.isDead()) continue;
    const toEnemy = enemy.getPosition().add(new THREE.Vector3(0, 1.25, 0)).sub(origin);
    const distance = toEnemy.length();
    if (distance > range) continue;
    const dot = direction.clone().normalize().dot(toEnemy.clone().normalize());
    if (dot < 0.62) continue;
    if (!best || distance < best.distance) {
      best = { enemy, region: 'chest', distance };
    }
  }
  return best;
}

function spreadDirection(direction: THREE.Vector3, spread: number): THREE.Vector3 {
  return direction.clone()
    .add(new THREE.Vector3((Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread, (Math.random() - 0.5) * spread))
    .normalize();
}

function regionLabel(region: HitRegion): string {
  const labels: Record<HitRegion, string> = {
    head: '头部',
    chest: '胸部',
    stomach: '腹部',
    arm: '手臂',
    leg: '腿部'
  };
  return labels[region];
}

function currentMultiplayerWeaponId(): WeaponId {
  const current = weaponManager.getCurrentWeaponId();
  if (current in WEAPON_DEFINITIONS) return current as WeaponId;
  switch (current) {
    case 'pistol':
      return 'sidearm';
    case 'heavy_pistol':
      return 'heavy_pistol';
    case 'shotgun':
      return 'bulldog';
    case 'sniper':
      return 'operator';
    case 'smg':
      return 'specter';
    case 'knife':
      return 'knife';
    case 'defender_rifle':
      return 'sentinel';
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
  pointerLockState,
  pointerLockRequired,
  lockFailureReason,
  canShoot: canShoot(inputMode) && hasGameplayFocus(),
  activePanel: hud.isBuyMenuOpen() ? 'buyMenu' : hud.isScoreboardOpen() ? 'scoreboard' : inputMode === 'paused' ? 'pause' : lockFailureReason ? 'pointerLockGuide' : 'none',
  isBuyMenuOpen: hud.isBuyMenuOpen(),
  isScoreboardOpen: hud.isScoreboardOpen(),
  pointerLocked: input.isPointerLocked(),
  horizontalSpeed: player?.getHorizontalSpeed() ?? 0,
  grounded: player?.isGrounded() ?? false,
  airborneTime: player?.getAirborneTime() ?? 0,
  crouched: player?.isCrouched() ?? false,
  crouchJumping: player?.isCrouchJumping() ?? false,
  collisionHeight: player?.getCollisionHeight() ?? 0,
  mapBounds: scene.getCurrentArena().bounds,
  weaponId: usingGrenade ? 'grenade' : weaponManager.getCurrentWeaponId(),
  assetSource: usingGrenade ? 'fallback' : weaponManager.getCurrentAssetSource(),
  enemyAssetSources: enemyManager.getAllEnemies().map(enemy => enemy.getAssetSource()),
  activeSlot,
  ammo: weaponManager.getCurrentWeapon().currentAmmo,
  reserveAmmo: weaponManager.getCurrentWeapon().currentReserveAmmo,
  armor: player?.getArmor() ?? 0,
  aiming: weaponManager.isAiming(),
  nearbyPickup: nearbyDrop?.weaponId ?? null,
  lastHitRegion,
  grenadeId: grenades.getSelected(),
  grenadeInventory: grenades.getInventory(),
  keys: input.getPressedKeys(),
  mousePlatform: input.getMousePlatform(),
  rawMouseInput: input.getPointerLockInfo().rawMouseInput,
  mouseSensitivity: input.getMouseSettings().baseSensitivity * input.getMouseSettings().platformScale
});

if (allowDebugPointerLockBypass) {
  window.__debugAllowPointerLockBypassForTests = () => {
    debugPointerLockBypass = true;
    pointerLockState = 'locked';
    lockFailureReason = null;
    hud.hidePointerLockGuide();
  };
}

function switchLocalWeaponFromBuy(weaponId: WeaponId): void {
  usingGrenade = false;
  const localWeapon = multiplayerWeaponToLocal(weaponId);
  dropReplacedWeapon(localWeapon);
  if (localWeapon === 'knife') {
    activeSlot = 'knife';
  } else if (isPistolWeapon(localWeapon)) {
    equippedPistol = localWeapon;
    activeSlot = 'pistol';
  } else {
    equippedPrimary = localWeapon;
    activeSlot = 'primary';
  }
  weaponManager.switchWeapon(localWeapon);
  hud.updateWeapon(weaponManager.getCurrentWeapon());
  syncWeaponHud();
}

function applySoloBuy(request: BuyRequest): void {
  if (request.armor) {
    player?.buyArmor();
    if (player) hud.updateHealth(player.getHealth(), player.getMaxHealth(), player.getArmor());
    hud.showNotification('已购买防弹衣');
    return;
  }
  if (request.weaponId) switchLocalWeaponFromBuy(request.weaponId);
}

function debugLog(...args: unknown[]): void {
  if ((import.meta as { env?: { DEV?: boolean } }).env?.DEV) console.log(...args);
}

function equipPickedWeapon(localWeapon: string): void {
  dropReplacedWeapon(localWeapon);
  usingGrenade = false;
  if (isPistolWeapon(localWeapon)) {
    equippedPistol = localWeapon;
    activeSlot = 'pistol';
  } else {
    equippedPrimary = localWeapon;
    activeSlot = 'primary';
  }
  weaponManager.switchWeapon(localWeapon);
  hud.updateWeapon(weaponManager.getCurrentWeapon());
  syncWeaponHud();
  hud.showNotification(`已拾取 ${weaponDisplayName(localWeapon)}`);
}

function dropReplacedWeapon(nextWeapon: string): void {
  if (!player || nextWeapon === 'knife') return;
  const replaced = isPistolWeapon(nextWeapon) ? equippedPistol : equippedPrimary;
  if (replaced && replaced !== nextWeapon && replaced !== 'knife') {
    droppedWeapons.dropWeapon(replaced, player.getPosition());
  }
}

function updateScoreboardPanel(): void {
  if (currentMode === 'solo') {
    hud.updateSurvivalScoreboard(survival.getStats(performance.now()));
  } else if (currentSnapshot) {
    hud.updateMatch(currentSnapshot, localPlayerId, {
      latencyMs: networkLatencyMs,
      inputStatus: getMouseInputStatus()
    });
  }
}

function syncWeaponHud(): void {
  hud.setScoped(weaponManager.isScoped());
  hud.updateWeaponSlots({
    activeSlot,
    primary: equippedPrimary ? weaponDisplayName(equippedPrimary) : '—',
    pistol: weaponDisplayName(equippedPistol),
    knife: '战术刀',
    grenadeLabel: grenades.getSelectedLabel(),
    grenadeCount: grenades.getInventory()[grenades.getSelected()]
  });
}

function weaponDisplayName(localWeaponId: string): string {
  const weapon = WEAPON_DEFINITIONS[localWeaponId];
  if (weapon) return weapon.displayName;
  const labels: Record<string, string> = {
    rifle: '突击步枪',
    defender_rifle: '防守步枪',
    sniper: '狙击枪',
    smg: '冲锋枪',
    shotgun: '散弹枪',
    pistol: '制式手枪',
    heavy_pistol: '重型手枪',
    knife: '战术刀'
  };
  return labels[localWeaponId] ?? localWeaponId;
}

function multiplayerWeaponToLocal(weaponId: WeaponId): string {
  return weaponId;
}

function syncLocalLoadoutFromSnapshot(snapshot: PlayerSnapshot): void {
  const owned = snapshot.ownedWeapons ?? [snapshot.weaponId, 'knife'];
  const teamDefaultPistol = snapshot.team === 'defenders' ? 'usp_s' : 'pistol';
  const pistol = owned.find(isPistolWeapon) ?? (isPistolWeapon(snapshot.weaponId) ? snapshot.weaponId : teamDefaultPistol);
  const primary = owned.find(weaponId => !isPistolWeapon(weaponId) && weaponId !== 'knife') ?? '';
  equippedPistol = multiplayerWeaponToLocal(pistol);
  equippedPrimary = primary ? multiplayerWeaponToLocal(primary) : '';

  if (snapshot.weaponId === 'knife') activeSlot = 'knife';
  else if (isPistolWeapon(snapshot.weaponId)) activeSlot = 'pistol';
  else activeSlot = 'primary';

  usingGrenade = false;
  const localWeapon = multiplayerWeaponToLocal(snapshot.weaponId);
  if (weaponManager.getCurrentWeaponId() !== localWeapon) weaponManager.switchWeapon(localWeapon);
  hud.updateWeapon(weaponManager.getCurrentWeapon());
  syncWeaponHud();
}

function isPistolWeapon(weaponId: string): weaponId is WeaponId {
  return ['pistol', 'usp_s', 'p2000', 'p250', 'five_seven', 'deagle', 'dual_berettas', 'r8', 'cz75', 'tec9', 'sidearm', 'heavy_pistol'].includes(weaponId);
}

function updateRadarPanel(): void {
  if (!player) return;
  const arenaBounds = scene.getCurrentArena().bounds;
  const mapBounds = {
    minX: -arenaBounds.width / 2,
    maxX: arenaBounds.width / 2,
    minZ: arenaBounds.centerZ - arenaBounds.depth / 2,
    maxZ: arenaBounds.centerZ + arenaBounds.depth / 2
  };
  const position = player.getPosition();
  const rotation = player.getRotation();

  const callouts = MULTIPLAYER_MAPS[selectedMapId]?.callouts ?? [];

  if (currentMode === 'multiplayer' && currentSnapshot) {
    hud.updateRadar(
      { x: position.x, z: position.z, rotY: rotation.yaw },
      currentSnapshot.players.map(snapshot => ({
        x: snapshot.position.x,
        z: snapshot.position.z,
        team: snapshot.team,
        isAlive: snapshot.isAlive,
        isLocal: snapshot.id === localPlayerId
      })),
      mapBounds,
      currentSnapshot.bomb?.position ? { x: currentSnapshot.bomb.position.x, z: currentSnapshot.bomb.position.z } : undefined,
      callouts
    );
    return;
  }

  hud.updateRadar(
    { x: position.x, z: position.z, rotY: rotation.yaw },
    enemyManager.getAllEnemies().map(enemy => {
      const enemyPosition = enemy.getPosition();
      return { x: enemyPosition.x, z: enemyPosition.z, team: 'attackers', isAlive: !enemy.isDead() };
    }),
    mapBounds,
    undefined,
    callouts
  );
}

function getWishdir(): { x: number; z: number } {
  if (!player) return { x: 0, z: 0 };
  const wish = new THREE.Vector3();
  const forward = new THREE.Vector3(0, 0, -1);
  const right = new THREE.Vector3(1, 0, 0);
  const yaw = player.getRotation().yaw;
  forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  right.applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
  if (input.isKeyPressed('KeyW')) wish.add(forward);
  if (input.isKeyPressed('KeyS')) wish.sub(forward);
  if (input.isKeyPressed('KeyA')) wish.sub(right);
  if (input.isKeyPressed('KeyD')) wish.add(right);
  if (wish.lengthSq() > 0) wish.normalize();
  return { x: wish.x, z: wish.z };
}

function getInputButtons(): number {
  let buttons = 0;
  if (input.isKeyPressed('Space')) buttons |= 1;
  if (input.isKeyPressed('ControlLeft') || input.isKeyPressed('ControlRight')) buttons |= 2;
  if (input.isKeyPressed('ShiftLeft') || input.isKeyPressed('ShiftRight')) buttons |= 4;
  return buttons;
}

function mapGrenadeId(clientId: string): 'he' | 'flashbang' | 'smoke' | 'incendiary' | 'decoy' {
  const mapping: Record<string, 'he' | 'flashbang' | 'smoke' | 'incendiary' | 'decoy'> = {
    'he': 'he',
    'flash': 'flashbang',
    'smoke': 'smoke',
    'incendiary': 'incendiary',
    'decoy': 'decoy'
  };
  return mapping[clientId] ?? 'he';
}

function applyCrosshairStyle(style: string, color: string): void {
  hud.setCrosshairStyle(style, color);
}
