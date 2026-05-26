import { PlayerSnapshot, Vector3 } from '../game/types.js';

interface SnapshotFrame {
  time: number;
  players: PlayerSnapshot[];
}

const INTERP_DELAY = 100; // ms - render 100ms behind latest snapshot

export class Interpolation {
  private buffer: SnapshotFrame[] = [];
  private maxBuffer = 32;

  push(snapshot: { serverTime: number; players: PlayerSnapshot[] }): void {
    this.buffer.push({ time: snapshot.serverTime, players: snapshot.players });
    while (this.buffer.length > this.maxBuffer) this.buffer.shift();
  }

  getInterpolatedPosition(playerId: string, renderTime: number): Vector3 | null {
    const targetTime = renderTime - INTERP_DELAY;
    if (this.buffer.length < 2) {
      const latest = this.buffer[this.buffer.length - 1];
      if (!latest) return null;
      const snap = latest.players.find(p => p.id === playerId);
      return snap ? { x: snap.position.x, y: snap.position.y, z: snap.position.z } : null;
    }

    let from: SnapshotFrame | null = null;
    let to: SnapshotFrame | null = null;
    for (let i = 0; i < this.buffer.length - 1; i++) {
      if (this.buffer[i].time <= targetTime && this.buffer[i + 1].time > targetTime) {
        from = this.buffer[i];
        to = this.buffer[i + 1];
        break;
      }
    }

    if (!from || !to) {
      const last = this.buffer[this.buffer.length - 1];
      const snap = last.players.find(p => p.id === playerId);
      return snap ? { x: snap.position.x, y: snap.position.y, z: snap.position.z } : null;
    }

    const fromSnap = from.players.find(p => p.id === playerId);
    const toSnap = to.players.find(p => p.id === playerId);
    if (!fromSnap || !toSnap) return null;

    const t = (targetTime - from.time) / (to.time - from.time);
    const clamped = Math.max(0, Math.min(1, t));
    return {
      x: fromSnap.position.x + (toSnap.position.x - fromSnap.position.x) * clamped,
      y: fromSnap.position.y + (toSnap.position.y - fromSnap.position.y) * clamped,
      z: fromSnap.position.z + (toSnap.position.z - fromSnap.position.z) * clamped
    };
  }

  clear(): void {
    this.buffer = [];
  }
}
