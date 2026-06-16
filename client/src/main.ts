/// <reference types="vite/client" />
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Scene } from './game/Scene.js';
import { Physics } from './game/Physics.js';
import { InputManager } from './game/InputManager.js';
import { PlayerController } from './game/PlayerController.js';
import { ShootResult, WeaponManager } from './game/WeaponManager.js';
import { ProjectileSystem, RaycastResult } from './game/ProjectileSystem.js';
import { ImpactDecalManager } from './game/ImpactDecal.js';
import { TracerSystem } from './game/TracerSystem.js';
import { NetworkManager } from './network/NetworkManager.js';
import { EnemyManager } from './game/EnemyManager.js';
import { Enemy } from './game/Enemy.js';
import { RemotePlayers } from './game/RemotePlayers.js';
import { SurvivalMode } from './game/SurvivalMode.js';
import { GrenadeSystem } from './game/GrenadeSystem.js';
import { ShellCasingManager } from './game/ShellCasing.js';
import { ScreenShake } from './game/ScreenShake.js';
import { DroppedWeapon, DroppedWeaponSystem } from './game/DroppedWeaponSystem.js';
import { HitRegion, calculateDamage } from './game/Combat.js';
import { AudioFeedback } from './game/AudioFeedback.js';
import { AudioManager } from './game/AudioManager.js';
import { WEAPON_DEFINITIONS } from './game/Weapons.js';
import { Prediction } from './network/Prediction.js';
import { getInfernoSpawnForTeam, getDust2SpawnForTeam } from './game/MapData.js';
import type { BuyRequest, GrenadeThrowRequest, MapId, MatchMode, MatchSnapshot, PlayerSnapshot, Team, WeaponId } from './game/types.js';
import { InputMode, PointerLockState, canLook, canMove, canShoot } from './game/InputMode.js';
import { HUD } from './ui/HUD.js';
import { MainMenu } from './ui/MainMenu.js';
import { Settings } from './ui/Settings.js';
import { MULTIPLAYER_MAPS } from './game/config/maps.js';
import { Cs16BotMatch } from './game/Cs16BotMatch.js';
import { CS16_ALLOWED_WEAPON_IDS, canCs16WeaponScope } from './game/Cs16Weapons.js';
import { getDust2BotRoute } from './game/Dust2BotRoutes.js';
import './ui/style.css';

// 将服务端的增量补丁合并到本地的完整快照中
function mergeDelta(target: any, delta: any) {
  for (const key in delta) {
    if (delta[key] === null) {
      // 遇到 null：如果是对象键则删除，如果是数组元素则表示该索引处无变化
      if (!Array.isArray(target)) {
        delete target[key];
      }
    } else if (Array.isArray(delta[key])) {
      if (!target[key] || !Array.isArray(target[key])) {
        target[key] = delta[key];
      } else {
        // 遍历并合并不完整的稀疏数组
        for (let i = 0; i < delta[key].length; i++) {
          if (delta[key][i] !== null && delta[key][i] !== undefined) {
            if (typeof delta[key][i] === 'object' && !Array.isArray(delta[key][i])) {
              target[key][i] = target[key][i] || {};
              mergeDelta(target[key][i], delta[key][i]);
            } else {
              target[key][i] = delta[key][i];
            }
          }
        }
      }
    } else if (typeof delta[key] === 'object') {
      target[key] = target[key] || {};
      mergeDelta(target[key], delta[key]);
    } else {
      target[key] = delta[key];
    }
  }
}

declare global {
  interface Window {
    __debugPlayerPosition?: () => { x: number; y: number; z: number } | null;
    __debugSetPlayerPosition?: (x: number, z: number, yaw?: number, y?: number) => boolean;
    __debugSetCameraPoseForScreenshot?: (x: number, y: number, z: number, yaw: number, pitch?: number) => boolean;
    __debugSetArenaInspectionMode?: (enabled: boolean) => boolean;
    __debugSetViewModelVisible?: (visible: boolean) => boolean;
    __debugTakeScreenshot?: () => string | null;
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
      cs16BotMatch: ReturnType<Cs16BotMatch['getStats']> | null;
      botDebugStates: ReturnType<EnemyManager['getDebugStates']>;
    };
    __debugAllowPointerLockBypassForTests?: () => void;
    __debugSetPlayerYaw?: (yaw: number) => boolean;
    __debugSetKeyPressed?: (key: string, pressed: boolean) => void;
    __debugSetMouseDelta?: (x: number, y: number) => void;
  }
}

const physics = new Physics();
const scene = new Scene(physics);
const input = new InputManager();
const weaponManager = new WeaponManager();
const projectileSystem = new ProjectileSystem(scene.getScene(), physics);
const impactDecalManager = new ImpactDecalManager(scene.getScene());
const tracerSystem = new TracerSystem(scene.getScene());
const network = new NetworkManager();
const enemyManager = new EnemyManager(scene.getScene(), physics);
const survival = new SurvivalMode(enemyManager);
const grenades = new GrenadeSystem(scene.getScene());
const droppedWeapons = new DroppedWeaponSystem(scene.getScene());
const remotePlayers = new RemotePlayers(scene.getScene());
const hud = new HUD();
const mainMenu = new MainMenu();
const audioManager = new AudioManager();
const audioFeedback = new AudioFeedback(audioManager);
const settings = new Settings();
const prediction = new Prediction();
const shellCasingManager = new ShellCasingManager(scene.getScene());
const screenShake = new ScreenShake();

