import { RoomConfig } from '../shared/types.js';

export const SERVER_CONFIG = {
  port: Number(process.env.PORT || 3000),
  clientOrigin: process.env.CLIENT_ORIGIN || '*',
  publicServerUrl: process.env.PUBLIC_SERVER_URL || 'http://localhost:3000',
  maxRooms: Number(process.env.MAX_ROOMS || 64),
  roomIdleTimeoutMs: Number(process.env.ROOM_IDLE_TIMEOUT_MS || 10 * 60 * 1000)
};

export const DEFAULT_ROOM_CONFIGS: Record<'tdm' | 'defusal', RoomConfig> = {
  tdm: {
    mode: 'tdm',
    mapId: 'dust2',
    maxPlayers: 10,
    tickRate: 30,
    startingMoney: 3200,
    isPrivate: false,
    friendlyFire: false,
    roundLimit: 100,
    warmupSeconds: 3
  },
  defusal: {
    mode: 'defusal',
    mapId: 'dust2',
    maxPlayers: 10,
    tickRate: 30,
    startingMoney: 800,
    isPrivate: false,
    friendlyFire: false,
    roundLimit: 15,
    warmupSeconds: 8
  }
};
