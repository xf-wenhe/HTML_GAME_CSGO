import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { pathToFileURL } from 'url';
import { RoomManager } from './rooms.js';
import { SERVER_CONFIG } from './config.js';
import { BombActionRequest, BuyRequest, GrenadeThrowRequest, MapId, MatchMode, PlayerInputRequest, RoomConfig, ShootRequest, WeaponId } from './types.js';
import { PROTOCOL_VERSION } from '../shared/protocol.js';

const debugLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== 'production') console.log(...args);
};

// 深度克隆，阻断引用污染
function cloneSnapshot(snap: any): any {
  return JSON.parse(JSON.stringify(snap));
}

// 核心：Delta Diff 算法
function calculateDelta(oldSnap: any, newSnap: any): any {
  if (!oldSnap) return newSnap;
  const delta: any = {};
  let hasChanges = false;

  // 1. 找出修改和新增的字段
  for (const key in newSnap) {
    const newVal = newSnap[key];
    const oldVal = oldSnap[key];

    if (typeof newVal !== 'object' || newVal === null) {
      // 浮点数量化压缩：仅保留2位小数
      const checkVal = (typeof newVal === 'number' && !Number.isInteger(newVal))
        ? Math.round(newVal * 100) / 100 : newVal;
      const oldCheckVal = (typeof oldVal === 'number' && !Number.isInteger(oldVal))
        ? Math.round(oldVal * 100) / 100 : oldVal;

      if (checkVal !== oldCheckVal) {
        delta[key] = checkVal;
        hasChanges = true;
      }
    } else if (Array.isArray(newVal)) {
      // 数组长度变化（例如玩家进出），直接发送完整新数组
      if (!oldVal || oldVal.length !== newVal.length) {
        delta[key] = newVal;
        hasChanges = true;
      } else {
        // 长度相同，按索引逐个 Diff（极大幅度压缩不变的玩家数据）
        const arrDelta: any[] = [];
        let arrChanged = false;
        for (let i = 0; i < newVal.length; i++) {
          if (typeof newVal[i] === 'object' && newVal[i] !== null) {
            const itemDelta = calculateDelta(oldVal[i], newVal[i]);
            if (itemDelta && Object.keys(itemDelta).length > 0) {
              arrDelta[i] = itemDelta;
              if (newVal[i].id) arrDelta[i].id = newVal[i].id; // 强制保留 ID
              arrChanged = true;
            } else {
              arrDelta[i] = null; // 无变化，占位符
            }
          } else if (oldVal[i] !== newVal[i]) {
            arrDelta[i] = newVal[i];
            arrChanged = true;
          } else {
            arrDelta[i] = null;
          }
        }
        if (arrChanged) {
          // 移除数组尾部多余的 null 占位符，进一步压缩包体
          while (arrDelta.length > 0 && arrDelta[arrDelta.length - 1] === null) {
            arrDelta.pop();
          }
          delta[key] = arrDelta;
          hasChanges = true;
        }
      }
    } else {
      // 递归子对象
      const objDelta = calculateDelta(oldVal || {}, newVal);
      if (objDelta && Object.keys(objDelta).length > 0) {
        delta[key] = objDelta;
        hasChanges = true;
      }
    }
  }

  // 2. 找出被删除的字段 (例如炸弹拆除后字段消失)
  for (const key in oldSnap) {
    if (!(key in newSnap)) {
      delta[key] = null; 
      hasChanges = true;
    }
  }

  return hasChanges ? delta : undefined;
}

