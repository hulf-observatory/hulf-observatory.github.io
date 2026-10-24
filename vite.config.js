import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';

// GitHub Pages answers 404 for any path without a file, even though the app then draws the page. Writing a copy
// of index.html for each route makes these addresses answer 200 (for search engines and link checkers too).
const routeCopies = (routes) => ({
  name: 'route-copies',
  apply: 'build',
  closeBundle() {
    const html = readFileSync('dist/index.html');
    for (const r of routes) {
      mkdirSync(`dist/${r}`, { recursive: true });
      writeFileSync(`dist/${r}/index.html`, html);
    }
  },
});

// VITE_BASE: the path the site is served from — '/site/' on the project Pages URL
// (https://hulf-observatory.github.io/site/), '/' at the apex domain.
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react(), routeCopies(['about', 'disclaimer'])],
});
