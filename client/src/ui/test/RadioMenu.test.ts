import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RadioMenu, RadioMenuPage } from '../RadioMenu.js';

function createRadioMenu(): RadioMenu {
  const menu = new RadioMenu();
  menu.show();
  document.body.appendChild(menu.getElement());
  return menu;
}

describe('RadioMenu', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.useFakeTimers();
  });

  it('renders the message container', () => {
    const menu = createRadioMenu();
    const el = menu.getElement();
    expect(el.classList.contains('radio-menu')).toBe(true);
    expect(el.querySelector('.radio-menu-messages')).not.toBeNull();
    menu.dispose();
  });

  it('starts closed with no page', () => {
    const menu = new RadioMenu();
    expect(menu.isOpen()).toBe(false);
    menu.dispose();
  });

  it('opens and closes a menu page', () => {
    const menu = createRadioMenu();
    menu.open('z');
    expect(menu.isOpen()).toBe(true);
    expect(menu.getElement().querySelector('.radio-menu-panel')).not.toBeNull();
    menu.open(null);
    expect(menu.isOpen()).toBe(false);
    expect(menu.getElement().querySelector('.radio-menu-panel')).toBeNull();
    menu.dispose();
  });

  it('toggles close when opening the same page twice', () => {
    const menu = createRadioMenu();
    menu.open('z');
    expect(menu.isOpen()).toBe(true);
    menu.open('z');
    expect(menu.isOpen()).toBe(false);
    menu.dispose();
  });

  it('switches between pages', () => {
    const menu = createRadioMenu();
    menu.open('z');
    expect(menu.getElement().querySelector('.radio-menu-header')?.textContent).toBe('团队指令');
    menu.open('x');
    expect(menu.getElement().querySelector('.radio-menu-header')?.textContent).toBe('小队指令');
    menu.open('c');
    expect(menu.getElement().querySelector('.radio-menu-header')?.textContent).toBe('通讯指令');
    menu.dispose();
  });

  it('shows 6 commands per page', () => {
    const menu = createRadioMenu();
    menu.open('z');
    const options = menu.getElement().querySelectorAll('.radio-menu-option');
    expect(options.length).toBe(6);
    expect(options[0].textContent?.trim()).toContain('收到');
    expect(options[5].textContent?.trim()).toContain('掩护我');
    menu.dispose();
  });

  it('selects a command via number key and emits', () => {
    const menu = createRadioMenu();
    const handler = vi.fn();
    menu.onCommandSelected(handler);
    menu.open('z');
    menu.selectNumber(1);
    expect(handler).toHaveBeenCalledWith('z', 1, '收到');
    menu.dispose();
  });

  it('ignores invalid number keys', () => {
    const menu = createRadioMenu();
    const handler = vi.fn();
    menu.onCommandSelected(handler);
    menu.open('z');
    menu.selectNumber(7);
    expect(handler).not.toHaveBeenCalled();
    menu.dispose();
  });

  it('does not select when no page is open', () => {
    const menu = createRadioMenu();
    const handler = vi.fn();
    menu.onCommandSelected(handler);
    menu.selectNumber(1);
    expect(handler).not.toHaveBeenCalled();
    menu.dispose();
  });

  it('shows a message after command selection', () => {
    const menu = createRadioMenu();
    menu.open('z');
    menu.selectNumber(3);
    const msgEl = menu.getElement().querySelector('.radio-message-entry');
    expect(msgEl).not.toBeNull();
    expect(msgEl?.textContent).toContain('前进');
    menu.dispose();
  });

  it('limits displayed messages to 3', () => {
    const menu = createRadioMenu();
    menu.open('z');
    menu.selectNumber(1);
    menu.selectNumber(2);
    menu.selectNumber(3);
    menu.selectNumber(4);
    const messages = menu.getElement().querySelectorAll('.radio-message-entry');
    expect(messages.length).toBe(3);
    menu.dispose();
  });

  it('auto-removes messages after timeout', () => {
    vi.useFakeTimers();
    const menu = createRadioMenu();
    menu.open('z');
    menu.selectNumber(1);
    const msgEl = menu.getElement().querySelector('.radio-message-entry');
    expect(msgEl).not.toBeNull();
    vi.advanceTimersByTime(3800);
    expect(menu.getElement().querySelector('.radio-message-entry')).toBeNull();
    menu.dispose();
    vi.useRealTimers();
  });

  it('dispose cleans up the element and timers', () => {
    const menu = createRadioMenu();
    menu.open('z');
    menu.selectNumber(1);
    menu.dispose();
    expect(document.querySelector('.radio-menu')).toBeNull();
  });
});
