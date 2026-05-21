export type InputMode = 'menu' | 'playing' | 'paused' | 'buyMenu' | 'scoreboard' | 'gameOver';
export type PointerLockState = 'supported' | 'locked' | 'denied' | 'focusedNoLock';

export function canMove(mode: InputMode): boolean {
  return mode === 'playing' || mode === 'scoreboard';
}

export function canLook(mode: InputMode): boolean {
  return mode === 'playing' || mode === 'scoreboard';
}

export function canShoot(mode: InputMode): boolean {
  return mode === 'playing';
}

export function canClickUi(mode: InputMode): boolean {
  return mode === 'menu' || mode === 'paused' || mode === 'buyMenu' || mode === 'gameOver';
}
