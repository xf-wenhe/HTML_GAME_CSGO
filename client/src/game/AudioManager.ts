export type AudioCueId =
  | 'pistol_fire' | 'heavy_pistol_fire' | 'rifle_fire' | 'smg_fire'
  | 'shotgun_fire' | 'sniper_fire' | 'knife_swing' | 'weapon_reload'
  | 'weapon_empty' | 'weapon_switch'
  | 'hit_body' | 'hit_head' | 'kill'
  | 'footstep_concrete' | 'footstep_sand' | 'footstep_metal' | 'footstep_wood'
  | 'land';

interface AudioBufferCache {
  [key: string]: AudioBuffer;
}

export class AudioManager {
  private context: AudioContext | null = null;
  private buffers: AudioBufferCache = {};
  private loaded = false;
  private masterGain: GainNode | null = null;

  async init(): Promise<void> {
    if (typeof window === 'undefined') return;
    const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtor) return;
    this.context = new AudioCtor();
    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = 0.8;
    this.masterGain.connect(this.context.destination);

    // Placeholder: audio files loaded later via loadFiles()
    // For now, synthesis fallback is always available
  }

  async loadFiles(fileMap: Record<string, string>): Promise<void> {
    if (!this.context) return;
    const entries = Object.entries(fileMap);
    const results = await Promise.allSettled(
      entries.map(async ([id, path]) => {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.context!.decodeAudioData(arrayBuffer);
        this.buffers[id] = audioBuffer;
      })
    );
    const loaded = results.filter(r => r.status === 'fulfilled').length;
    console.log(`[AudioManager] Loaded ${loaded}/${entries.length} audio files`);
    this.loaded = true;
  }

  play(id: string, options?: { volume?: number; pitch?: number }): void {
    if (!this.context || !this.masterGain) return;
    const buffer = this.buffers[id];
    if (buffer) {
      this.playBuffer(buffer, options);
    } else {
      this.playSynth(id, options);
    }
  }

  private playBuffer(buffer: AudioBuffer, options?: { volume?: number; pitch?: number }): void {
    if (!this.context || !this.masterGain) return;
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = options?.pitch ?? 1 + (Math.random() - 0.5) * 0.1;
    const gain = this.context.createGain();
    gain.gain.value = (options?.volume ?? 0.7) * 0.6;
    source.connect(gain).connect(this.masterGain);
    source.start();
  }

  private playSynth(id: string, options?: { volume?: number; pitch?: number }): void {
    // Fallback: Web Audio synthesis matching old behavior
    if (!this.context || !this.masterGain) return;
    try {
      const osc = this.context.createOscillator();
      const gain = this.context.createGain();
      const isHead = id.includes('head') || id === 'kill';
      const isFootstep = id.includes('footstep');
      const isReload = id === 'weapon_reload';
      const isEmpty = id === 'weapon_empty';

      osc.type = isHead ? 'triangle' : 'square';
      osc.frequency.value = isFootstep ? 90 : isReload ? 180 : isEmpty ? 220 : isHead ? 880 : 420;
      gain.gain.value = (options?.volume ?? 0.7) * 0.035;
      osc.connect(gain).connect(this.masterGain);
      osc.start();
      osc.stop(this.context.currentTime + (isReload ? 0.09 : 0.045));
    } catch { /* autoplay policy */ }
  }

  dispose(): void {
    this.context?.close();
    this.buffers = {};
  }
}
