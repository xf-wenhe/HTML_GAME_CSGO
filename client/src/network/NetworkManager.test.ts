import { describe, expect, expectTypeOf, it } from 'vitest';
import { MatchSnapshot } from '../game/types.js';
import { NetworkManager } from './NetworkManager.js';

describe('NetworkManager event handlers', () => {
  it('types handler payloads from the event name', () => {
    const network = new NetworkManager('http://example.test');

    network.on('roomJoined', data => {
      expectTypeOf(data.playerId).toEqualTypeOf<string>();
      expectTypeOf(data.sessionId).toEqualTypeOf<string | undefined>();
      expectTypeOf(data.resumed).toEqualTypeOf<boolean | undefined>();
      expectTypeOf(data.spectator).toEqualTypeOf<boolean | undefined>();
      expectTypeOf(data.snapshot).toEqualTypeOf<MatchSnapshot | undefined>();
    });

    expect(network.getServerUrl()).toBe('http://example.test');
  });
});
