import { defineConfig } from 'vite';

// Project pages are served from https://lexxcode.github.io/space_invaders/
export default defineConfig({
  base: '/space_invaders/',
  build: {
    outDir: 'dist',
  },
});
