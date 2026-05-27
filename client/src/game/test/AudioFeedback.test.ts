import { describe, expect, it } from 'vitest';
import { AudioFeedback } from '../AudioFeedback.js';

function createMockAudioManager() {
  const calls: { id: string; opts?: { volume?: number; pitch?: number } }[] = [];
  return {
    calls,
    play(id: string, opts?: { volume?: number; pitch?: number }) {
      calls.push({ id, opts });
    }
  };
}

describe('AudioFeedback', () => {
  it('records layered combat and movement sound cues without requiring audio assets', () => {
    const mock = createMockAudioManager();
    const audio = new AudioFeedback(mock);

    audio.playWeapon('shoot', 'rifle');
    audio.playHit('head');
    audio.playFootstep({ moving: true, walking: false, crouched: false, grounded: true });

    expect(mock.calls.map(c => c.id)).toEqual(['rifle_fire', 'hit_head', 'footstep_concrete']);
  });

  it('suppresses footstep cues while crouched or airborne', () => {
    const mock = createMockAudioManager();
    const audio = new AudioFeedback(mock);

    audio.playFootstep({ moving: true, walking: false, crouched: true, grounded: true });
    audio.playFootstep({ moving: true, walking: false, crouched: false, grounded: false });

    expect(mock.calls).toEqual([]);
  });
});
