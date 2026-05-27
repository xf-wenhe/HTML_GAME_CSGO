// client/src/game/ScreenShake.ts
export class ScreenShake {
  private intensity = 0;
  private duration = 0;
  private elapsed = 0;
  private seed: number;

  constructor() {
    this.seed = Math.random() * 100;
  }

  trigger(strength: number, durationMs: number): void {
    if (strength > this.intensity || this.elapsed >= this.duration) {
      this.intensity = strength;
      this.duration = durationMs / 1000;
      this.elapsed = 0;
      this.seed = Math.random() * 100;
    }
  }

  getOffset(): { x: number; y: number } {
    if (this.elapsed >= this.duration) {
      return { x: 0, y: 0 };
    }

    const decay = 1 - this.elapsed / this.duration;
    const currentIntensity = this.intensity * decay * decay;
    const freqX = 42;
    const freqY = 55;
    const amplitudeX = 1.0;
    const amplitudeY = 0.8;

    const x = Math.sin(this.elapsed * freqX + this.seed) * currentIntensity * amplitudeX;
    const y = Math.cos(this.elapsed * freqY + this.seed + 1.7) * currentIntensity * amplitudeY;

    return { x, y };
  }

  update(dt: number): void {
    this.elapsed += dt;
  }

  static presets = {
    damageSmall:  { strength: 0.003, duration: 100 },
    damageMedium: { strength: 0.008, duration: 200 },
    explosion:    { strength: 0.020, duration: 500 },
    flashbang:    { strength: 0.010, duration: 300 },
  };
}
