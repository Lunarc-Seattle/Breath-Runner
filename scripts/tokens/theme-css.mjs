/**
 * Generates src/styles/theme.css (a Tailwind v4 `@theme` block) from src/styles/tokens.js, so the JS
 * tokens stay the single source of truth for colours while Tailwind is configured CSS-first.
 *
 *   npm run tokens        rewrite src/styles/theme.css after editing tokens.js
 *
 * tests/themeCss.test.js fails when the committed file is out of date.
 *
 * Nesting becomes the class name, `DEFAULT` is dropped: brand.teal.DEFAULT -> --color-brand-teal
 * (`bg-brand-teal`), brand.teal.ink -> --color-brand-teal-ink, game.navy.panel -> --color-game-navy-panel.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { colors } from '../../src/styles/tokens.js';

export const THEME_CSS_PATH = fileURLToPath(new URL('../../src/styles/theme.css', import.meta.url));

/** @returns {[string, string][]} [`--color-…` name, lowercase hex] pairs, in tokens.js order. */
export function colorVariables(tree = colors, prefix = '--color') {
  return Object.entries(tree).flatMap(([key, value]) => {
    const name = key === 'DEFAULT' ? prefix : `${prefix}-${key}`;
    if (typeof value === 'object') return colorVariables(value, name);
    if (!/^#[0-9a-f]{6}$/i.test(value)) throw new Error(`${name}: expected #RRGGBB, got ${value}`);
    return [[name, value.toLowerCase()]];
  });
}

export function renderThemeCss() {
  const lines = colorVariables().map(([name, value]) => `  ${name}: ${value};`);
  return `/* GENERATED from src/styles/tokens.js by scripts/tokens/theme-css.mjs: do not edit, run \`npm run tokens\`. */

/*
 * \`inline\`: utilities get the literal hex rather than var(--color-…), so opacity modifiers
 * (bg-brand-teal/10) compile to plain #RRGGBBAA colours instead of color-mix(). Plain CSS can still
 * use var(--color-…): Tailwind defines each referenced variable on :root.
 */
@theme inline {
${lines.join('\n')}
}
`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(THEME_CSS_PATH, renderThemeCss());
  console.log(`wrote ${THEME_CSS_PATH}`);
}
