import { Vector3 } from '../game/types.js';

export interface InputCommand {
  seq: number;
  timestamp: number;
  wishdir: { x: number; z: number };
  buttons: number;
  yaw: number;
  pitch: number;
}

const MAX_INPUT_HISTORY = 1024;

export class Prediction {
  private inputHistory: InputCommand[] = [];
  private nextSeq = 0;
  private lastAckedSeq = -1;

  generateInput(wishdir: { x: number; z: number }, buttons: number, yaw: number, pitch: number): InputCommand {
    const cmd: InputCommand = {
      seq: this.nextSeq++,
      timestamp: performance.now(),
      wishdir,
      buttons,
      yaw,
      pitch
    };
    this.inputHistory.push(cmd);
    while (this.inputHistory.length > MAX_INPUT_HISTORY) this.inputHistory.shift();
    return cmd;
  }

  acknowledge(ackedSeq: number): void {
    if (ackedSeq <= this.lastAckedSeq) return;
    this.lastAckedSeq = ackedSeq;
    this.inputHistory = this.inputHistory.filter(cmd => cmd.seq > ackedSeq);
  }

  getUnackedInputs(): InputCommand[] {
    return [...this.inputHistory];
  }

  getLastAckedSeq(): number {
    return this.lastAckedSeq;
  }

  needsCorrection(serverPos: Vector3, predictedPos: Vector3, tolerance: number = 0.5): boolean {
    const dx = serverPos.x - predictedPos.x;
    const dy = serverPos.y - predictedPos.y;
    const dz = serverPos.z - predictedPos.z;
    return Math.hypot(dx, dy, dz) > tolerance;
  }

  reset(): void {
    this.inputHistory = [];
    this.nextSeq = 0;
    this.lastAckedSeq = -1;
  }
}
