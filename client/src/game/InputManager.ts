export interface MouseDelta {
  x: number;
  y: number;
}

export type MousePlatform = 'windows' | 'macos' | 'linux' | 'unknown';

export interface MouseLookSettings {
  baseSensitivity: number;
  platformScale: number;
  maxDeltaPerFrame: number;
  smoothing: number;
  invertY: boolean;
}

export interface PointerLockInfo {
  locked: boolean;
  denied: boolean;
  rawMouseInput: boolean;
}

const DEFAULT_BASE_SENSITIVITY = 0.00165;

export function detectMousePlatform(userAgent = navigator.userAgent, platform = navigator.platform): MousePlatform {
  const source = `${platform} ${userAgent}`.toLowerCase();
  if (source.includes('win')) return 'windows';
  if (source.includes('mac')) return 'macos';
  if (source.includes('linux') || source.includes('x11')) return 'linux';
  return 'unknown';
}

export function defaultMouseLookSettings(platform: MousePlatform): MouseLookSettings {
  return {
    baseSensitivity: DEFAULT_BASE_SENSITIVITY,
    platformScale: platform === 'windows' ? 0.82 : 1,
    maxDeltaPerFrame: platform === 'windows' ? 42 : 56,
    smoothing: platform === 'windows' ? 0.2 : 0,
    invertY: false
  };
}

export class InputManager {
  private keys = new Set<string>();
  private mouseDelta: MouseDelta = { x: 0, y: 0 };
  private smoothedMouseDelta: MouseDelta = { x: 0, y: 0 };
  private mousePosition = { x: 0, y: 0 };
  private pointerLockDenied = false;
  private rawMouseInput = false;
  private readonly mousePlatform: MousePlatform;
  private mouseSettings: MouseLookSettings;

  constructor(settings?: Partial<MouseLookSettings>, platform: MousePlatform = detectMousePlatform()) {
    this.mousePlatform = platform;
    this.mouseSettings = { ...defaultMouseLookSettings(platform), ...settings };
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    document.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
    });

    document.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });

    document.addEventListener('mousemove', (e) => {
      const delta = this.normalizeMouseDelta(e.movementX, e.movementY);
      this.mouseDelta.x += delta.x;
      this.mouseDelta.y += delta.y;
      this.mousePosition.x = e.clientX;
      this.mousePosition.y = e.clientY;
    });

    document.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.keys.add('MouseLeft');
      if (e.button === 2) this.keys.add('MouseRight');
    });

    document.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.keys.delete('MouseLeft');
      if (e.button === 2) this.keys.delete('MouseRight');
    });

    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement === document.body) {
        this.pointerLockDenied = false;
      }
      this.keys.delete('MouseLeft');
      this.keys.delete('MouseRight');
      this.mouseDelta = { x: 0, y: 0 };
      this.smoothedMouseDelta = { x: 0, y: 0 };
    });

    document.addEventListener('pointerlockerror', () => {
      this.pointerLockDenied = true;
      this.rawMouseInput = false;
      this.keys.delete('MouseLeft');
      this.keys.delete('MouseRight');
    });
  }

  isKeyPressed(key: string): boolean {
    return this.keys.has(key);
  }

  setKeyPressed(key: string, pressed: boolean): void {
    if (pressed) {
      this.keys.add(key);
    } else {
      this.keys.delete(key);
    }
  }

  getMouseDelta(): MouseDelta {
    const delta = { ...this.mouseDelta };
    this.mouseDelta = { x: 0, y: 0 };
    return delta;
  }

  setMouseDelta(x: number, y: number): void {
    this.mouseDelta = { x, y };
  }

  getMousePlatform(): MousePlatform {
    return this.mousePlatform;
  }

  getMouseSettings(): MouseLookSettings {
    return { ...this.mouseSettings };
  }

  setMouseSettings(settings: Partial<MouseLookSettings>): void {
    this.mouseSettings = { ...this.mouseSettings, ...settings };
  }

  getPointerLockInfo(): PointerLockInfo {
    return {
      locked: this.isPointerLocked(),
      denied: this.pointerLockDenied,
      rawMouseInput: this.rawMouseInput
    };
  }

  getMousePosition(): { x: number; y: number } {
    return { ...this.mousePosition };
  }

  getPressedKeys(): string[] {
    return Array.from(this.keys);
  }

  async requestPointerLock(): Promise<boolean> {
    if (!this.isPointerLocked()) {
      try {
        await this.requestPointerLockWithOptions({ unadjustedMovement: true });
        this.rawMouseInput = true;
        this.pointerLockDenied = false;
      } catch {
        try {
          await this.requestPointerLockWithOptions();
          this.rawMouseInput = false;
          this.pointerLockDenied = false;
        } catch {
          this.rawMouseInput = false;
          this.pointerLockDenied = true;
        }
      }
    }
    return this.isPointerLocked();
  }

  exitPointerLock(): void {
    if (this.isPointerLocked()) {
      document.exitPointerLock();
    }
    this.keys.delete('MouseLeft');
    this.keys.delete('MouseRight');
    this.mouseDelta = { x: 0, y: 0 };
    this.smoothedMouseDelta = { x: 0, y: 0 };
    this.rawMouseInput = false;
  }

  isPointerLocked(): boolean {
    return document.pointerLockElement === document.body;
  }

  wasPointerLockDenied(): boolean {
    return this.pointerLockDenied;
  }

  clearActionKeys(): void {
    this.keys.delete('MouseLeft');
    this.keys.delete('MouseRight');
    this.keys.delete('Space');
  }

  private normalizeMouseDelta(x: number, y: number): MouseDelta {
    const settings = this.mouseSettings;
    const clampedX = Math.max(-settings.maxDeltaPerFrame, Math.min(settings.maxDeltaPerFrame, x));
    const clampedY = Math.max(-settings.maxDeltaPerFrame, Math.min(settings.maxDeltaPerFrame, y));
    const scaled: MouseDelta = {
      x: clampedX * settings.baseSensitivity * settings.platformScale,
      y: clampedY * settings.baseSensitivity * settings.platformScale * (settings.invertY ? -1 : 1)
    };

    if (settings.smoothing <= 0) return scaled;

    const smoothing = Math.max(0, Math.min(0.95, settings.smoothing));
    this.smoothedMouseDelta = {
      x: this.smoothedMouseDelta.x * smoothing + scaled.x * (1 - smoothing),
      y: this.smoothedMouseDelta.y * smoothing + scaled.y * (1 - smoothing)
    };
    return { ...this.smoothedMouseDelta };
  }

  private requestPointerLockWithOptions(options?: { unadjustedMovement: boolean }): Promise<void> {
    const request = document.body.requestPointerLock as (options?: { unadjustedMovement: boolean }) => Promise<void> | void;
    return Promise.resolve(request.call(document.body, options));
  }
}