audioManager.init().then(() => {
  audioManager.loadFiles({
    pistol_fire: '/assets/audio/pistol_fire.ogg',
    heavy_pistol_fire: '/assets/audio/heavy_pistol_fire.ogg',
    rifle_fire: '/assets/audio/rifle_fire.ogg',
    smg_fire: '/assets/audio/smg_fire.ogg',
    shotgun_fire: '/assets/audio/shotgun_fire.ogg',
    sniper_fire: '/assets/audio/sniper_fire.ogg',
    knife_swing: '/assets/audio/knife_swing.ogg',
    weapon_reload: '/assets/audio/weapon_reload.ogg',
    weapon_empty: '/assets/audio/weapon_empty.ogg',
    weapon_switch: '/assets/audio/weapon_switch.ogg',
    hit_body: '/assets/audio/hit_body.ogg',
    hit_head: '/assets/audio/hit_head.ogg',
    kill: '/assets/audio/kill.ogg',
    footstep_concrete: '/assets/audio/footstep_concrete.ogg',
    footstep_sand: '/assets/audio/footstep_sand.ogg',
    footstep_metal: '/assets/audio/footstep_metal.ogg',
    footstep_wood: '/assets/audio/footstep_wood.ogg',
    land: '/assets/audio/land.ogg',
  });
});

let player: PlayerController | null = null;
let gameRunning = false;
let inputMode: InputMode = 'menu';
let pointerLockState: PointerLockState = 'supported';
const pointerLockRequired = true;
let lockFailureReason: string | null = null;
let debugPointerLockBypass = false;
let debugCameraPose: { x: number; y: number; z: number; yaw: number; pitch: number } | null = null;
let networkLatencyMs: number | null = null;
const allowDebugPointerLockBypass = typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
let currentMode: 'solo' | 'multiplayer' | null = null;
let desiredMultiplayerMode: MatchMode = 'tdm';
let desiredTeam: Team | undefined;
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
// 【新增】记录上一次使用的武器槽，默认开局是刀
let previousSlot: 'primary' | 'pistol' | 'knife' | 'grenade' = 'knife'; 
let equippedPrimary = '';
let equippedPistol = 'pistol';
let nearbyDrop: DroppedWeapon | null = null;
let lastHitRegion: HitRegion | null = null;
const recordedKills = new Set<string>();
let selectedMapId: MapId = 'dust2';
let arenaColliderBodies: CANNON.Body[] = [];
let wasGrounded = true;
let soloBotMatch: Cs16BotMatch | null = null;
let botRoundRespawnPending = false;
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
  const globalGroundY = scene.getCurrentArena().source?.sourceBacked ? -1.2 : 0;
  physics.setGlobalGroundEnabled(true, globalGroundY);
  const boxBodies = scene.getArenaColliders().map(collider => {
    const body = physics.addStaticBox(
      new CANNON.Vec3(collider.position.x, collider.position.y, collider.position.z),
      new CANNON.Vec3(collider.size.x / 2, collider.size.y / 2, collider.size.z / 2),
      collider.rotation,
      collider.name
    );
    return body;
  });
  const meshBodies = scene.getArenaMeshes().map(mesh => {
    const collisionPositions = mesh.collisionPositions ?? mesh.positions;
    const collisionIndices = mesh.collisionIndices ?? mesh.indices;
    const vertices = collisionPositions.flatMap(position => [position.x, position.y, position.z]);
    return physics.addStaticTrimesh(vertices, collisionIndices, mesh.name);
  });
  arenaColliderBodies = [...boxBodies, ...meshBodies];
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
  desiredTeam = mainMenu.getPreferredTeam();
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
  desiredTeam = mainMenu.getPreferredTeam();
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
  input.setMouseSettings({ baseSensitivity: 0.0035 * s.mouseSensitivity });
  applyCrosshairStyle(s.crosshairStyle, s.crosshairColor);
});

