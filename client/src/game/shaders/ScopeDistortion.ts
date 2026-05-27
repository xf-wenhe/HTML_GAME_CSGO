import * as THREE from 'three';

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying vec2 vUv;
  uniform sampler2D tDiffuse;
  uniform float u_distortionStrength;
  uniform float u_time;
  uniform float u_scopeRadius;
  uniform vec2 u_scopeCenter;

  void main() {
    vec2 center = vUv - u_scopeCenter;
    float dist = length(center);
    float distNorm = dist / u_scopeRadius;

    // Chromatic aberration: radial shift of R and B channels
    float rShift = distNorm * u_distortionStrength * 0.015;
    float bShift = -distNorm * u_distortionStrength * 0.010;

    vec2 dir = normalize(center + 0.001);
    vec4 r = texture2D(tDiffuse, vUv + dir * rShift);
    vec4 g = texture2D(tDiffuse, vUv);
    vec4 b = texture2D(tDiffuse, vUv + dir * bShift);

    vec4 color = vec4(r.r, g.g, b.b, 1.0);

    // Vignette: darken toward edges of scope circle
    float vignette = 1.0 - smoothstep(0.5, 1.0, distNorm) * 0.55;
    color.rgb *= vignette;

    // Fully transparent outside scope
    float alpha = 1.0 - smoothstep(0.85, 1.0, distNorm);
    color.a = alpha;

    gl_FragColor = color;
  }
`;

export class ScopeDistortionPass {
  private material: THREE.ShaderMaterial;
  private quad: THREE.Mesh;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private enabled = false;

  constructor() {
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        tDiffuse: { value: null },
        u_distortionStrength: { value: 0.6 },
        u_time: { value: 0 },
        u_scopeRadius: { value: 0.35 },
        u_scopeCenter: { value: new THREE.Vector2(0.5, 0.5) },
      },
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });

    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.scene = new THREE.Scene();
    this.scene.add(this.quad);

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }

  enable(): void { this.enabled = true; }
  disable(): void { this.enabled = false; }
  isEnabled(): boolean { return this.enabled; }

  render(renderer: THREE.WebGLRenderer, sourceTexture: THREE.Texture, time: number): void {
    if (!this.enabled) return;
    this.material.uniforms.tDiffuse.value = sourceTexture;
    this.material.uniforms.u_time.value = time;
    renderer.render(this.scene, this.camera);
  }

  setDistortionStrength(value: number): void {
    this.material.uniforms.u_distortionStrength.value = value;
  }

  dispose(): void {
    this.material.dispose();
    this.quad.geometry.dispose();
  }
}
