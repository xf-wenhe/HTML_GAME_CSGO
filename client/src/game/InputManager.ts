export interface MouseDelta {
  x: number;
  y: number;
}

export class InputManager {
  private keys = new Set<string>();
  private mouseDelta: MouseDelta = { x: 0, y: 0 };
  private mousePosition = { x: 0, y: 0 };

  constructor() {
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
      this.mouseDelta.x += e.movementX;
      this.mouseDelta.y += e.movementY;
      this.mousePosition.x = e.clientX;
      this.mousePosition.y = e.clientY;
    });

    document.addEventListener('mousedown', (e) => {
      if (e.button === 0) this.keys.add('MouseLeft');
    });

    document.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.keys.delete('MouseLeft');
    });

    document.addEventListener('pointerlockchange', () => {
      this.keys.delete('MouseLeft');
      this.mouseDelta = { x: 0, y: 0 };
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

  getMousePosition(): { x: number; y: number } {
    return { ...this.mousePosition };
  }

  getPressedKeys(): string[] {
    return Array.from(this.keys);
  }

  requestPointerLock(): void {
    if (!this.isPointerLocked()) {
      void document.body.requestPointerLock();
    }
  }

  exitPointerLock(): void {
    if (this.isPointerLocked()) {
      document.exitPointerLock();
    }
    this.keys.delete('MouseLeft');
    this.mouseDelta = { x: 0, y: 0 };
  }

  isPointerLocked(): boolean {
    return document.pointerLockElement === document.body;
  }

  clearActionKeys(): void {
    this.keys.delete('MouseLeft');
    this.keys.delete('Space');
  }
}
