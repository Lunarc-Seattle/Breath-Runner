import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative base: the same build works at / (npm run server) and at /<repo>/ on GitHub Pages.
  base: './',
  server: {
    // `npm run dev` + `npm run server`: the API runs on Express, the UI on Vite.
    proxy: { '/api': 'http://localhost:4000' }
  },
  build: { outDir: 'dist', sourcemap: true }
});
