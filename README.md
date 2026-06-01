# Space Invaders

An HTML5 `<canvas>` clone of the classic [Space Invaders (1978)](https://lexxcode.github.io/space_invaders/), rewritten with **TypeScript** ES modules and bundled with **Vite**.

Graphics are procedural pixel-art (no image assets) rendered through **WebGPU**, sound is synthesized with the WebAudio API.

> Requires a WebGPU-capable browser (recent Chrome/Edge, Safari 17.4+, or Firefox with WebGPU enabled).

## Features

- Animated alien swarm that accelerates as you thin it out, firing from random columns.
- Destructible bunkers — chip away under fire, hide behind them.
- Mystery UFO with a random bonus.
- Lives, on-screen life icons, levels, score and persistent hi-score (localStorage).
- Player death/respawn sequence and a Game Over screen.
- Synthesized sound effects with a mute toggle.

## Controls

| Key | Action |
| --- | --- |
| ← / → | Move the ship |
| Space | Shoot |
| Esc | Pause / resume |
| M | Mute / unmute |

## Project structure

```
src/
  main.ts          # entry point + game loop
  config.ts        # tunable constants
  types.ts         # shared interfaces
  core/            # Game, Renderer, input, HUD
  entities/        # Ship, Rocket, Mob, Ufo, MobsGroup
  assets/          # images
```

## Development

```bash
npm install
npm run dev      # start the dev server
npm run build    # type-check + production build into dist/
npm run preview  # preview the production build
```

## Deployment

Pushing to `master` triggers the [GitHub Actions workflow](.github/workflows/deploy.yml) which builds the project and publishes `dist/` to GitHub Pages.

> One-time setup: in the repository **Settings → Pages**, set **Source** to **GitHub Actions**.

The site is served from `https://lexxcode.github.io/space_invaders/` (see `base` in [vite.config.ts](vite.config.ts)).
