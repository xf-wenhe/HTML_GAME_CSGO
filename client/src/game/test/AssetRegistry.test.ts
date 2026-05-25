import { existsSync, statSync } from 'node:fs';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { ASSETS, loadAsset } from '../assets.js';

describe('GLB asset registry', () => {
  it('ships local GLB files for all primary weapon and enemy assets', () => {
    for (const asset of Object.values(ASSETS)) {
      const localPath = `client/public${asset.path}`;
      expect(existsSync(localPath), `${asset.id} should have a local GLB`).toBe(true);
      expect(statSync(localPath).size, `${asset.id} GLB should not be empty`).toBeGreaterThan(1024);
    }
  });

  it('keeps model transforms explicit for GLB viewmodels', () => {
    for (const asset of Object.values(ASSETS)) {
      expect(asset.scale, `${asset.id} should define a performance-conscious scale`).toBeGreaterThan(0);
      expect(asset.rotation, `${asset.id} should define a model orientation`).toBeDefined();
    }
  });

  it('keeps the enemy replacement model large enough to see after async load', async () => {
    const model = await loadAsset(ASSETS.enemy_assault);
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());

    expect(size.y).toBeGreaterThan(1.6);
    expect(size.y).toBeLessThan(2.8);
  });
});
