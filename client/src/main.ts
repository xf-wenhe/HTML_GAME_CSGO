import { Scene } from './game/Scene.js';

const scene = new Scene();
document.getElementById('app')?.appendChild(scene.getCanvas());
scene.startRenderLoop();

export { scene };