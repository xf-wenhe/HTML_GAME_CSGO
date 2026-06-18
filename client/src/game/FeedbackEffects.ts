import * as THREE from 'three';

/**
 * Feedback Effects Manager
 * Handles screen shake, hit markers, and visual feedback
 */
export class FeedbackEffects {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;

  // Shake parameters
  private shakeIntensity: number = 0;
  private shakeDecay: number = 0.9;
  private maxShakeIntensity: number = 0.15;
  private isShaking: boolean = false;

  // Camera original position for shake
  private originalCameraPosition: THREE.Vector3 = new THREE.Vector3();
  private originalCameraRotation: THREE.Euler = new THREE.Euler();

  // Hit marker - will be created lazily
  private hitMarkerSprite: THREE.Sprite | null = null;
  private hitMarkerVisible: boolean = false;
  private hitMarkerTime: number = 0;
  private hitMarkerDuration: number = 0.12;

  // Kill feed icons
  private killIcons: THREE.Sprite[] = [];
  private maxKillIcons: number = 5;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
    this.storeCameraState();
  }

  /**
   * Store the original camera position/rotation for shake to return to
   */
  private storeCameraState(): void {
    this.originalCameraPosition.copy(this.camera.position);
    this.originalCameraRotation.copy(this.camera.rotation);
  }

  /**
   * Start a screen shake with the given intensity
   * @param intensity Strength of the shake (0-1), will be clamped to max
   * @param decayFactor How quickly the shake dies down (0.8-0.99), higher = longer
   */
  shake(intensity: number, decayFactor: number = 0.9): void {
    this.shakeIntensity = Math.min(intensity, this.maxShakeIntensity);
    this.shakeDecay = Math.max(0.8, Math.min(0.99, decayFactor));
    this.isShaking = true;
  }

  /**
   * Shake when firing weapon - light intensity
   */
  weaponFire(): void {
    this.shake(0.03, 0.82);
  }

  /**
   * Shake when player takes damage - strong intensity
   */
  playerHit(): void {
    this.shake(0.12, 0.88);
  }

  /**
   * Shake when landing from a high fall
   */
  landHard(): void {
    this.shake(0.07, 0.85);
  }

  /**
   * Shake when nearby explosion - very strong
   */
  explosion(): void {
    this.shake(0.15, 0.92);
  }

  /**
   * Show a hit marker at the center of the screen
   */
  showHitMarker(): void {
    if (!this.hitMarkerSprite) {
      this.createHitMarker();
    }

    if (this.hitMarkerSprite) {
      this.hitMarkerSprite.visible = true;
      this.hitMarkerSprite.scale.set(0.08, 0.08, 1);
      this.hitMarkerVisible = true;
      this.hitMarkerTime = 0;
    }
  }

  /**
   * Show a kill icon (larger hit marker for kills)
   */
  showKillIcon(): void {
    this.showHitMarker();
    // Additional kill effect can be added
  }

  /**
   * Create the hit marker sprite
   */
  private createHitMarker(): void {
    // Create a canvas for the hit marker
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw cross-shaped hit marker
    ctx.clearRect(0, 0, 128, 128);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';

    // Center cross
    const cx = 64;
    const cy = 64;
    const size = 28;
    const gap = 14;

    // Top line
    ctx.beginPath();
    ctx.moveTo(cx, cy - gap - size);
    ctx.lineTo(cx, cy - gap);
    ctx.stroke();

    // Bottom line
    ctx.beginPath();
    ctx.moveTo(cx, cy + gap);
    ctx.lineTo(cx, cy + gap + size);
    ctx.stroke();

    // Left line
    ctx.beginPath();
    ctx.moveTo(cx - gap - size, cy);
    ctx.lineTo(cx - gap, cy);
    ctx.stroke();

    // Right line
    ctx.beginPath();
    ctx.moveTo(cx + gap, cy);
    ctx.lineTo(cx + gap + size, cy);
    ctx.stroke();

    // Create sprite material
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    });

    this.hitMarkerSprite = new THREE.Sprite(material);
    this.hitMarkerSprite.position.set(0, 0, -0.5); // Close to camera
    this.hitMarkerSprite.scale.set(0.08, 0.08, 1);
    this.hitMarkerSprite.visible = false;
    this.hitMarkerSprite.renderOrder = 1000; // Render on top

    // Add directly to camera so it's screen-space
    this.camera.add(this.hitMarkerSprite);
  }

  /**
   * Update the feedback effects each frame
   * @param deltaTime Time since last update in seconds
   */
  update(deltaTime: number): void {
    // Update screen shake
    if (this.isShaking && this.shakeIntensity > 0.001) {
      // Apply random offset to camera position
      const offsetX = (Math.random() - 0.5) * 2 * this.shakeIntensity;
      const offsetY = (Math.random() - 0.5) * 2 * this.shakeIntensity;
      const offsetZ = (Math.random() - 0.5) * this.shakeIntensity;

      // Apply small rotation too for more dynamic feel
      const rotX = (Math.random() - 0.5) * this.shakeIntensity * 0.5;
      const rotY = (Math.random() - 0.5) * this.shakeIntensity * 0.5;

      this.camera.position.x = this.originalCameraPosition.x + offsetX;
      this.camera.position.y = this.originalCameraPosition.y + offsetY;
      this.camera.position.z = this.originalCameraPosition.z + offsetZ;

      this.camera.rotation.x = this.originalCameraRotation.x + rotX;
      this.camera.rotation.y = this.originalCameraRotation.y + rotY;

      // Decay the shake intensity
      this.shakeIntensity *= this.shakeDecay;
    } else if (this.isShaking) {
      // Shake ended, reset camera
      this.isShaking = false;
      this.shakeIntensity = 0;
      this.camera.position.copy(this.originalCameraPosition);
      this.camera.rotation.copy(this.originalCameraRotation);
    }

    // Always refresh original camera position (player moves!)
    if (!this.isShaking) {
      this.originalCameraPosition.copy(this.camera.position);
      this.originalCameraRotation.copy(this.camera.rotation);
    }

    // Update hit marker
    if (this.hitMarkerVisible && this.hitMarkerSprite) {
      this.hitMarkerTime += deltaTime;

      // Scale down and fade out
      const progress = this.hitMarkerTime / this.hitMarkerDuration;
      if (progress < 1) {
        const scale = 0.08 * (1 - progress * 0.3);
        this.hitMarkerSprite.scale.set(scale, scale, 1);
        (this.hitMarkerSprite.material as THREE.SpriteMaterial).opacity = 1 - progress;
      } else {
        this.hitMarkerVisible = false;
        this.hitMarkerSprite.visible = false;
      }
    }
  }

  /**
   * Reset all effects
   */
  reset(): void {
    this.shakeIntensity = 0;
    this.isShaking = false;
    this.hitMarkerVisible = false;

    if (this.hitMarkerSprite) {
      this.hitMarkerSprite.visible = false;
    }

    // Reset camera
    this.camera.position.copy(this.originalCameraPosition);
    this.camera.rotation.copy(this.originalCameraRotation);
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    if (this.hitMarkerSprite) {
      this.camera.remove(this.hitMarkerSprite);
      const material = this.hitMarkerSprite.material as THREE.SpriteMaterial;
      material.map?.dispose();
      material.dispose();
      this.hitMarkerSprite.geometry.dispose();
    }
  }
}
