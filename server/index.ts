import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { pathToFileURL } from 'url';
import { RoomManager } from './rooms.js';
import { SERVER_CONFIG } from './config.js';
import { BombActionRequest, BuyRequest, MatchMode, PlayerInputRequest, RoomConfig, ShootRequest, WeaponId } from './types.js';

export function createGameServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: SERVER_CONFIG.clientOrigin }
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
        socket.emit('roomJoined', { roomId: data.roomId, playerId: socket.id, snapshot });
        io.to(data.roomId).emit('roomState', snapshot);
        io.emit('roomList', roomManager.getRoomList());
      } else {
        socket.emit('roomError', { message: 'Room is full' });
      }
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

    socket.on('leaveRoom', () => {
      roomManager.removePlayer(socket.id);
      io.emit('roomList', roomManager.getRoomList());
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
      roomManager.removePlayer(socket.id);
      io.emit('roomList', roomManager.getRoomList());
    });
  });

  const tick = setInterval(() => {
    roomManager.tick().forEach(snapshot => {
      io.to(snapshot.roomId).emit('matchSnapshot', snapshot);
    });
  }, Math.round(1000 / 30));
  httpServer.on('close', () => clearInterval(tick));

  return { app, httpServer, io, roomManager };
}

export function startServer(port: number | string = SERVER_CONFIG.port) {
  const server = createGameServer();
  server.httpServer.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer();
}