export function createGameServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: SERVER_CONFIG.clientOrigin }
  });

  const roomManager = new RoomManager();

  app.use(express.json());

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', protocolVersion: PROTOCOL_VERSION, rooms: roomManager.getRoomList().length });
  });

  io.on('connection', (socket) => {
    debugLog(`Client connected: ${socket.id}`);
    socket.emit('serverHello', { protocolVersion: PROTOCOL_VERSION, serverTime: Date.now() });

    socket.on('joinLobby', () => {
      socket.emit('roomList', roomManager.getRoomList());
    });

    socket.on('pingCheck', (_sentAt: number, reply?: () => void) => {
      reply?.();
    });

    socket.on('joinOrCreateRoom', (data: { mode: MatchMode; playerName: string; mapId?: MapId; startingMoney?: number }) => {
      const mode = data.mode ?? 'tdm';
      const playerName = data.playerName?.trim() || `Player-${Math.floor(Math.random() * 1000)}`;
      const room = roomManager.findJoinableRoom(mode, data.mapId) ?? roomManager.createRoom({ mode, mapId: data.mapId ?? 'dust2', startingMoney: data.startingMoney });

      if (roomManager.addPlayerToRoom(room.id, socket.id, playerName)) {
        socket.join(room.id);
        const snapshot = roomManager.getSnapshot(room.id);
        socket.emit('roomJoined', { roomId: room.id, playerId: socket.id, sessionId: roomManager.getPlayerSessionId(socket.id), snapshot });
        io.to(room.id).emit('roomState', snapshot);
        io.emit('roomList', roomManager.getRoomList());
      } else {
        socket.emit('roomError', { message: 'Room is full' });
      }
    });

    socket.on('resumeSession', (data: { roomId: string; playerId: string; sessionId: string }) => {
      const snapshot = roomManager.reconnectPlayer(data.roomId, data.playerId, data.sessionId, socket.id);
      if (!snapshot) {
        socket.emit('roomError', { message: '无法恢复上一局，正在重新匹配', code: 'resumeFailed' });
        return;
      }
      socket.join(snapshot.roomId);
      socket.emit('roomJoined', { roomId: snapshot.roomId, playerId: socket.id, sessionId: roomManager.getPlayerSessionId(socket.id), snapshot, resumed: true });
      io.to(snapshot.roomId).emit('roomState', snapshot);
      io.emit('roomList', roomManager.getRoomList());
    });

    socket.on('createRoom', (data: Partial<RoomConfig> & { mode?: MatchMode; maxPlayers?: number }) => {
      const room = roomManager.createRoom(data.mode ? data : 'tdm', data.maxPlayers);
      socket.emit('roomCreated', { roomId: room.id, config: room.config });
      socket.emit('roomState', roomManager.getSnapshot(room.id));
      io.emit('roomList', roomManager.getRoomList());
    });

    socket.on('joinRoom', (data: { roomId: string; playerName: string }) => {
      const room = roomManager.getRoom(data.roomId);
      if (!room) {
        socket.emit('roomError', { message: 'Room not found' });
        return;
      }

      if (roomManager.addPlayerToRoom(data.roomId, socket.id, data.playerName)) {
        socket.join(data.roomId);
        const snapshot = roomManager.getSnapshot(data.roomId);
        socket.emit('roomJoined', { roomId: data.roomId, playerId: socket.id, sessionId: roomManager.getPlayerSessionId(socket.id), snapshot });
        io.to(data.roomId).emit('roomState', snapshot);
        io.emit('roomList', roomManager.getRoomList());
      } else {
        socket.emit('roomError', { message: 'Room is full' });
      }
    });

    socket.on('spectateRoom', (data: { roomId: string }) => {
      const snapshot = roomManager.addSpectatorToRoom(data.roomId, socket.id);
      if (!snapshot) {
        socket.emit('roomError', { message: 'Room not found' });
        return;
      }
      socket.join(data.roomId);
      socket.emit('roomJoined', { roomId: data.roomId, playerId: socket.id, snapshot, spectator: true });
      io.to(data.roomId).emit('roomState', snapshot);
      io.emit('roomList', roomManager.getRoomList());
    });

    socket.on('setReady', (data: { ready: boolean }) => {
      const snapshot = roomManager.setReady(socket.id, data.ready);
      if (snapshot) io.to(snapshot.roomId).emit('matchSnapshot', snapshot);
    });

    socket.on('playerInput', (data: PlayerInputRequest) => {
      const snapshot = roomManager.applyInput(socket.id, data);
      if (snapshot) socket.to(snapshot.roomId).emit('matchSnapshot', snapshot);
    });

    socket.on('shoot', (data: ShootRequest) => {
      const snapshot = roomManager.shoot(socket.id, data);
      if (snapshot) io.to(snapshot.roomId).emit('matchSnapshot', snapshot);
    });

    socket.on('reload', () => {
      const snapshot = roomManager.reload(socket.id);
      if (snapshot) io.to(snapshot.roomId).emit('matchSnapshot', snapshot);
    });

    socket.on('switchWeapon', (data: { weaponId: WeaponId }) => {
      const snapshot = roomManager.switchWeapon(socket.id, data.weaponId);
      if (snapshot) io.to(snapshot.roomId).emit('matchSnapshot', snapshot);
    });

    socket.on('buyWeapon', (data: BuyRequest) => {
      const snapshot = roomManager.buyWeapon(socket.id, data);
      if (snapshot) io.to(snapshot.roomId).emit('matchSnapshot', snapshot);
    });

    socket.on('plantBomb', (data: BombActionRequest) => {
      const snapshot = roomManager.plantBomb(socket.id, data);
      if (snapshot) io.to(snapshot.roomId).emit('bombState', snapshot.bomb);
      if (snapshot) io.to(snapshot.roomId).emit('matchSnapshot', snapshot);
    });

    socket.on('defuseBomb', () => {
      const snapshot = roomManager.defuseBomb(socket.id);
      if (snapshot) io.to(snapshot.roomId).emit('bombState', snapshot.bomb);
      if (snapshot) io.to(snapshot.roomId).emit('matchSnapshot', snapshot);
    });

    socket.on('grenadeThrow', (data: GrenadeThrowRequest) => {
      const snapshot = roomManager.handleGrenadeThrow(socket.id, data);
      if (snapshot) io.to(snapshot.roomId).emit('matchSnapshot', snapshot);
    });

    socket.on('leaveRoom', () => {
      roomManager.removePlayer(socket.id);
      roomManager.removeSpectator(socket.id);
      io.emit('roomList', roomManager.getRoomList());
    });

    socket.on('disconnect', () => {
      debugLog(`Client disconnected: ${socket.id}`);
      const snapshot = roomManager.markPlayerDisconnected(socket.id);
      const spectatorSnapshot = roomManager.removeSpectator(socket.id);
      if (snapshot) io.to(snapshot.roomId).emit('roomState', snapshot);
      if (spectatorSnapshot) io.to(spectatorSnapshot.roomId).emit('roomState', spectatorSnapshot);
      io.emit('roomList', roomManager.getRoomList());
    });
  });

  const TARGET_TICK = 64;
  const TARGET_INTERVAL = 1000 / TARGET_TICK;
  const tickDriftWindow: number[] = [];
  let currentInterval = TARGET_INTERVAL;
  let lastTick = Date.now();

  const tick = () => {
    const now = Date.now();
    const actualInterval = now - lastTick;
    lastTick = now;

    tickDriftWindow.push(actualInterval);
    if (tickDriftWindow.length > 64) tickDriftWindow.shift();
    const avgDrift = tickDriftWindow.reduce((s, v) => s + Math.abs(v - currentInterval), 0) / tickDriftWindow.length;
    if (avgDrift > 5 && currentInterval === TARGET_INTERVAL) {
      currentInterval = 1000 / 32;
      debugLog(`Tick rate degraded to 32Hz (avg drift ${avgDrift.toFixed(1)}ms)`);
    } else if (avgDrift < 3 && currentInterval !== TARGET_INTERVAL) {
      currentInterval = TARGET_INTERVAL;
      debugLog(`Tick rate restored to ${TARGET_TICK}Hz`);
    }

    const lastSnapshots = new Map<string, any>(); // 用于存放上一帧状态
    
    // 替换原有的 tick 发送逻辑：
    roomManager.tick().forEach(snapshot => {
      const roomId = snapshot.roomId;
      const prev = lastSnapshots.get(roomId);
      const delta = calculateDelta(prev, snapshot);

      // 只有当画面有任何动态时才发送网络包
      if (delta) {
        io.to(roomId).emit('matchDelta', {
          isDelta: !!prev,
          data: delta
        });
      }
      
      // 更新历史参照帧
      lastSnapshots.set(roomId, cloneSnapshot(snapshot));
    });

    const nextTickAt = lastTick + currentInterval;
    const delay = Math.max(0, nextTickAt - Date.now());
    tickTimer = setTimeout(tick, delay);
  };

  let tickTimer = setTimeout(tick, TARGET_INTERVAL);
  httpServer.on('close', () => clearTimeout(tickTimer));

  return { app, httpServer, io, roomManager };
}

export function startServer(port: number | string = SERVER_CONFIG.port) {
  const server = createGameServer();
  server.httpServer.listen(port, () => {
    debugLog(`Server running on port ${port}`);
  });
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer();
}
