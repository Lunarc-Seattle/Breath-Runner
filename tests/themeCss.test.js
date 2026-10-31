import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { colorVariables, renderThemeCss, THEME_CSS_PATH } from '../scripts/tokens/theme-css.mjs';

test('src/styles/theme.css is up to date with tokens.js (run `npm run tokens`)', async () => {
  assert.equal(await readFile(THEME_CSS_PATH, 'utf8'), renderThemeCss());
});

test('nested tokens flatten to Tailwind colour variables, DEFAULT dropped', () => {
  const vars = Object.fromEntries(colorVariables());
  assert.equal(vars['--color-brand-teal'], '#13a4a9');
  assert.equal(vars['--color-brand-teal-ink'], '#0b7377');
  assert.equal(vars['--color-game-coin-soft'], '#fde68a');
  assert.equal(vars['--color-ink'], '#1e2432');
  assert.equal(vars['--color-surface-lavender'], '#eef0f8');
  assert.ok(!Object.keys(vars).some(name => name.includes('DEFAULT')));
});

test('a non-hex token is rejected', () => {
  assert.throws(() => colorVariables({ brand: { teal: 'teal' } }), /--color-brand-teal: expected #RRGGBB/);
});
