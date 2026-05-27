import { HitRegion } from './Combat.js';

export interface FootstepState {
  moving: boolean; walking: boolean; crouched: boolean; grounded: boolean;
}

// Map weapon IDs to audio cue file keys
const WEAPON_FIRE_SOUNDS: Record<string, string> = {
  pistol: 'pistol_fire', heavy_pistol: 'heavy_pistol_fire', deagle: 'heavy_pistol_fire',
  rifle: 'rifle_fire', defender_rifle: 'rifle_fire', ak47: 'rifle_fire',
  m4a1s: 'rifle_fire', m4a4: 'rifle_fire', famas: 'rifle_fire', galil: 'rifle_fire',
  sg553: 'rifle_fire', aug: 'rifle_fire',
  smg: 'smg_fire', mp9: 'smg_fire', mac10: 'smg_fire', mp7: 'smg_fire',
  ump45: 'smg_fire', p90: 'smg_fire',
  shotgun: 'shotgun_fire', nova: 'shotgun_fire', xm1014: 'shotgun_fire', mag7: 'shotgun_fire',
  sniper: 'sniper_fire', awp: 'sniper_fire', ssg08: 'sniper_fire',
  knife: 'knife_swing',
};

export class AudioFeedback {
  private lastFootstepAt = 0;

  constructor(private audioManager: { play: (id: string, opts?: { volume?: number; pitch?: number }) => void }) {}

  playWeapon(type: 'shoot' | 'empty' | 'reload', weaponId: string): void {
    if (type === 'shoot') {
      const soundKey = WEAPON_FIRE_SOUNDS[weaponId] ?? 'rifle_fire';
      this.audioManager.play(soundKey, { volume: 0.42 });
    } else if (type === 'empty') {
      this.audioManager.play('weapon_empty', { volume: 0.24 });
    } else if (type === 'reload') {
      this.audioManager.play('weapon_reload', { volume: 0.30 });
    }
  }

  playHit(region: HitRegion): void {
    if (region === 'head') {
      this.audioManager.play('hit_head', { volume: 0.46 });
    } else {
      this.audioManager.play('hit_body', { volume: 0.30 });
    }
  }

  playKill(): void { this.audioManager.play('kill', { volume: 0.55 }); }

  playLand(speed: number): void {
    if (speed < 2.2) return;
    this.audioManager.play('land', { volume: Math.min(0.5, speed / 18) });
  }

  playFootstep(state: FootstepState, now: number = performance.now()): void {
    if (!state.moving || !state.grounded || state.crouched) return;
    const interval = state.walking ? 430 : 310;
    if (now - this.lastFootstepAt < interval) return;
    this.lastFootstepAt = now;
    this.audioManager.play('footstep_concrete', { volume: state.walking ? 0.16 : 0.28 });
  }
}
