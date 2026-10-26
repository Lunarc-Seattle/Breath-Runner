/** Tailwind is precompiled to assets/app.css (npm run build:css), so the site needs no CDN script. */
export default {
  content: ['./index.html', './src/**/*.js'],
  theme: { extend: {} },
  plugins: []
};
