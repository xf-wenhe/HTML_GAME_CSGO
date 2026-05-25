import { describe, expect, it } from 'vitest';
import { AudioFeedback } from '../AudioFeedback.js';

describe('AudioFeedback', () => {
  it('records layered combat and movement sound cues without requiring audio assets', () => {
    const audio = new AudioFeedback({ enabled: false });

    audio.playWeapon('shoot', 'rifle');
    audio.playHit('head');
    audio.playFootstep({ moving: true, walking: false, crouched: false, grounded: true });

    expect(audio.consumeEvents().map(event => event.type)).toEqual(['weapon:shoot', 'hit:head', 'footstep:run']);
  });

  it('suppresses footstep cues while crouched or airborne', () => {
    const audio = new AudioFeedback({ enabled: false });

    audio.playFootstep({ moving: true, walking: false, crouched: true, grounded: true });
    audio.playFootstep({ moving: true, walking: false, crouched: false, grounded: false });

    expect(audio.consumeEvents()).toEqual([]);
  });
});
