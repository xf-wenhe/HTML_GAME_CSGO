import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('main weapon input routing', () => {
  const mainSource = () => readFileSync(resolve(process.cwd(), 'client/src/main.ts'), 'utf8');

  it('routes right-click knife attacks through the networked shot handler', () => {
    const source = mainSource();
    const start = source.indexOf("input.isKeyPressed('MouseRight')");
    const end = source.indexOf('const wantsPrimaryFire', start);
    const rightClickBlock = source.slice(start, end);

    expect(rightClickBlock).toContain('handleWeaponShotResult(result, now)');
    expect(rightClickBlock).not.toContain('applyLocalWeaponHit(result, now)');
  });

  it('lets multiplayer buy menu availability follow the server buy-time flag', () => {
    const source = mainSource();
    const start = source.indexOf('function openBuyMenu()');
    const end = source.indexOf('function closeBuyMenu', start);
    const openBuyMenuBlock = source.slice(start, end);

    expect(openBuyMenuBlock).toContain('currentSnapshot.buyTimeActive === false');
    expect(openBuyMenuBlock).not.toContain("currentSnapshot.phase !== 'buy'");
  });
});