settings.onClose(() => {
  const s = settings.getSettings();
  input.setMouseSettings({ baseSensitivity: 0.0035 * s.mouseSensitivity });
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

hud.onLeaveRequest(() => {
  // Fix: Directly end game without confirmation dialog for smoother UX
  endGame();
});

function startMultiplayer(mode: MatchMode): void {
  desiredMultiplayerMode = mode;
  desiredTeam = mainMenu.getPreferredTeam();
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
  input.clearGameplayKeys();
  lastFrameTime = performance.now();
  wasGrounded = true;
  debugPointerLockBypass = false;
  currentMode = mode;
  isSpectating = false;
  selectedMapId = mainMenu.getMapId();
  const currentSettings = settings.getSettings();
  input.setMouseSettings({ baseSensitivity: 0.0035 * currentSettings.mouseSensitivity });
  applyCrosshairStyle(currentSettings.crosshairStyle, currentSettings.crosshairColor);
  const mapName = MULTIPLAYER_MAPS[selectedMapId]?.name ?? selectedMapId;
  hud.showMapLoading(mapName);
  scene.setArena(selectedMapId);
  hud.hideMapLoading();
  syncArenaPhysics();

  // 根据玩家选择的队伍决定出生点
  const arena = scene.getCurrentArena();
  let playerSpawn = arena.playerSpawn.clone();
  let enemySpawns = arena.enemySpawns;

  // desiredTeam 是 'attackers' | 'defenders' | undefined
  let teamPref: 't' | 'ct' | 'auto' = 'auto';
  if (desiredTeam === 'attackers') teamPref = 't';
  else if (desiredTeam === 'defenders') teamPref = 'ct';

  // 如果是 Inferno 或 Dust2 地图，根据队伍选择重新计算出生点
  const mapId = scene.getCurrentMapId();
  if (mapId === 'inferno') {
    const result = getInfernoSpawnForTeam(teamPref);
    playerSpawn = result.playerSpawn;
    enemySpawns = result.enemySpawns;
  } else if (mapId === 'dust2') {
    const result = getDust2SpawnForTeam(teamPref);
    playerSpawn = result.playerSpawn;
    enemySpawns = result.enemySpawns;
  }

  console.log(`[Main] Final spawn: map=${mapId}, team=${teamPref}, desiredTeam=${desiredTeam || 'undefined'}, x=${playerSpawn.x.toFixed(2)}, y=${playerSpawn.y.toFixed(2)}, z=${playerSpawn.z.toFixed(2)}`);

  usingGrenade = false;
  activeSlot = 'pistol';
  equippedPrimary = '';
  equippedPistol = selectedMapId === 'dust2' && mode === 'solo' ? 'pistol' : 'pistol';
  soloBotMatch = mode === 'solo' && selectedMapId === 'dust2' ? new Cs16BotMatch() : null;
  botRoundRespawnPending = false;
  recordedKills.clear();
  droppedWeapons.clear();
  nearbyDrop = null;
  lastHitRegion = null;

  // 【新增】打扫战场：清空上一局遗留的弹孔、弹壳和子弹轨迹
  impactDecalManager.clear();
  shellCasingManager.clear();
  tracerSystem.clear();

  player = new PlayerController(scene, physics, input, playerSpawn);
  player.setRotation(0, getDefaultSpawnYaw(mode === 'solo' ? 'attackers' : undefined));
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

  if (soloBotMatch) {
    restartSoloBotRound();
    hud.showNotification('Dust2 CS1.6 Bot Match 已开始');
  } else if (mode === 'solo') {
    survival.start(performance.now(), mainMenu.getDifficulty(), enemySpawns);
  } else {
    if (network.isConnected()) joinMultiplayerAfterConnection();
    else network.connect();
  }

  // Fix: Auto-enable debug bypass for localhost testing to avoid pointer lock issues
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    debugPointerLockBypass = true;
    console.log('[Debug] Localhost detected - enabling pointer lock bypass for testing');
  }

  requestGameFocus();
}

function isSoloBotMatch(): boolean {
  return Boolean(soloBotMatch && currentMode === 'solo' && selectedMapId === 'dust2');
}

function restartSoloBotRound(): void {
  if (!soloBotMatch || !player) return;
  soloBotMatch.startRound();
  enemyManager.clear();
  recordedKills.clear();
  droppedWeapons.clear();
  nearbyDrop = null;
  lastHitRegion = null;
  usingGrenade = false;
  activeSlot = 'pistol';
  previousSlot = 'knife';
  equippedPrimary = '';
  equippedPistol = 'pistol';
  player.setEyePositionForDebug(scene.getCurrentArena().playerSpawn.clone());
  player.setRotation(0, getDefaultSpawnYaw('attackers'));
  player.resetVelocity();
  player.healFull();
  weaponManager.switchWeapon(equippedPistol);
  grenades.reset();
  syncWeaponHud();
  hud.updateWeapon(weaponManager.getCurrentWeapon());
  hud.updateHealth(player.getHealth(), player.getMaxHealth(), player.getArmor());
  const botSpawns = scene.getCurrentArena().enemySpawns.map(spawn => spawn.position);
  soloBotMatch.createBotPlans(botSpawns, getDust2BotRoute).forEach(plan => {
    enemyManager.spawnEnemy({
      type: 'shooter',
      position: plan.position,
      health: 100,
      speed: 2.15,
      patrolPath: plan.route,
      botProfile: {
        weaponId: plan.weaponId,
        route: plan.route,
        viewRange: 34,
        attackRange: 31,
        damage: plan.weaponId === 'm4a4' ? 14 : plan.weaponId === 'mp5sd' ? 10 : 9,
        fireIntervalMs: plan.weaponId === 'usp_s' ? 620 : 420,
        accuracy: plan.weaponId === 'm4a4' ? 0.42 : 0.34,
      },
    });
  });
  hud.updateCs16BotMatch(soloBotMatch.getStats());
}

function updateSoloBotMatch(dt: number): void {
  if (!soloBotMatch) return;
  const result = soloBotMatch.update(dt, player?.isDead() ?? false);
  if (player?.isDead()) {
    soloBotMatch.recordPlayerDeath();
  }
  if (result.shouldRestartRound && !botRoundRespawnPending) {
    botRoundRespawnPending = true;
    window.setTimeout(() => {
      botRoundRespawnPending = false;
      if (gameRunning && isSoloBotMatch()) restartSoloBotRound();
    }, 0);
  }
  hud.updateCs16BotMatch(soloBotMatch.getStats());
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
      : { type: 'joinRoom', roomId: pendingRoomId, playerName: currentPlayerName, preferredTeam: desiredTeam });
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
  console.log('[Debug] roomJoined triggered', { spectator: data.spectator, gameRunning, inputMode });
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
    if (player && localSnapshot) {
      player.setPosition(new THREE.Vector3(localSnapshot.position.x, localSnapshot.position.y, localSnapshot.position.z));
      player.setRotation(localSnapshot.rotation.x, localSnapshot.rotation.y || getDefaultSpawnYaw(localSnapshot.team));
    }
    hud.updateRoomPlayers(data.snapshot.players.length, data.snapshot.config.maxPlayers);
  }
  if (!isSpectating) network.send({ type: 'setReady', ready: true });
  hud.showNotification(isSpectating ? '已进入观战' : data.resumed ? '已回到上一局' : `${desiredMultiplayerMode === 'tdm' ? '团队死斗' : '爆破'} 房间已就绪`);

  // Fix: Request pointer lock after room is joined (network is now connected)
  if (!isSpectating && gameRunning && inputMode === 'playing') {
    console.log('[Debug] Requesting pointer lock from roomJoined');
    requestGameFocus();
  }
});

network.on('roomState', (data) => {
  applyMatchSnapshot(data.snapshot);
});

