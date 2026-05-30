# Space Invaders

An HTML5 `<canvas>` clone of the classic [Space Invaders (1978)](https://lexxcode.github.io/space_invaders/), rewritten with **TypeScript** ES modules and bundled with **Vite**.

## Controls

| Key | Action |
| --- | --- |
| ← / → | Move the ship |
| Space | Shoot |
| Esc | Pause / resume |

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
