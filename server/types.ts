export type GameMode = 'solo' | 'multiplayer';

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface PlayerState {
  id: string;
  position: Vector3;
  rotation: Vector3;
  health: number;
  isDead: boolean;
}

export interface Room {
  id: string;
  mode: GameMode;
  players: Map<string, PlayerState>;
  maxPlayers: number;
}