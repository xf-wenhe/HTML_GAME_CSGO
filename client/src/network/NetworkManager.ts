import { io, Socket } from 'socket.io-client';
import {
  BombActionRequest,
  BombState,
  BuyRequest,
  GrenadeThrowRequest,
  MapId,
  MatchMode,
  MatchSnapshot,
  PlayerInputRequest,
  PlayerSnapshot,
  RoomConfig,
  RoomListItem,
  ShootRequest,
  WeaponId
} from '../game/types.js';
import { PROTOCOL_VERSION } from '../../../shared/protocol.js';

export type ServerEvent =
  | { type: 'connected' }
  | { type: 'reconnecting' }
  | { type: 'reconnected' }
  | { type: 'disconnected'; reason: string }
  | { type: 'protocolMismatch'; expected: string; actual: string }
  | { type: 'latency'; latencyMs: number }
  | { type: 'serverHello'; protocolVersion: string; serverTime: number }
  | { type: 'roomCreated'; roomId: string; config: RoomConfig }
  | { type: 'roomJoined'; roomId: string; playerId: string; sessionId?: string; snapshot?: MatchSnapshot; resumed?: boolean; spectator?: boolean }
  | { type: 'playerJoined'; player: PlayerSnapshot }
  | { type: 'roomState'; snapshot: MatchSnapshot }
  | { type: 'matchSnapshot'; snapshot: MatchSnapshot }
  | { type: 'bombState'; bomb?: BombState }
  | { type: 'roomError'; message: string; code?: string }
  | { type: 'roomList'; rooms: RoomListItem[] };

export type ClientEvent =
  | { type: 'joinLobby' }
  | { type: 'joinOrCreateRoom'; mode: MatchMode; playerName: string; mapId?: MapId; startingMoney?: number }
  | { type: 'resumeSession'; roomId: string; playerId: string; sessionId: string }
  | { type: 'createRoom'; config: Partial<RoomConfig> & { mode: MatchMode } }
  | { type: 'joinRoom'; roomId: string; playerName: string }
  | { type: 'spectateRoom'; roomId: string }
  | { type: 'setReady'; ready: boolean }
  | { type: 'playerInput'; input: PlayerInputRequest }
  | { type: 'shoot'; request: ShootRequest }
  | { type: 'reload' }
  | { type: 'switchWeapon'; weaponId: WeaponId }
  | { type: 'buyWeapon'; request: BuyRequest }
  | { type: 'plantBomb'; request: BombActionRequest }
  | { type: 'defuseBomb' }
  | { type: 'grenadeThrow'; request: GrenadeThrowRequest }
  | { type: 'leaveRoom' };

type ServerEventPayload<T extends ServerEvent['type']> = Extract<ServerEvent, { type: T }>;

export class NetworkManager {
  private socket: Socket | null = null;
  private eventHandlers = new Map<ServerEvent['type'], Array<(data: ServerEvent) => void>>();
  private latencyMs: number | null = null;
  private latencyTimer: number | null = null;
  private serverUrl =
    (import.meta as any).env?.VITE_PUBLIC_SERVER_URL ||
    `${window.location.protocol}//${window.location.hostname}:3000`;

  constructor(serverUrl?: string) {
    if (serverUrl) this.serverUrl = serverUrl;
  }

