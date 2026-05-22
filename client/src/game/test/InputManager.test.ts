import { afterEach, describe, expect, it, vi } from 'vitest';
import { InputManager, defaultMouseLookSettings, detectMousePlatform } from '../InputManager.js';

describe('InputManager mouse look normalization', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('detects common desktop mouse platforms', () => {
    expect(detectMousePlatform('Mozilla/5.0', 'Win32')).toBe('windows');
    expect(detectMousePlatform('Mozilla/5.0', 'MacIntel')).toBe('macos');
    expect(detectMousePlatform('X11; Linux x86_64', 'Linux x86_64')).toBe('linux');
  });

  it('uses a lower default Windows scale than macOS', () => {
    expect(defaultMouseLookSettings('windows').platformScale).toBeLessThan(defaultMouseLookSettings('macos').platformScale);
  });

  it('normalizes raw mouse movement with scale and frame clamping', () => {
    const input = new InputManager(
      { baseSensitivity: 0.01, platformScale: 0.5, maxDeltaPerFrame: 20, smoothing: 0 },
      'windows'
    );

    document.dispatchEvent(createMouseMove(100, -100));

    expect(input.getMouseDelta()).toEqual({ x: 0.1, y: -0.1 });
  });

  it('smooths Windows mouse deltas when configured', () => {
    const input = new InputManager(
      { baseSensitivity: 1, platformScale: 1, maxDeltaPerFrame: 100, smoothing: 0.5 },
      'windows'
    );

    document.dispatchEvent(createMouseMove(10, 0));
    document.dispatchEvent(createMouseMove(10, 0));

    expect(input.getMouseDelta().x).toBeCloseTo(12.5, 5);
  });

  it('falls back to regular Pointer Lock when unadjusted movement is rejected', async () => {
    let locked = false;
    Object.defineProperty(document.body, 'requestPointerLock', {
      configurable: true,
      value: () => Promise.resolve()
    });
    const requestPointerLock = vi
      .spyOn(document.body, 'requestPointerLock')
      .mockImplementation((options?: unknown) => {
        if (options) return Promise.reject(new Error('raw input unsupported'));
        locked = true;
        return Promise.resolve();
      });
    Object.defineProperty(document, 'pointerLockElement', {
      configurable: true,
      get: () => locked ? document.body : null
    });

    const input = new InputManager(undefined, 'windows');
    await expect(input.requestPointerLock()).resolves.toBe(true);

    expect(requestPointerLock).toHaveBeenCalledTimes(2);
    expect(input.getPointerLockInfo()).toMatchObject({ locked: true, denied: false, rawMouseInput: false });
  });
});

function createMouseMove(movementX: number, movementY: number): MouseEvent {
  const event = new MouseEvent('mousemove', { clientX: 100, clientY: 100 });
  Object.defineProperty(event, 'movementX', { value: movementX });
  Object.defineProperty(event, 'movementY', { value: movementY });
  return event;
}
