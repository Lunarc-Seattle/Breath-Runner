/**
 * Breath Runner colour tokens: the single source of truth for the designer's palette.
 *
 * Plain data, consumed in two places:
 *  - tailwind.config.js puts `colors` in theme.extend.colors, so nested keys become classes:
 *    brand.teal.DEFAULT -> `bg-brand-teal`, brand.teal.ink -> `text-brand-teal-ink`,
 *    game.navy.DEFAULT -> `bg-game-navy/60` (opacity modifiers work because every value is hex).
 *  - JS (inline styles, SVG attributes, simStore's PDF_COLORS / solid()) imports the same objects.
 *
 * Contrast rule (WCAG AA, 4.5:1 for body text):
 *  - White text sits ONLY on a `deep` variant (teal.deep, purple.deep) or on `ink`.
 *  - Small coloured text on light backgrounds uses an `ink` variant (teal.ink, purple.ink, ...).
 *  - The base brand hues (teal, purple, yellow, pink, blue) are for fills, tints, strokes and
 *    illustration; yellow and pink fills carry `ink` text, never white.
 */

export const brand = {
  teal: {
    DEFAULT: '#13A4A9', // primary brand hue: tints, strokes, gradients, illustration
    deep: '#0F8387', // filled teal surfaces that carry white text (AA)
    ink: '#0B7377', // teal text / links on light backgrounds (AA)
    light: '#5FC0C4', // end stop of the teal call-to-action gradient
    hover: '#0F8F94' // hover state of teal.deep buttons
  },
  purple: {
    DEFAULT: '#8E90C6', // secondary brand hue: tints, chart lines, illustration
    deep: '#71739E', // filled purple surfaces that carry white text (AA)
    ink: '#5D5FA0' // purple text on light / purple-tinted backgrounds (AA)
  },
  yellow: {
    DEFAULT: '#F0C754', // highlight hue: badges, pins, rings; carries `ink` text, never white
    ink: '#8A6500' // dark amber text on yellow tints (AA)
  },
  pink: {
    DEFAULT: '#F0A7AB', // coral accent: soft fills and borders; carries `ink` text, never white
    ink: '#B4424A' // destructive / warning text on white (AA)
  },
  blue: {
    DEFAULT: '#96C7D2' // soft sky accent: gradient stops and light tints only
  },
  gold: {
    DEFAULT: '#B8860B' // coin totals (large display numbers only, below AA for small text)
  }
};

/** App-wide neutrals that sit outside Tailwind's slate scale. */
export const ink = '#1E2432'; // primary dark: toasts, dark buttons, illustration outlines
export const canvas = '#F4F6FA'; // page background and quiet card fills
export const surface = {
  lavender: '#EEF0F8' // profile card backdrop
};
export const status = {
  error: '#B23A26' // "not connected" text on pink tints (AA)
};
export const onDeep = '#FFFFFF'; // text on deep / ink surfaces

/** Forest Runner game HUD (sits on the illustrated map, so it has its own night palette). */
export const game = {
  navy: {
    DEFAULT: '#04214B', // glass HUD panels, overlays and text on bright game buttons
    panel: '#0B2A4F' // opaque breath dock
  },
  mist: '#CFDFE0', // stage backdrop shown before the map art loads
  coin: { DEFAULT: '#FDE047', soft: '#FDE68A' }, // coin counts, cues and highlights on navy
  mint: '#A7F3D0', // breath-sync values, lap headings
  go: '#34D399', // trainer-connected dot
  sky: '#7ACCF3', // combo, breath meter, mic controls
  ember: { DEFAULT: '#F15A24', amber: '#FBB03B' } // orange "breathe / restart" gradient
};

/** Everything Tailwind should know about, keyed exactly as the class names read. */
export const colors = { brand, ink, canvas, surface, status, game };

/** `#RRGGBB` plus a 0-255 alpha byte, for inline 8-digit hex tints (e.g. withAlpha(teal, 0x18)). */
export const withAlpha = (hex, alphaByte) => hex + alphaByte.toString(16).toUpperCase().padStart(2, '0');
