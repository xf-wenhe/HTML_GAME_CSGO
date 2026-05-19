import { Scene } from './game/Scene.js';
import { Physics } from './game/Physics.js';
import { InputManager } from './game/InputManager.js';
import { PlayerController } from './game/PlayerController.js';

const scene = new Scene();
const physics = new Physics();
const input = new InputManager();
const player = new PlayerController(scene, physics, input);

document.getElementById('app')?.appendChild(scene.getCanvas());

document.addEventListener('click', () => {
  input.requestPointerLock();
});

function gameLoop() {
  player.update(0.016);
  physics.step(0.016);
  scene.render();
  requestAnimationFrame(gameLoop);
}

gameLoop();

export { scene, physics, input, player };