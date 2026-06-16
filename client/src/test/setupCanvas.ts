import { vi } from 'vitest';

class CanvasGradientStub {
  addColorStop = vi.fn();
}

const context2dStub = {
  canvas: null,
  fillStyle: '#000',
  strokeStyle: '#000',
  lineWidth: 1,
  globalAlpha: 1,
  font: '10px sans-serif',
  textAlign: 'left',
  textBaseline: 'alphabetic',
  beginPath: vi.fn(),
  closePath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  arc: vi.fn(),
  ellipse: vi.fn(),
  rect: vi.fn(),
  fill: vi.fn(),
  stroke: vi.fn(),
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  strokeRect: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  scale: vi.fn(),
  createRadialGradient: vi.fn(() => new CanvasGradientStub()),
  createLinearGradient: vi.fn(() => new CanvasGradientStub()),
  measureText: vi.fn((text: string) => ({ width: text.length * 8 })),
  fillText: vi.fn(),
  strokeText: vi.fn(),
  getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 })),
  putImageData: vi.fn()
};

vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function getContext(type: string) {
  if (type === '2d') {
    return { ...context2dStub, canvas: this } as unknown as CanvasRenderingContext2D;
  }
  return null;
});
