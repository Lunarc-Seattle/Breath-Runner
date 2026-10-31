import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { CSP_DIRECTIVES, cspString } from './config/csp.js';

/**
 * Injects the shared Content-Security-Policy as a <meta> tag into the built index.html, for static
 * hosting (GitHub Pages) where response headers can't be set. Build only: the dev server's HMR client
 * relies on inline scripts that `script-src 'self'` would block.
 */
function cspMetaPlugin() {
  return {
    name: 'csp-meta',
    apply: 'build',
    transformIndexHtml(html) {
      const meta = `<meta http-equiv="Content-Security-Policy" content="${cspString(CSP_DIRECTIVES).replaceAll('"', '&quot;')}" />`;
      // Right after <meta charset>, ahead of every script and stylesheet the policy must govern.
      const charset = /<meta charset="[^"]*"\s*\/?>/i;
      if (!charset.test(html)) throw new Error('csp-meta: <meta charset> not found in index.html');
      return html.replace(charset, m => `${m}\n    ${meta}`);
    }
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), cspMetaPlugin()],
  // Relative base: the same build works at / (npm run server) and at /<repo>/ on GitHub Pages.
  base: './',
  server: {
    // `npm run dev` + `npm run server`: the API runs on Express, the UI on Vite.
    proxy: { '/api': 'http://localhost:4000' }
  },
  build: { outDir: 'dist', sourcemap: true }
});
