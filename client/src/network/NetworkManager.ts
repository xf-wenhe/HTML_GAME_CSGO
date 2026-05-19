import { io, Socket } from 'socket.io-client';
import { PlayerState, Vector3, GameMode } from '../game/types.js';

export type ServerEvent =
  | { type: 'connected' }
  | { type: 'roomCreated'; roomId: string }
  | { type: 'roomJoined'; roomId: string; playerId: string }
  | { type: 'playerJoined'; player: PlayerState }
  | { type: 'playerMoved'; playerId: string; position: Vector3; rotation: Vector3 }
  | { type: 'roomError'; message: string }
  | { type: 'roomList'; rooms: Array<{ id: string; mode: GameMode; playerCount: number }> };

export type ClientEvent =
  | { type: 'joinLobby' }
  | { type: 'createRoom'; mode: GameMode; maxPlayers?: number }
  | { type: 'joinRoom'; roomId: string; playerName: string }
  | { type: 'playerMove'; position: Vector3; rotation: Vector3 }
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
    if (!this.socket?.connected) return;

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