  connect(): void {
    if (this.socket?.connected) return;

    this.socket = io(this.serverUrl, {
      autoConnect: true,
      reconnection: true,
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      this.startLatencyProbe();
      this.emitEvent({ type: 'connected' });
    });
    this.socket.on('disconnect', reason => {
      this.stopLatencyProbe();
      this.emitEvent({ type: 'disconnected', reason });
    });
    this.socket.io.on('reconnect_attempt', () => this.emitEvent({ type: 'reconnecting' }));
    this.socket.io.on('reconnect', () => this.emitEvent({ type: 'reconnected' }));
    this.socket.on('serverHello', data => {
      const protocolVersion = String(data?.protocolVersion ?? '');
      const serverTime = Number(data?.serverTime ?? Date.now());
      this.emitEvent({ type: 'serverHello', protocolVersion, serverTime });
      if (protocolVersion !== PROTOCOL_VERSION) {
        this.emitEvent({ type: 'protocolMismatch', expected: PROTOCOL_VERSION, actual: protocolVersion || 'unknown' });
        this.socket?.disconnect();
      }
    });
    this.socket.on('roomCreated', data => this.emitEvent({ type: 'roomCreated', roomId: data.roomId, config: data.config }));
    this.socket.on('roomJoined', data => this.emitEvent({ type: 'roomJoined', roomId: data.roomId, playerId: data.playerId, sessionId: data.sessionId, snapshot: data.snapshot, resumed: Boolean(data.resumed), spectator: Boolean(data.spectator) }));
    this.socket.on('playerJoined', data => this.emitEvent({ type: 'playerJoined', player: data }));
    this.socket.on('roomState', data => this.emitEvent({ type: 'roomState', snapshot: data }));
    this.socket.on('matchSnapshot', data => this.emitEvent({ type: 'matchSnapshot', snapshot: data }));
    this.socket.on('bombState', data => this.emitEvent({ type: 'bombState', bomb: data }));
    this.socket.on('roomError', data => this.emitEvent({ type: 'roomError', message: data.message, code: data.code }));
    this.socket.on('roomList', data => this.emitEvent({ type: 'roomList', rooms: data }));
  }

  disconnect(): void {
    this.stopLatencyProbe();
    this.socket?.disconnect();
    this.socket = null;
    this.latencyMs = null;
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
      case 'joinOrCreateRoom':
        this.socket.emit('joinOrCreateRoom', { mode: event.mode, playerName: event.playerName, mapId: event.mapId, startingMoney: event.startingMoney });
        break;
      case 'resumeSession':
        this.socket.emit('resumeSession', { roomId: event.roomId, playerId: event.playerId, sessionId: event.sessionId });
        break;
      case 'createRoom':
        this.socket.emit('createRoom', event.config);
        break;
      case 'joinRoom':
        this.socket.emit('joinRoom', { roomId: event.roomId, playerName: event.playerName });
        break;
      case 'spectateRoom':
        this.socket.emit('spectateRoom', { roomId: event.roomId });
        break;
      case 'setReady':
        this.socket.emit('setReady', { ready: event.ready });
        break;
      case 'playerInput':
        this.socket.emit('playerInput', event.input);
        break;
      case 'shoot':
        this.socket.emit('shoot', event.request);
        break;
      case 'reload':
        this.socket.emit('reload');
        break;
      case 'switchWeapon':
        this.socket.emit('switchWeapon', { weaponId: event.weaponId });
        break;
      case 'buyWeapon':
        this.socket.emit('buyWeapon', event.request);
        break;
      case 'plantBomb':
        this.socket.emit('plantBomb', event.request);
        break;
      case 'defuseBomb':
        this.socket.emit('defuseBomb');
        break;
      case 'grenadeThrow':
        this.socket.emit('grenadeThrow', event.request);
        break;
      case 'leaveRoom':
        this.socket.emit('leaveRoom');
        break;
    }
  }

  on<T extends ServerEvent['type']>(eventType: T, handler: (data: ServerEventPayload<T>) => void): void {
    const handlers = this.eventHandlers.get(eventType) ?? [];
    handlers.push(handler as (data: ServerEvent) => void);
    this.eventHandlers.set(eventType, handlers);
  }

  private emitEvent(event: ServerEvent): void {
    const handlers = this.eventHandlers.get(event.type) ?? [];
    handlers.forEach(handler => handler(event));
  }

  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  getServerUrl(): string {
    return this.serverUrl;
  }

  getLatencyMs(): number | null {
    return this.latencyMs;
  }

  private startLatencyProbe(): void {
    this.stopLatencyProbe();
    this.measureLatency();
    this.latencyTimer = window.setInterval(() => this.measureLatency(), 1000);
  }

  private stopLatencyProbe(): void {
    if (this.latencyTimer !== null) {
      window.clearInterval(this.latencyTimer);
      this.latencyTimer = null;
    }
  }

  private measureLatency(): void {
    if (!this.socket?.connected) return;
    const sentAt = performance.now();
    this.socket.timeout(2000).emit('pingCheck', sentAt, (error: Error | null) => {
      if (error) return;
      this.latencyMs = Math.min(999, Math.max(0, performance.now() - sentAt));
      this.emitEvent({ type: 'latency', latencyMs: this.latencyMs });
    });
  }
}
