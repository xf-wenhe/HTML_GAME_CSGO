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
    smoothing: 0,
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
  private touchControlsActive = false;
  private touchLookPointerId: number | null = null;
  private touchLookLastPosition: { x: number; y: number } | null = null;
  private touchStickPointerId: number | null = null;
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

  consumeKeyPress(key: string): boolean {
    const pressed = this.keys.has(key);
    this.keys.delete(key);
    return pressed;
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

  isTouchControlsActive(): boolean {
    return this.touchControlsActive;
  }

  bindTouchControls(root: HTMLElement): void {
    if (!this.shouldUseTouchControls()) return;
    this.touchControlsActive = true;
    this.bindTouchLook(root.querySelector<HTMLElement>('.touch-look-zone'));
    this.bindTouchStick(root.querySelector<HTMLElement>('.touch-stick-base'), root.querySelector<HTMLElement>('.touch-stick-knob'));
    root.querySelectorAll<HTMLElement>('[data-touch-key]').forEach(button => this.bindTouchButton(button));
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
    this.keys.delete('KeyR');
    this.keys.delete('KeyE');
    this.keys.delete('KeyB');
    this.keys.delete('Digit1');
    this.keys.delete('Digit2');
    this.keys.delete('Digit3');
    this.keys.delete('Digit4');
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

  private bindTouchButton(button: HTMLElement): void {
    const key = button.dataset.touchKey;
    if (!key) return;
    const mode = button.dataset.touchMode ?? 'hold';
    button.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      this.keys.add(key);
      button.classList.add('active');
      if (mode === 'tap') {
        window.setTimeout(() => this.keys.delete(key), 120);
      }
    });
    const release = (event: PointerEvent) => {
      event.preventDefault();
      button.classList.remove('active');
      if (mode !== 'tap') this.keys.delete(key);
      if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId);
    };
    button.addEventListener('pointerup', release);
    button.addEventListener('pointercancel', release);
    button.addEventListener('lostpointercapture', () => {
      button.classList.remove('active');
      if (mode !== 'tap') this.keys.delete(key);
    });
  }

  private bindTouchLook(zone: HTMLElement | null): void {
    if (!zone) return;
    zone.addEventListener('pointerdown', (event) => {
      if (this.touchLookPointerId !== null) return;
      event.preventDefault();
      this.touchLookPointerId = event.pointerId;
      this.touchLookLastPosition = { x: event.clientX, y: event.clientY };
      zone.setPointerCapture(event.pointerId);
    });
    zone.addEventListener('pointermove', (event) => {
      if (event.pointerId !== this.touchLookPointerId || !this.touchLookLastPosition) return;
      event.preventDefault();
      const delta = this.normalizeMouseDelta((event.clientX - this.touchLookLastPosition.x) * 2.2, (event.clientY - this.touchLookLastPosition.y) * 2.2);
      this.mouseDelta.x += delta.x;
      this.mouseDelta.y += delta.y;
      this.touchLookLastPosition = { x: event.clientX, y: event.clientY };
    });
    const release = (event: PointerEvent) => {
      if (event.pointerId !== this.touchLookPointerId) return;
      event.preventDefault();
      this.touchLookPointerId = null;
      this.touchLookLastPosition = null;
      if (zone.hasPointerCapture(event.pointerId)) zone.releasePointerCapture(event.pointerId);
    };
    zone.addEventListener('pointerup', release);
    zone.addEventListener('pointercancel', release);
  }

  private bindTouchStick(base: HTMLElement | null, knob: HTMLElement | null): void {
    if (!base || !knob) return;
    const movementKeys = ['KeyW', 'KeyA', 'KeyS', 'KeyD'];
    const releaseMovement = () => {
      movementKeys.forEach(key => this.keys.delete(key));
      knob.style.transform = 'translate(-50%, -50%)';
      this.touchStickPointerId = null;
    };
    const updateMovement = (clientX: number, clientY: number) => {
      const rect = base.getBoundingClientRect();
      const radius = rect.width / 2;
      const dx = clientX - (rect.left + radius);
      const dy = clientY - (rect.top + radius);
      const distance = Math.hypot(dx, dy);
      const clamped = distance > radius ? radius / distance : 1;
      const nx = (dx * clamped) / radius;
      const ny = (dy * clamped) / radius;
      movementKeys.forEach(key => this.keys.delete(key));
      if (ny < -0.25) this.keys.add('KeyW');
      if (ny > 0.25) this.keys.add('KeyS');
      if (nx < -0.25) this.keys.add('KeyA');
      if (nx > 0.25) this.keys.add('KeyD');
      knob.style.transform = `translate(calc(-50% + ${nx * radius * 0.55}px), calc(-50% + ${ny * radius * 0.55}px))`;
    };
    base.addEventListener('pointerdown', (event) => {
      if (this.touchStickPointerId !== null) return;
      event.preventDefault();
      this.touchStickPointerId = event.pointerId;
      base.setPointerCapture(event.pointerId);
      updateMovement(event.clientX, event.clientY);
    });
    base.addEventListener('pointermove', (event) => {
      if (event.pointerId !== this.touchStickPointerId) return;
      event.preventDefault();
      updateMovement(event.clientX, event.clientY);
    });
    const release = (event: PointerEvent) => {
      if (event.pointerId !== this.touchStickPointerId) return;
      event.preventDefault();
      releaseMovement();
      if (base.hasPointerCapture(event.pointerId)) base.releasePointerCapture(event.pointerId);
    };
    base.addEventListener('pointerup', release);
    base.addEventListener('pointercancel', release);
  }

  private shouldUseTouchControls(): boolean {
    return navigator.maxTouchPoints > 0 || window.matchMedia?.('(pointer: coarse)').matches === true;
  }

  private requestPointerLockWithOptions(options?: { unadjustedMovement: boolean }): Promise<void> {
    const request = document.body.requestPointerLock as (options?: { unadjustedMovement: boolean }) => Promise<void> | void;
    return Promise.resolve(request.call(document.body, options));
  }
}
