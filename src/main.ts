import './style.css';
import { Game } from './core/Game';
import { Hud } from './core/hud';
import { Renderer } from './core/Renderer';

const container = document.querySelector<HTMLElement>('.cont');
if (!container) throw new Error('Game container ".cont" not found');

let renderer: Renderer;
try {
  renderer = await Renderer.create(container);
} catch (err) {
  container.textContent = 'This game requires WebGPU, which is not available in your browser.';
  throw err;
}

const hud = new Hud();
const game = new Game(renderer, hud);

function loop(): void {
  renderer.tick();
  game.frame();
  renderer.present();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
