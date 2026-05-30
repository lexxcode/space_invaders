import './style.css';
import { Game } from './core/Game';
import { Hud } from './core/hud';
import { Renderer } from './core/Renderer';

const container = document.querySelector<HTMLElement>('.cont');
if (!container) throw new Error('Game container ".cont" not found');

const renderer = new Renderer(container);
const hud = new Hud();
const game = new Game(renderer, hud);

function loop(): void {
  renderer.tick();
  game.frame();
  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
