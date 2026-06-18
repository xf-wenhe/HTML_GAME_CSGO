import { KillFeed } from '../KillFeed.js';

describe('KillFeed', () => {
  let container: HTMLElement;
  let killFeed: KillFeed;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    killFeed = new KillFeed(container);
  });

  afterEach(() => {
    killFeed.destroy();
    container.remove();
  });

  test('should add a kill entry', () => {
    killFeed.addKill('Player1', 'Player2', 'AK-47');

    const entries = killFeed.getEntries();
    expect(entries.length).toBe(1);
    expect(entries[0].killer).toBe('Player1');
    expect(entries[0].victim).toBe('Player2');
    expect(entries[0].weapon).toBe('AK-47');
    expect(entries[0].headshot).toBe(false);
  });

  test('should add a headshot entry', () => {
    killFeed.addKill('Player1', 'Player2', 'AK-47', true);

    const entries = killFeed.getEntries();
    expect(entries.length).toBe(1);
    expect(entries[0].headshot).toBe(true);
  });

  test('should limit to max 5 entries', () => {
    for (let i = 0; i < 10; i++) {
      killFeed.addKill(`Killer${i}`, `Victim${i}`, 'AK-47');
    }

    const entries = killFeed.getEntries();
    expect(entries.length).toBe(5);
    expect(entries[0].killer).toBe('Killer9');
    expect(entries[4].killer).toBe('Killer5');
  });

  test('should clear all entries', () => {
    killFeed.addKill('Player1', 'Player2', 'AK-47');
    killFeed.addKill('Player3', 'Player4', 'M4A1');

    expect(killFeed.getEntries().length).toBe(2);

    killFeed.clear();

    expect(killFeed.getEntries().length).toBe(0);
    expect(container.children.length).toBe(0);
  });

  test('should render entries to DOM', () => {
    killFeed.addKill('Player1', 'Player2', 'AK-47');

    expect(container.children.length).toBe(1);
    expect(container.textContent).toContain('Player1');
    expect(container.textContent).toContain('Player2');
    expect(container.textContent).toContain('AK-47');
  });

  test('should render headshot indicator', () => {
    killFeed.addKill('Player1', 'Player2', 'AK-47', true);

    expect(container.textContent).toContain('爆头');
  });

  test('should remove old entries automatically', (done) => {
    jest.useFakeTimers();

    killFeed.addKill('Player1', 'Player2', 'AK-47');
    expect(killFeed.getEntries().length).toBe(1);

    jest.advanceTimersByTime(3500);

    expect(killFeed.getEntries().length).toBe(0);

    jest.useRealTimers();
    done();
  });

  test('should clean up timers on destroy', () => {
    killFeed.addKill('Player1', 'Player2', 'AK-47');
    expect(() => killFeed.destroy()).not.toThrow();
  });
});
