import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';

// GitHub Pages answers 404 for any path without a file, even though the app then draws the page. Writing a copy
// of index.html for each route makes these addresses answer 200 (for search engines and link checkers too).
const routeCopies = (routes) => {
  let out = 'dist';
  return {
    name: 'route-copies',
    apply: 'build',
    configResolved(config) { out = config.build.outDir; },
    closeBundle() {
      const html = readFileSync(`${out}/index.html`);
      for (const r of routes) {
        mkdirSync(`${out}/${r}`, { recursive: true });
        writeFileSync(`${out}/${r}/index.html`, html);
      }
    },
  };
};

// VITE_BASE: the path the site is served from — '/site/' on the project Pages URL
// (https://hulf-observatory.github.io/site/), '/' at the apex domain.
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react(), routeCopies(['about', 'disclaimer', 'live', ...['heat', 'humidity', 'heatindex', 'rain', 'wind', 'air', 'reservoirs', 'groundwater', 'tankers'].map((p) => `live/${p}`)])],
});
