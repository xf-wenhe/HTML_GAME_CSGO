import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CrosshairEditor, DEFAULT_CROSSHAIR } from '../CrosshairEditor.js';

function createEditor(): CrosshairEditor {
  const editor = new CrosshairEditor();
  document.body.appendChild(editor.getElement());
  return editor;
}

describe('CrosshairEditor', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts hidden', () => {
    const editor = createEditor();
    expect(editor.getElement().classList.contains('hidden')).toBe(true);
    editor.getElement().remove();
  });

  it('shows and hides the panel', () => {
    const editor = createEditor();
    editor.show();
    expect(editor.getElement().classList.contains('hidden')).toBe(false);
    editor.hide();
    expect(editor.getElement().classList.contains('hidden')).toBe(true);
    editor.getElement().remove();
  });

  it('returns default settings on construction', () => {
    const editor = createEditor();
    const settings = editor.getSettings();
    expect(settings.size).toBe(DEFAULT_CROSSHAIR.size);
    expect(settings.thickness).toBe(DEFAULT_CROSSHAIR.thickness);
    expect(settings.gap).toBe(DEFAULT_CROSSHAIR.gap);
    expect(settings.centerDot).toBe(DEFAULT_CROSSHAIR.centerDot);
    expect(settings.outline).toBe(DEFAULT_CROSSHAIR.outline);
    expect(settings.color).toBe(DEFAULT_CROSSHAIR.color);
    expect(settings.opacity).toBe(DEFAULT_CROSSHAIR.opacity);
    expect(settings.style).toBe(DEFAULT_CROSSHAIR.style);
    editor.getElement().remove();
  });

  it('syncs from settings via syncFromSettings', () => {
    const editor = createEditor();
    editor.syncFromSettings({
      crosshairStyle: 'dot',
      crosshairColor: 'cyan',
      crosshairSize: 12,
      crosshairThickness: 3,
      crosshairGap: 8,
      crosshairCenterDot: true,
      crosshairOutline: false,
      crosshairOpacity: 0.8,
    });
    const s = editor.getSettings();
    expect(s.style).toBe('dot');
    expect(s.color).toBe('#00c8dc');
    expect(s.size).toBe(12);
    expect(s.thickness).toBe(3);
    expect(s.gap).toBe(8);
    expect(s.centerDot).toBe(true);
    expect(s.outline).toBe(false);
    expect(s.opacity).toBe(0.8);
    editor.getElement().remove();
  });

  it('converts named colors to hex in syncFromSettings', () => {
    const editor = createEditor();
    editor.syncFromSettings({
      crosshairStyle: 'classic',
      crosshairColor: 'white',
      crosshairSize: 8,
      crosshairThickness: 2,
      crosshairGap: 5,
      crosshairCenterDot: false,
      crosshairOutline: true,
      crosshairOpacity: 0.92,
    });
    expect(editor.getSettings().color).toBe('#dcdcdc');
    editor.getElement().remove();
  });

  it('invokes onApply handler when settings change', () => {
    const editor = createEditor();
    const handler = vi.fn();
    editor.onApplyHandler(handler);
    editor.show();

    const styleSelect = editor.getElement().querySelector('#ch-style') as HTMLSelectElement;
    styleSelect.value = 't-cross';
    styleSelect.dispatchEvent(new Event('change'));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].style).toBe('t-cross');
    editor.getElement().remove();
  });

  it('invokes onClose handler when panel is closed', () => {
    const editor = createEditor();
    const handler = vi.fn();
    editor.onCloseHandler(handler);
    editor.hide();
    expect(handler).toHaveBeenCalledTimes(1);
    editor.getElement().remove();
  });

  it('renders the preview crosshair elements', () => {
    const editor = createEditor();
    editor.show();
    const preview = editor.getElement().querySelector('.crosshair-preview');
    expect(preview).not.toBeNull();
    expect(preview.querySelector('.ch-top')).not.toBeNull();
    expect(preview.querySelector('.ch-bottom')).not.toBeNull();
    expect(preview.querySelector('.ch-left')).not.toBeNull();
    expect(preview.querySelector('.ch-right')).not.toBeNull();
    expect(preview.querySelector('.ch-dot')).not.toBeNull();
    editor.getElement().remove();
  });

  it('contains all color preset buttons', () => {
    const editor = createEditor();
    editor.show();
    const presets = editor.getElement().querySelectorAll('.color-preset');
    expect(presets.length).toBeGreaterThanOrEqual(4);
    editor.getElement().remove();
  });

  it('has slider controls for size, thickness, gap, opacity', () => {
    const editor = createEditor();
    editor.show();
    expect(editor.getElement().querySelector('#ch-size')).not.toBeNull();
    expect(editor.getElement().querySelector('#ch-thickness')).not.toBeNull();
    expect(editor.getElement().querySelector('#ch-gap')).not.toBeNull();
    expect(editor.getElement().querySelector('#ch-opacity')).not.toBeNull();
    editor.getElement().remove();
  });

  it('has toggle buttons for center dot and outline', () => {
    const editor = createEditor();
    editor.show();
    expect(editor.getElement().querySelector('#ch-center-dot')).not.toBeNull();
    expect(editor.getElement().querySelector('#ch-outline')).not.toBeNull();
    editor.getElement().remove();
  });

  it('has style select with all four options', () => {
    const editor = createEditor();
    editor.show();
    const select = editor.getElement().querySelector('#ch-style') as HTMLSelectElement;
    expect(select).not.toBeNull();
    const options = Array.from(select.options).map(o => o.value);
    expect(options).toEqual(['classic', 'dot', 't-cross', 'static']);
    editor.getElement().remove();
  });

  it('updates preview when size changes', () => {
    const editor = createEditor();
    editor.show();
    const sizeSlider = editor.getElement().querySelector('#ch-size') as HTMLInputElement;
    sizeSlider.value = '15';
    sizeSlider.dispatchEvent(new Event('input'));

    const settings = editor.getSettings();
    expect(settings.size).toBe(15);
    editor.getElement().remove();
  });

  it('updates preview when thickness changes', () => {
    const editor = createEditor();
    editor.show();
    const slider = editor.getElement().querySelector('#ch-thickness') as HTMLInputElement;
    slider.value = '4';
    slider.dispatchEvent(new Event('input'));
    expect(editor.getSettings().thickness).toBe(4);
    editor.getElement().remove();
  });

  it('updates preview when gap changes', () => {
    const editor = createEditor();
    editor.show();
    const slider = editor.getElement().querySelector('#ch-gap') as HTMLInputElement;
    slider.value = '10';
    slider.dispatchEvent(new Event('input'));
    expect(editor.getSettings().gap).toBe(10);
    editor.getElement().remove();
  });

  it('toggles center dot', () => {
    const editor = createEditor();
    editor.show();
    const btn = editor.getElement().querySelector('#ch-center-dot') as HTMLButtonElement;
    expect(editor.getSettings().centerDot).toBe(false);
    btn.click();
    expect(editor.getSettings().centerDot).toBe(true);
    btn.click();
    expect(editor.getSettings().centerDot).toBe(false);
    editor.getElement().remove();
  });

  it('toggles outline', () => {
    const editor = createEditor();
    editor.show();
    const btn = editor.getElement().querySelector('#ch-outline') as HTMLButtonElement;
    expect(editor.getSettings().outline).toBe(true);
    btn.click();
    expect(editor.getSettings().outline).toBe(false);
    btn.click();
    expect(editor.getSettings().outline).toBe(true);
    editor.getElement().remove();
  });

  it('updates opacity', () => {
    const editor = createEditor();
    editor.show();
    const slider = editor.getElement().querySelector('#ch-opacity') as HTMLInputElement;
    slider.value = '0.5';
    slider.dispatchEvent(new Event('input'));
    expect(editor.getSettings().opacity).toBeCloseTo(0.5);
    editor.getElement().remove();
  });

  it('resets to defaults when reset button clicked', () => {
    const editor = createEditor();
    editor.syncFromSettings({
      crosshairStyle: 'dot',
      crosshairColor: 'red',
      crosshairSize: 20,
      crosshairThickness: 6,
      crosshairGap: 15,
      crosshairCenterDot: true,
      crosshairOutline: false,
      crosshairOpacity: 0.5,
    });
    expect(editor.getSettings().size).toBe(20);

    editor.show();
    const resetBtn = editor.getElement().querySelector('#ch-reset');
    resetBtn?.click();

    const s = editor.getSettings();
    expect(s.size).toBe(DEFAULT_CROSSHAIR.size);
    expect(s.thickness).toBe(DEFAULT_CROSSHAIR.thickness);
    expect(s.gap).toBe(DEFAULT_CROSSHAIR.gap);
    expect(s.style).toBe(DEFAULT_CROSSHAIR.style);
    expect(s.color).toBe(DEFAULT_CROSSHAIR.color);
    editor.getElement().remove();
  });

  it('getSettings returns a copy, not the internal state', () => {
    const editor = createEditor();
    const a = editor.getSettings();
    const b = editor.getSettings();
    expect(a).not.toBe(b);
    expect(a.size).toBe(b.size);
    editor.getElement().remove();
  });
});
