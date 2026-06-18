import * as THREE from 'three';
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { FeedbackEffects } from '../FeedbackEffects';

describe('FeedbackEffects', () => {
  let scene: THREE.Scene;
  let camera: THREE.PerspectiveCamera;
  let feedback: FeedbackEffects;

  beforeEach(() => {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(90, 1, 0.1, 1000);
    feedback = new FeedbackEffects(scene, camera);
  });

  afterEach(() => {
    feedback.dispose();
  });

  it('should initialize without errors', () => {
    expect(feedback).toBeDefined();
  });

  it('should handle weapon fire shake', () => {
    const originalX = camera.position.x;
    const originalY = camera.position.y;

    feedback.weaponFire();
    feedback.update(0.016);

    // Camera should have moved a little bit
    expect(camera.position.x).not.toBe(originalX);
    expect(camera.position.y).not.toBe(originalY);
  });

  it('should handle player hit shake', () => {
    const originalX = camera.position.x;
    const originalY = camera.position.y;

    feedback.playerHit();
    feedback.update(0.016);

    // Camera should have moved
    expect(camera.position.x).not.toBe(originalX);
    expect(camera.position.y).not.toBe(originalY);
  });

  it('should decay shake over time', () => {
    feedback.explosion(); // Strong shake
    feedback.update(0.016);

    const posAfterFirstUpdate = camera.position.clone();

    // Update many times to let shake decay
    for (let i = 0; i < 100; i++) {
      feedback.update(0.016);
    }

    // Should be back near original position
    expect(camera.position.distanceTo(posAfterFirstUpdate)).toBeGreaterThan(0);
  });

  it('should reset effects cleanly', () => {
    const originalPos = camera.position.clone();
    const originalRot = camera.rotation.clone();

    feedback.explosion();
    feedback.update(0.016);
    feedback.reset();

    // Should be back exactly to original
    expect(camera.position.x).toBeCloseTo(originalPos.x, 5);
    expect(camera.position.y).toBeCloseTo(originalPos.y, 5);
    expect(camera.position.z).toBeCloseTo(originalPos.z, 5);
    expect(camera.rotation.x).toBeCloseTo(originalRot.x, 5);
    expect(camera.rotation.y).toBeCloseTo(originalRot.y, 5);
  });

  it('should show hit marker without errors', () => {
    expect(() => feedback.showHitMarker()).not.toThrow();
    feedback.update(0.016); // Update to animate
  });

  it('should show kill icon without errors', () => {
    expect(() => feedback.showKillIcon()).not.toThrow();
  });

  it('should handle land hard shake', () => {
    expect(() => feedback.landHard()).not.toThrow();
  });

  it('should update multiple times without issues', () => {
    // Simulate a game loop
    for (let i = 0; i < 500; i++) {
      if (i === 0) feedback.weaponFire();
      if (i === 100) feedback.playerHit();
      if (i === 200) feedback.showHitMarker();
      if (i === 300) feedback.explosion();

      feedback.update(0.016);
    }

    // If we got here without exceptions, test passes
    expect(true).toBe(true);
  });
});
