import { Room, GameMode, PlayerState } from './types.js';

export class RoomManager {
  private rooms = new Map<string, Room>();

  createRoom(mode: GameMode, maxPlayers: number = 4): Room {
    const id = `${mode === 'solo' ? 'solo' : 'mp'}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const room: Room = {
      id,
      mode,
      players: new Map(),
      maxPlayers
    };
    this.rooms.set(id, room);
    return room;
  }

  getRoom(id: string): Room | undefined {
    return this.rooms.get(id);
  }

  removeRoom(id: string): void {
    this.rooms.delete(id);
  }

  addPlayerToRoom(roomId: string, playerId: string, state: PlayerState): boolean {
    const room = this.rooms.get(roomId);
    if (!room || room.players.size >= room.maxPlayers) return false;
    room.players.set(playerId, state);
    return true;
  }

  removePlayerFromRoom(roomId: string, playerId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.players.delete(playerId);
      if (room.players.size === 0) {
        this.removeRoom(roomId);
      }
    }
  }

  getRoomList(): Array<{ id: string; mode: GameMode; playerCount: number }> {
    return Array.from(this.rooms.values()).map(room => ({
      id: room.id,
      mode: room.mode,
      playerCount: room.players.size
    }));
  }
}