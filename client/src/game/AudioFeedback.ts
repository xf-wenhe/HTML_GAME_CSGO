import { HitRegion } from './Combat.js';

export type AudioCueType =
  | 'weapon:shoot'
  | 'weapon:empty'
  | 'weapon:reload'
  | 'hit:body'
  | 'hit:head'
  | 'kill'
  | 'footstep:run'
  | 'footstep:walk'
  | 'land';

export interface AudioCue {
  type: AudioCueType;
  label: string;
  intensity: number;
}

export interface FootstepState {
  moving: boolean;
  walking: boolean;
  crouched: boolean;
  grounded: boolean;
}

export class AudioFeedback {
  private events: AudioCue[] = [];
  private context: AudioContext | null = null;
  private lastFootstepAt = 0;

  constructor(private options: { enabled?: boolean } = {}) {}

  playWeapon(type: 'shoot' | 'empty' | 'reload', weaponId: string): void {
    const intensity = type === 'shoot' ? 0.42 : type === 'empty' ? 0.24 : 0.3;
    this.emit({ type: `weapon:${type}` as AudioCueType, label: weaponId, intensity });
  }

  playHit(region: HitRegion): void {
    this.emit({ type: region === 'head' ? 'hit:head' : 'hit:body', label: region, intensity: region === 'head' ? 0.46 : 0.3 });
  }

  playKill(): void {
    this.emit({ type: 'kill', label: 'kill', intensity: 0.55 });
  }

  playLand(speed: number): void {
    if (speed < 2.2) return;
    this.emit({ type: 'land', label: 'land', intensity: Math.min(0.5, speed / 18) });
  }

  playFootstep(state: FootstepState, now: number = performance.now()): void {
    if (!state.moving || !state.grounded || state.crouched) return;
    const interval = state.walking ? 430 : 310;
    if (now - this.lastFootstepAt < interval) return;
    this.lastFootstepAt = now;
    this.emit({ type: state.walking ? 'footstep:walk' : 'footstep:run', label: state.walking ? 'walk' : 'run', intensity: state.walking ? 0.16 : 0.28 });
  }

  consumeEvents(): AudioCue[] {
    const events = [...this.events];
    this.events = [];
    return events;
  }

  private emit(cue: AudioCue): void {
    this.events.push(cue);
    if (this.options.enabled === false || typeof window === 'undefined') return;
    try {
      const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtor) return;
      this.context ??= new AudioCtor();
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = cue.type.includes('head') || cue.type === 'kill' ? 'triangle' : 'square';
      oscillator.frequency.value = cue.type.includes('footstep') ? 90 : cue.type.includes('reload') ? 180 : cue.type.includes('empty') ? 220 : cue.type.includes('head') ? 880 : 420;
      gain.gain.value = cue.intensity * 0.035;
      oscillator.connect(gain).connect(this.context.destination);
      oscillator.start();
      oscillator.stop(this.context.currentTime + (cue.type.includes('reload') ? 0.09 : 0.045));
    } catch {
      // Browser autoplay policies can reject audio context creation; gameplay must continue silently.
    }
  }
}
