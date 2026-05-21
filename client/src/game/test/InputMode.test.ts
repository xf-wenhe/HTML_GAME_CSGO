import { describe, expect, it } from 'vitest';
import { canClickUi, canLook, canMove, canShoot } from '../InputMode.js';

describe('input mode permissions', () => {
  it('allows movement and shooting only during focused play', () => {
    expect(canMove('playing')).toBe(true);
    expect(canLook('playing')).toBe(true);
    expect(canShoot('playing')).toBe(true);
    expect(canShoot('paused')).toBe(false);
    expect(canShoot('buyMenu')).toBe(false);
  });

  it('allows UI clicks in menu-like modes', () => {
    expect(canClickUi('menu')).toBe(true);
    expect(canClickUi('paused')).toBe(true);
    expect(canClickUi('buyMenu')).toBe(true);
    expect(canClickUi('playing')).toBe(false);
  });
});
