import { describe, expect, it } from 'vitest';
import { captureMultiplayerLaunchIntent } from './MultiplayerLaunchIntent.js';

describe('captureMultiplayerLaunchIntent', () => {
  it('preserves a selected room when launching multiplayer from the room list', () => {
    expect(captureMultiplayerLaunchIntent('multiplayer', 'dust2-room', false)).toEqual({
      roomId: 'dust2-room',
      spectator: false,
    });
  });

  it('preserves spectator intent for room-list spectating', () => {
    expect(captureMultiplayerLaunchIntent('multiplayer', 'dust2-room', true)).toEqual({
      roomId: 'dust2-room',
      spectator: true,
    });
  });

  it('clears room intent for solo and fresh matchmaking launches', () => {
    expect(captureMultiplayerLaunchIntent('solo', 'dust2-room', true)).toEqual({
      roomId: null,
      spectator: false,
    });
    expect(captureMultiplayerLaunchIntent('multiplayer', null, true)).toEqual({
      roomId: null,
      spectator: false,
    });
  });
});
