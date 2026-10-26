/**
 * Content-Security-Policy shared by both ways the app is served:
 *  - Express (npm start) sends it as a header via helmet;
 *  - the static build (GitHub Pages) gets it as a <meta> tag, injected by vite.config.js.
 * Everything is self-hosted (fonts included), so nothing third-party is allowed.
 */
export const CSP_DIRECTIVES = {
  'default-src': ["'self'"],
  'script-src': ["'self'"],
  // React `style={...}` props compile to inline style attributes.
  'style-src': ["'self'", "'unsafe-inline'"],
  // data: for the SVG favicon.
  'img-src': ["'self'", 'data:'],
  'font-src': ["'self'"],
  'connect-src': ["'self'"],
  'media-src': ["'self'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'form-action': ["'self'"]
};

/** Header-only directives (browsers ignore them in a <meta> policy). */
export const CSP_HEADER_ONLY = {
  'frame-ancestors': ["'none'"]
};

export function cspString(directives = CSP_DIRECTIVES) {
  return Object.entries(directives)
    .map(([name, values]) => `${name} ${values.join(' ')}`)
    .join('; ');
}