(network as any).on('matchDelta', (payload: { isDelta: boolean; data: any }) => {
  if (!payload.isDelta) {
    // 如果收到的是全量包（刚进房间的第一帧），直接覆盖
    currentSnapshot = payload.data;
  } else {
    // 如果收到的是增量包，需要先和本地上一次的数据合并
    if (!currentSnapshot) return; 
    mergeDelta(currentSnapshot, payload.data);
  }
  
  // 添加非空判断，防止 TypeScript 报错
  if (currentSnapshot) {
    applyMatchSnapshot(currentSnapshot);
  }
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
      // Fix: In multiplayer mode, pressing ESC once should end the game directly
      // to avoid pointer lock issues in browser security model
      if (currentMode === 'multiplayer') {
        endGame();
      } else {
        pauseGame();
      }
    } else if (inputMode === 'paused' || inputMode === 'buyMenu' || inputMode === 'gameOver') {
      // Directly end game without second confirmation popup
      endGame();
    }
    return;
  }
  if (!gameRunning) return;
  if (inputMode === 'paused' || inputMode === 'gameOver') return;
  if (isSpectating && e.key !== 'Tab') return;

  if (e.key === '1') {
    if (equippedPrimary && activeSlot !== 'primary') previousSlot = activeSlot; // 记录槽位
    usingGrenade = false;
    if (equippedPrimary) {
      activeSlot = 'primary';
      weaponManager.switchWeapon(equippedPrimary);
    } else {
      hud.showNotification('尚未购买主武器');
      return;
    }
  }
  if (e.key === '2') { 
    if (activeSlot !== 'pistol') previousSlot = activeSlot; // 记录槽位
    usingGrenade = false; activeSlot = 'pistol'; weaponManager.switchWeapon(equippedPistol); 
  }
  if (e.key === '3') { 
    if (activeSlot !== 'knife') previousSlot = activeSlot; // 记录槽位
    usingGrenade = false; activeSlot = 'knife'; weaponManager.switchWeapon('knife'); 
  }
  if (e.key === '4') {
    if (activeSlot !== 'grenade') previousSlot = activeSlot; // 记录槽位
    usingGrenade = true;
    activeSlot = 'grenade';
    const selected = grenades.cycle();
    hud.showNotification(`已选择${grenades.getSelectedLabel()}`);
    hud.updateGrenade(grenades.getSelectedLabel(), grenades.getInventory()[selected]);
    syncWeaponHud();
  }
  
  // 【新增】Q 键一键切枪逻辑
  if (e.key === 'q' || e.key === 'Q') {
    const target = previousSlot;
    if (target === 'primary' && !equippedPrimary) return; // 如果主武器已经扔了，就不切过去
    
    // 互换当前槽位和上一个槽位
    previousSlot = activeSlot;
    activeSlot = target;
    
    if (activeSlot === 'primary') {
      usingGrenade = false;
      weaponManager.switchWeapon(equippedPrimary);
    } else if (activeSlot === 'pistol') {
      usingGrenade = false;
      weaponManager.switchWeapon(equippedPistol);
    } else if (activeSlot === 'knife') {
      usingGrenade = false;
      weaponManager.switchWeapon('knife');
    } else if (activeSlot === 'grenade') {
      usingGrenade = true;
      hud.showNotification(`已选择${grenades.getSelectedLabel()}`);
      hud.updateGrenade(grenades.getSelectedLabel(), grenades.getInventory()[grenades.getSelected()]);
      syncWeaponHud();
    }
  }

  if (e.key === 'r' || e.key === 'R') {
    weaponManager.startReload();
    hud.setScoped(false);
    if (currentMode === 'multiplayer') network.send({ type: 'reload' });
  }

  // 修改：把 q 和 Q 加进更新 UI 和同步网络的数组里，排除手雷的干扰
  if (['1', '2', '3', 'q', 'Q'].includes(e.key)) {
    if (!usingGrenade) {
      hud.updateWeapon(weaponManager.getCurrentWeapon());
      syncWeaponHud();
      if (currentMode === 'multiplayer') network.send({ type: 'switchWeapon', weaponId: currentMultiplayerWeaponId() });
    }
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
  // ==================== G 键：拾取与丢弃武器 ====================
  if (e.key === 'g' || e.key === 'G') {
    // 1. 如果脚下有武器，优先拾取
    if (nearbyDrop) {
      equipPickedWeapon(droppedWeapons.pickup(nearbyDrop));
      nearbyDrop = null;
      return;
    }

    // 2. 如果没有可拾取的，则丢弃当前手里的武器
    const currentWeaponId = weaponManager.getCurrentWeaponId();
    if (currentWeaponId !== 'knife' && !usingGrenade) {
      const dropPos = player!.getPosition().clone().add(new THREE.Vector3(0, 1.2, 0));
      const lookDir = scene.getCamera().getWorldDirection(new THREE.Vector3());
      dropPos.add(lookDir.multiplyScalar(0.8));

      droppedWeapons.dropWeapon(currentWeaponId, dropPos);

      if (activeSlot === 'primary') {
        equippedPrimary = '';
        activeSlot = equippedPistol ? 'pistol' : 'knife';
      } else if (activeSlot === 'pistol') {
        equippedPistol = '';
        activeSlot = equippedPrimary ? 'primary' : 'knife';
      }
      
      weaponManager.switchWeapon(activeSlot === 'primary' ? equippedPrimary : activeSlot === 'pistol' ? equippedPistol : 'knife');
      syncWeaponHud();
      hud.showNotification(`已丢弃 ${weaponDisplayName(currentWeaponId)}`);
    }
  }

  // ==================== E 键：互动 (拆弹 / 下包) ====================
  if (e.key === 'e' || e.key === 'E') {
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

document.addEventListener('click', (e) => {
  console.log('[Global Click]', {
    target: e.target.tagName,
    className: e.target.className,
    inputMode,
    gameRunning,
    pointerLocked: input.isPointerLocked()
  });
  if (gameRunning && inputMode === 'playing' && !input.isPointerLocked() && !input.isTouchControlsActive()) {
    console.log('[Debug] Click detected, requesting game focus');
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
  console.log('[Debug] endGame called', { gameRunning, inputMode });
  gameRunning = false;
  input.exitPointerLock();
  input.clearGameplayKeys();
  hadPointerLock = false;
  pointerLockState = 'supported';
  lockFailureReason = null;
  debugPointerLockBypass = false;
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
  soloBotMatch = null;
  botRoundRespawnPending = false;
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
  console.log('[Debug] endGame complete', { inputMode, gameRunning });
}

function gameLoop(now: number) {
  // 【修复闪退】顶层 try/catch 防止未捕获异常导致游戏循环退出
  try {
    const frameDt = Math.max(0, (now - lastFrameTime) / 1000);
    const dt = Math.min(frameDt, 0.033);
    const clockDt = Math.min(frameDt, 1);
    lastFrameTime = now;

    if (!gameRunning || inputMode === 'paused' || inputMode === 'gameOver') {
      scene.render();
      requestAnimationFrame(gameLoop);
      return;
    }
    handleVirtualActions();

    const botMatchCanMove = !soloBotMatch || soloBotMatch.canPlayerMove();
    const botMatchCanMoveBots = !soloBotMatch || soloBotMatch.canBotsMove();
    const botMatchCanShoot = !soloBotMatch || soloBotMatch.canPlayerShoot();

    if (player && !isSpectating && canMove(inputMode) && botMatchCanMove) {
      player.update(dt);
      audioFeedback.playFootstep({
        moving: player.isMoving(),
        walking: input.isKeyPressed('ShiftLeft') || input.isKeyPressed('ShiftRight'),
        crouched: player.isCrouched(),
        grounded: player.isGrounded()
      }, now);
      if (!wasGrounded && player.isGrounded()) audioFeedback.playLand(player.getLastLandingSpeed());
      wasGrounded = player.isGrounded();
    } else if (player && !isSpectating && canLook(inputMode)) {
      if (!botMatchCanMove) player.stopHorizontalMovement();
      player.updateLookOnly(dt);
    } else {
      input.getMouseDelta();
    }
    physics.step(dt);
    if (player) player.syncCameraToBody();
    weaponManager.update(now, dt, player?.isMoving() ?? false);
    weaponManager.consumeFeedbackEvents().forEach(event => {
      audioFeedback.playWeapon(event.type, event.weaponId);
    });

    impactDecalManager.update(now);
    tracerSystem.update(now);
    shellCasingManager.update(dt);
    screenShake.update(dt);

    const playerPos = player?.getPosition() || new THREE.Vector3(0, 0, 0);
    updateRadarPanel();
    updateWeaponAimState();
    updateAimFov(dt);
    nearbyDrop = player ? droppedWeapons.update(playerPos) : null;
    if (nearbyDrop) {
      hud.showNotification(`按 G 拾取 ${weaponDisplayName(nearbyDrop.weaponId)}`, 450);
    }
    const enemyDamage = enemyManager.update(dt, playerPos, now, scene.getArenaColliders(), botMatchCanMoveBots);
    if (enemyDamage > 0 && player) {
      player.takeDamage(enemyDamage, 'chest', 0.28);
      hud.updateHealth(player.getHealth(), player.getMaxHealth(), player.getArmor());
      hud.showDamage();
      screenShake.trigger(ScreenShake.presets.damageMedium.strength, ScreenShake.presets.damageMedium.duration);
      if (player.isDead()) {
        if (soloBotMatch) {
          soloBotMatch.recordPlayerDeath();
        } else {
        survival.gameOver();
        hud.showResults(survival.getStats(now));
        setInputMode('gameOver');
        gameRunning = false;
        input.exitPointerLock();
        }
      }
    }

    enemyManager.getAllEnemies().forEach(enemy => {
      if (enemy.isDead() && !recordedKills.has(enemy.id)) {
        recordedKills.add(enemy.id);
        if (soloBotMatch) {
          soloBotMatch.recordBotKill();
        } else {
          survival.recordKill(enemy.getPosition());

        // 【新增】NPC 死亡掉落武器
        const possibleDrops = ['ak47', 'm4a4', 'awp', 'mac10', 'p90', 'deagle'];
        const randomWeapon = possibleDrops[Math.floor(Math.random() * possibleDrops.length)];
        const dropPos = enemy.getPosition().clone().add(new THREE.Vector3(0, 0.3, 0));
        droppedWeapons.dropWeapon(randomWeapon, dropPos);
        }
      }
    });

    if (soloBotMatch && gameRunning) {
      updateSoloBotMatch(clockDt);
    } else if (currentMode === 'solo' && gameRunning) {
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

    const lookDir = scene.getCamera().getWorldDirection(new THREE.Vector3());
    const grenadeResult = grenades.update(dt, playerPos, lookDir);
    if (grenadeResult.damage > 0 && player) {
      player.takeDamage(grenadeResult.damage, 'chest', 0.15);
      hud.updateHealth(player.getHealth(), player.getMaxHealth(), player.getArmor());
      hud.showDamage();
      screenShake.trigger(ScreenShake.presets.damageMedium.strength, ScreenShake.presets.damageMedium.duration);
    }
    if (grenadeResult.flash > 0 && currentMode !== 'multiplayer' && hud) {
      hud.setFlashOverlay(grenadeResult.flash);
    }

    if (!isSpectating && canShoot(inputMode) && hasGameplayFocus() && botMatchCanShoot && usingGrenade && input.isKeyPressed('MouseRight') && player) {
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

    if (!isSpectating && canShoot(inputMode) && hasGameplayFocus() && botMatchCanShoot && !usingGrenade && input.isKeyPressed('MouseRight') && weaponManager.getCurrentWeapon().isMelee && player) {
      input.setKeyPressed('MouseRight', false);
      const result = weaponManager.shoot(scene.getCamera(), now, { heavyMelee: true });
      if (result) applyLocalWeaponHit(result);
    }

    if (!isSpectating && canShoot(inputMode) && hasGameplayFocus() && botMatchCanShoot && input.isKeyPressed('MouseLeft') && player) {
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
        const hitscanResult: RaycastResult & { damage: number } = result.isMelee
          ? { hit: false, damage: 0 }
          : projectileSystem.fireHitscan(result.origin, result.direction, result.damage);

        if (hitscanResult.hit) {
          hud.showHitMarker();
        }

        applyLocalWeaponHit(result);

        if (!result.isMelee) {
          const weaponRange = weaponManager.getCurrentWeapon().range;
          const enemyTarget = findClosestRayTarget(result.origin, result.direction, weaponRange);
          if (enemyTarget) {
            const hitPoint = result.origin.clone().add(result.direction.clone().multiplyScalar(enemyTarget.distance));
            const hitNormal = hitscanResult.hit ? hitscanResult.normal! : new THREE.Vector3(0, 1, 0);
            impactDecalManager.spawn(hitPoint, hitNormal, 'concrete');
            if (weaponManager.shouldSpawnTracer()) {
              tracerSystem.spawn(weaponManager.getMuzzleWorldPosition(), hitPoint);
            }
          } else if (hitscanResult.hit) {
            impactDecalManager.spawn(hitscanResult.point!, hitscanResult.normal!, 'concrete');
            if (weaponManager.shouldSpawnTracer()) {
              tracerSystem.spawn(weaponManager.getMuzzleWorldPosition(), hitscanResult.point!);
            }
          }
        }
        if (!result.isMelee) {
          const ejectPos = weaponManager.getEjectPosition();
          shellCasingManager.spawn(ejectPos, result.direction, weaponManager.getCurrentWeaponId());
        }
        if (weaponManager.isScoped()) {
          weaponManager.setAiming(false);
          hud.setScoped(false);
        }
      }
      }
    }

    // Apply screen shake before rendering
    const shakeOffset = screenShake.getOffset();
    const camera = scene.getCamera();
    const originalCameraPosition = camera.position.clone();
    const originalCameraRotation = camera.rotation.clone();
    if (debugCameraPose) {
      camera.position.set(debugCameraPose.x, debugCameraPose.y, debugCameraPose.z);
      camera.rotation.order = 'YXZ';
      camera.rotation.y = debugCameraPose.yaw;
      camera.rotation.x = debugCameraPose.pitch;
      camera.rotation.z = 0;
    }
    camera.position.x += shakeOffset.x;
    camera.position.y += shakeOffset.y;
    scene.render();
    if (debugCameraPose) {
      camera.position.copy(originalCameraPosition);
      camera.rotation.copy(originalCameraRotation);
    } else {
      camera.position.x -= shakeOffset.x;
      camera.position.y -= shakeOffset.y;
    }
  } catch (err) {
    // 【修复闪退】捕获未预期的游戏逻辑异常，防止循环退出
    console.error('[GameLoop] 未捕获异常:', err);
    // 短暂暂停后继续循环，避免白屏/退出
    if (gameRunning) {
      hud.showNotification('游戏遇到问题，正在恢复...', 2000);
    }
  }
  requestAnimationFrame(gameLoop);
}

gameLoop(performance.now());

export { scene, physics, input, player, weaponManager, projectileSystem, network, enemyManager, hud, mainMenu };

function handleVirtualActions(): void {
  if (!input.isTouchControlsActive() || !gameRunning || inputMode === 'paused' || inputMode === 'gameOver') return;
  if (isSpectating) return;

  if (input.consumeKeyPress('Digit1')) {
    if (equippedPrimary && activeSlot !== 'primary') previousSlot = activeSlot; // 【新增】记录
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
    if (activeSlot !== 'pistol') previousSlot = activeSlot; // 【新增】记录
    usingGrenade = false;
    activeSlot = 'pistol';
    weaponManager.switchWeapon(equippedPistol);
    syncSwitchedWeapon();
  }
  if (input.consumeKeyPress('Digit3')) {
    if (activeSlot !== 'knife') previousSlot = activeSlot; // 【新增】记录
    usingGrenade = false;
    activeSlot = 'knife';
    weaponManager.switchWeapon('knife');
    syncSwitchedWeapon();
  }
  if (input.consumeKeyPress('Digit4')) {
    if (activeSlot !== 'grenade') previousSlot = activeSlot; // 【新增】记录
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
  // 移动端虚拟按键 G：拾取/丢弃
  if (input.consumeKeyPress('KeyG') && inputMode === 'playing') {
    if (nearbyDrop) {
      equipPickedWeapon(droppedWeapons.pickup(nearbyDrop));
      nearbyDrop = null;
      return;
    }
    const currentWeaponId = weaponManager.getCurrentWeaponId();
    if (currentWeaponId !== 'knife' && !usingGrenade) {
      const dropPos = player!.getPosition().clone().add(new THREE.Vector3(0, 1.2, 0));
      const lookDir = scene.getCamera().getWorldDirection(new THREE.Vector3());
      dropPos.add(lookDir.multiplyScalar(0.8));
      droppedWeapons.dropWeapon(currentWeaponId, dropPos);
      if (activeSlot === 'primary') {
        equippedPrimary = '';
        activeSlot = equippedPistol ? 'pistol' : 'knife';
      } else if (activeSlot === 'pistol') {
        equippedPistol = '';
        activeSlot = equippedPrimary ? 'primary' : 'knife';
      }
      weaponManager.switchWeapon(activeSlot === 'primary' ? equippedPrimary : activeSlot === 'pistol' ? equippedPistol : 'knife');
      syncWeaponHud();
      hud.showNotification(`已丢弃 ${weaponDisplayName(currentWeaponId)}`);
    }
  }

  // 移动端虚拟按键 E：拆弹/下包
  if (input.consumeKeyPress('KeyE') && inputMode === 'playing') {
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
    preferredTeam: desiredTeam,
    startingMoney: settings.getSettings().startingMoney
  });
}

function createPlayerName(): string {
  return `Player-${Math.floor(Math.random() * 1000)}`;
}

function getDefaultSpawnYaw(team?: Team): number {
  if (selectedMapId === 'dust2' && team === 'attackers') return -Math.PI / 2;
  return 0;
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
  console.log('[Debug] requestGameFocus called', {
    gameRunning,
    inputMode,
    isTouchControlsActive: input.isTouchControlsActive(),
    isPointerLocked: input.isPointerLocked()
  });
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
    console.log('[Debug] Pointer lock result:', locked);
    if (allowDebugPointerLockBypass && debugPointerLockBypass) {
      pointerLockState = 'locked';
      lockFailureReason = null;
      hud.hidePointerLockGuide();
      return;
    }
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
  const botPolicy = soloBotMatch
    ? {
        allowedWeaponIds: CS16_ALLOWED_WEAPON_IDS,
        money: soloBotMatch.getStats().money,
        disabledReason: getSoloBotBuyDisabledReason(),
      }
    : undefined;
  const disabledReason = currentMode === 'multiplayer' && currentSnapshot?.config.mode === 'defusal' && currentSnapshot.phase !== 'buy'
    ? '只能在购买阶段购买'
    : undefined;
  hud.toggleBuyMenu(true, { solo: currentMode === 'solo', disabledReason, policy: botPolicy });
}

function closeBuyMenu(refocus: boolean): void {
  hud.toggleBuyMenu(false);
  if (gameRunning) {
    setInputMode('playing');
    if (refocus) requestGameFocus();
  }
}

function isPlayerInBuyZone(): boolean {
  if (!player) return false;
  return player.getPosition().distanceTo(scene.getCurrentArena().playerSpawn) <= 6;
}

function getSoloBotBuyDisabledReason(): string | undefined {
  if (!soloBotMatch) return undefined;
  const stats = soloBotMatch.getStats();
  if (stats.phase !== 'freezeTime') return '只能在冻结购买时间购买';
  if (!isPlayerInBuyZone()) return '必须站在出生买区内购买';
  return undefined;
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
  const canUseWeapon = canShoot(inputMode) && hasGameplayFocus() && (!soloBotMatch || soloBotMatch.canPlayerShoot()) && !usingGrenade && !weaponManager.getCurrentWeapon().isMelee;
  if (!canUseWeapon) {
    weaponManager.setAiming(false);
    hud.setScoped(false);
    return;
  }
  if (input.isKeyPressed('MouseRight')) {
    input.setKeyPressed('MouseRight', false);
    if (!soloBotMatch || canCs16WeaponScope(weaponManager.getCurrentWeaponId())) {
      weaponManager.setAiming(!weaponManager.isScoped());
    }
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
  if (best) {
    const occlusion = projectileSystem.fireRaycast(origin, direction, Math.max(0.01, best.distance - 0.04));
    if (occlusion.hit) {
      return null;
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
window.__debugSetPlayerPosition = (x: number, z: number, yaw = 0, y = 1.7) => {
  if (!player) return false;
  const pos = new THREE.Vector3(x, y, z);
  player.setEyePositionForDebug(pos);
  player.setRotation(0, yaw);
  player.resetVelocity();
  return true;
};
window.__debugTeleportToTSpawn = () => {
  // Inferno T 出生点: x=-15.44, y=0.48, z=-2.64
  if (selectedMapId === 'inferno') {
    const result = getInfernoSpawnForTeam('t');
    console.log('[Debug] 传送到 T 出生点:', result.playerSpawn);
    if (player) {
      player.setEyePositionForDebug(result.playerSpawn);
      player.resetVelocity();
    }
    return true;
  }
  // Dust2 T 出生点
  return window.__debugSetPlayerPosition(-8.32, 8.96, 0, 2.56);
};
window.__debugTeleportToCTSpawn = () => {
  // Inferno CT 出生点: x=24.00, y=1.92, z=-22.08
  if (selectedMapId === 'inferno') {
    const result = getInfernoSpawnForTeam('ct');
    console.log('[Debug] 传送到 CT 出生点:', result.playerSpawn);
    if (player) {
      player.setEyePositionForDebug(result.playerSpawn);
      player.resetVelocity();
    }
    return true;
  }
  // Dust2 CT 出生点
  return window.__debugSetPlayerPosition(2.56, -22.4, Math.PI, -0.24);
};

// 测试出生点
window.__debugTestSpawns = () => {
  console.log('=== Inferno 出生点测试 ===');
  const resultT = getInfernoSpawnForTeam('t');
  console.log('选择匪徒 (T):', { x: resultT.playerSpawn.x.toFixed(2), y: resultT.playerSpawn.y.toFixed(2), z: resultT.playerSpawn.z.toFixed(2) });
  const resultCT = getInfernoSpawnForTeam('ct');
  console.log('选择警察 (CT):', { x: resultCT.playerSpawn.x.toFixed(2), y: resultCT.playerSpawn.y.toFixed(2), z: resultCT.playerSpawn.z.toFixed(2) });
  console.log('敌人数量 - T:', resultCT.enemySpawns.length, '- CT:', resultT.enemySpawns.length);
  return '测试完成，查看控制台输出';
};

// 测试碰撞体
window.__debugTestColliders = () => {
  const arena = scene.getCurrentArena();
  console.log('=== 碰撞体测试 ===');
  console.log('Box 碰撞体数量:', arena.colliders.length);
  console.log('Mesh 碰撞体数量:', arena.meshes.length);
  console.log('全局重力 Y:', physics.getWorld().gravity.y);
  console.log('所有碰撞体名称:', arena.colliders.map(c => c.name));

  const colliderCount = physics.getWorld().bodies.length;
  console.log('物理世界中碰撞体总数:', colliderCount);

  const collisionTypes = new Map<string, number>();
  physics.getWorld().bodies.forEach(b => {
    b.shapes.forEach(s => {
      const type = s.type === 4 ? 'Box' : s.type === 16 ? 'Trimesh' : `Type${s.type}`;
      collisionTypes.set(type, (collisionTypes.get(type) || 0) + 1);
    });
  });
  console.log('碰撞体类型统计:', Object.fromEntries(collisionTypes));
  return `测试完成 - Box: ${collisionTypes.get('Box') || 0}, Trimesh: ${collisionTypes.get('Trimesh') || 0}`;
};

// No-clip 模式测试（穿墙）
window.__debugNoclip = (enabled = true) => {
  if (player) {
    // @ts-ignore
    player.noclip = enabled;
    console.log(`[Debug] No-clip ${enabled ? '开启' : '关闭'}`);
  }
  return enabled;
};
window.__debugGetPhysicsBodies = () => {
  if (!physics) return [];
  return physics.getWorld().bodies.map((b, i) => ({
    index: i,
    name: (b as any).userData?.name,
    position: { x: b.position.x, y: b.position.y, z: b.position.z },
    shapes: b.shapes.map(s => s.type)
  }));
};
window.__debugSetCameraPoseForScreenshot = (x: number, y: number, z: number, yaw: number, pitch = 0) => {
  debugCameraPose = { x, y, z, yaw, pitch };
  return true;
};
window.__debugSetArenaInspectionMode = (enabled: boolean) => {
  if (!scene) return false;
  scene.setArenaInspectionMode(enabled);
  return true;
};
window.__debugSetViewModelVisible = (visible: boolean) => {
  weaponManager.setViewModelVisible(visible);
  return true;
};
window.__debugSetPlayerYaw = (yaw: number) => {
  if (!player) return false;
  player.setRotation(0, yaw);
  return true;
};
window.__debugShoot = (): boolean => {
  if (!player || !weaponManager || !scene) return false;
  const cam = scene.getCamera();
  if (!cam) return false;
  const result = weaponManager.shoot(cam, performance.now());
  return result !== null;
};
(window as any).__debugMovement = false;
(window as any).__debugBots = false;
window.__debugTakeScreenshot = (): string | null => {
  const canvas = scene?.getRenderer()?.domElement as HTMLCanvasElement | undefined;
  if (!canvas) return null;
  return canvas.toDataURL('image/png');
};
window.__debugInputState = () => ({
  mode: inputMode,
  pointerLockState,
  pointerLockRequired,
  lockFailureReason,
  canShoot: canShoot(inputMode) && hasGameplayFocus() && (!soloBotMatch || soloBotMatch.canPlayerShoot()),
  activePanel: hud.isBuyMenuOpen() ? 'buyMenu' : hud.isScoreboardOpen() ? 'scoreboard' : inputMode === 'paused' ? 'pause' : lockFailureReason ? 'pointerLockGuide' : 'none',
  isBuyMenuOpen: hud.isBuyMenuOpen(),
  isScoreboardOpen: hud.isScoreboardOpen(),
  pointerLocked: input.isPointerLocked(),
  playerPosition: player ? vectorToPlain(player.getPosition()) : null,
  rotation: player?.getRotation() ?? null,
  localTeam: currentSnapshot?.players.find(snapshotPlayer => snapshotPlayer.id === localPlayerId)?.team ?? null,
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
  mouseSensitivity: input.getMouseSettings().baseSensitivity * input.getMouseSettings().platformScale,
  cs16BotMatch: soloBotMatch?.getStats() ?? null,
  botDebugStates: enemyManager.getDebugStates()
});

if (allowDebugPointerLockBypass) {
  window.__debugAllowPointerLockBypassForTests = () => {
    debugPointerLockBypass = true;
    pointerLockState = 'locked';
    lockFailureReason = null;
    hud.hidePointerLockGuide();
  };
  window.__debugSetKeyPressed = (key: string, pressed: boolean) => {
    input.setKeyPressed(key, pressed);
  };
  window.__debugSetMouseDelta = (x: number, y: number) => {
    input.setMouseDelta(x, y);
  };
}

function switchLocalWeaponFromBuy(weaponId: WeaponId): void {
  usingGrenade = false;
  const localWeapon = multiplayerWeaponToLocal(weaponId);
  dropReplacedWeapon(localWeapon);
  if (localWeapon === 'knife') {
    if (activeSlot !== 'knife') previousSlot = activeSlot; // 【新增】记录槽位
    activeSlot = 'knife';
  } else if (isPistolWeapon(localWeapon)) {
    equippedPistol = localWeapon;
    if (activeSlot !== 'pistol') previousSlot = activeSlot; // 【新增】记录槽位
    activeSlot = 'pistol';
  } else {
    equippedPrimary = localWeapon;
    if (activeSlot !== 'primary') previousSlot = activeSlot; // 【新增】记录槽位
    activeSlot = 'primary';
  }
  weaponManager.switchWeapon(localWeapon);
  hud.updateWeapon(weaponManager.getCurrentWeapon());
  syncWeaponHud();
}
function applySoloBuy(request: BuyRequest): void {
  if (soloBotMatch) {
    const result = soloBotMatch.tryBuy(request, isPlayerInBuyZone());
    if (!result.ok) {
      hud.showNotification(result.reason ?? '无法购买');
      hud.updateCs16BotMatch(soloBotMatch.getStats());
      return;
    }
  }
  if (request.armor) {
    player?.buyArmor();
    if (player) hud.updateHealth(player.getHealth(), player.getMaxHealth(), player.getArmor());
    hud.showNotification('已购买防弹衣');
    if (soloBotMatch) hud.updateCs16BotMatch(soloBotMatch.getStats());
    return;
  }
  if (request.weaponId) {
    switchLocalWeaponFromBuy(request.weaponId);
    if (soloBotMatch) hud.updateCs16BotMatch(soloBotMatch.getStats());
  }
}

function debugLog(...args: unknown[]): void {
  if ((import.meta as { env?: { DEV?: boolean } }).env?.DEV) console.log(...args);
}

function equipPickedWeapon(localWeapon: string): void {
  dropReplacedWeapon(localWeapon);
  usingGrenade = false;
  if (isPistolWeapon(localWeapon)) {
    equippedPistol = localWeapon;
    if (activeSlot !== 'pistol') previousSlot = activeSlot; // 【新增】记录槽位
    activeSlot = 'pistol';
  } else {
    equippedPrimary = localWeapon;
    if (activeSlot !== 'primary') previousSlot = activeSlot; // 【新增】记录槽位
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
  if (soloBotMatch) {
    hud.updateCs16Scoreboard(soloBotMatch.getStats());
  } else if (currentMode === 'solo') {
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
