import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { RoomManager } from './rooms.js';
import { GameMode } from './types.js';

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