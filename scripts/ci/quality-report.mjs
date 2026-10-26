/**
 * Builds the public quality report from CI outputs:
 *   quality/index.html      human-readable page (published at <site>/quality/ on main)
 *   quality/summary.json    the numbers, machine-readable
 *   quality/badges/*.json   shields.io "endpoint" badges used in the README
 *   + a Markdown table in the GitHub job summary when GITHUB_STEP_SUMMARY is set
 *
 * Usage: node scripts/ci/quality-report.mjs --out dist/quality \
 *   [--lcov coverage/lcov.info] [--junit coverage/junit.xml] \
 *   [--e2e e2e-results/results.json] [--e2e-report playwright-report] [--lighthouse lighthouse-report]
 * Every input is optional: a missing one shows as "not available" instead of failing the build.
 */
import { appendFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { brand, canvas, ink } from '../../src/styles/tokens.js';

/* ------------------------------- parsing ------------------------------- */

const pct = (hit, total) => (total ? Math.round((hit / total) * 1000) / 10 : null);

/** Totals and per-file line coverage from an lcov file. */
export function parseLcov(text, root = process.cwd()) {
  const files = [];
  let cur = null;
  const sums = { LF: 0, LH: 0, BRF: 0, BRH: 0, FNF: 0, FNH: 0 };
  for (const line of text.split('\n')) {
    if (line.startsWith('SF:')) cur = { file: relative(root, line.slice(3)), LF: 0, LH: 0 };
    const m = line.match(/^(LF|LH|BRF|BRH|FNF|FNH):(\d+)$/);
    if (m) {
      sums[m[1]] += Number(m[2]);
      if (cur && (m[1] === 'LF' || m[1] === 'LH')) cur[m[1]] = Number(m[2]);
    }
    if (line === 'end_of_record' && cur) {
      files.push({ file: cur.file, lines: pct(cur.LH, cur.LF) });
      cur = null;
    }
  }
  return {
    lines: pct(sums.LH, sums.LF),
    branches: pct(sums.BRH, sums.BRF),
    functions: pct(sums.FNH, sums.FNF),
    files: files.sort((a, b) => a.file.localeCompare(b.file))
  };
}

/** Test counts from a JUnit XML report (node --test-reporter=junit). */
export function parseJunit(xml) {
  const cases = xml.match(/<testcase\b[^>]*?(\/>|>[\s\S]*?<\/testcase>)/g) || [];
  const failures = cases.filter(c => /<failure\b/.test(c)).length;
  const skipped = cases.filter(c => /<skipped\b/.test(c)).length;
  return { tests: cases.length, passed: cases.length - failures - skipped, failures, skipped };
}

/** Counts and per-spec test list from Playwright's JSON reporter. */
export function summarizePlaywright(report) {
  const specs = [];
  const walk = (suite, file) => {
    const f = suite.file || file;
    for (const spec of suite.specs || []) {
      const results = spec.tests.flatMap(t => t.results || []);
      const last = results[results.length - 1];
      specs.push({ file: f, title: spec.title, ok: spec.ok, retried: results.length > 1, ms: last?.duration ?? 0 });
    }
    for (const child of suite.suites || []) walk(child, f);
  };
  for (const suite of report.suites || []) walk(suite, suite.file);
  const s = report.stats || {};
  return {
    passed: s.expected ?? specs.filter(t => t.ok).length,
    failed: s.unexpected ?? specs.filter(t => !t.ok).length,
    flaky: s.flaky ?? 0,
    skipped: s.skipped ?? 0,
    durationSec: s.duration ? Math.round(s.duration / 100) / 10 : null,
    specs
  };
}

/** Category scores (0-100) per page from an LHCI filesystem upload's manifest.json. */
export function summarizeLighthouse(manifest) {
  return manifest.map(run => {
    const url = new URL(run.url);
    const page = url.hash.replace(/^#\/?/, '') || url.searchParams.get('page') || url.pathname;
    const scores = Object.fromEntries(Object.entries(run.summary).map(([k, v]) => [k, Math.round(v * 100)]));
    return { page, url: run.url, scores, htmlPath: run.htmlPath };
  });
}

/* ------------------------------- output -------------------------------- */

const esc = s =>
  String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const CATS = [
  ['performance', 'Performance'],
  ['accessibility', 'Accessibility'],
  ['best-practices', 'Best practices'],
  ['seo', 'SEO']
];

function badge(label, message, ok) {
  return { schemaVersion: 1, label, message, color: ok ? 'brightgreen' : 'red' };
}

export function buildSummary({ coverage, unit, e2e, lighthouse, meta }) {
  const lhMin = cat => (lighthouse?.length ? Math.min(...lighthouse.map(p => p.scores[cat] ?? 0)) : null);
  return {
    meta,
    unit,
    coverage: coverage && { lines: coverage.lines, branches: coverage.branches, functions: coverage.functions },
    e2e: e2e && {
      passed: e2e.passed,
      failed: e2e.failed,
      flaky: e2e.flaky,
      skipped: e2e.skipped,
      durationSec: e2e.durationSec
    },
    lighthouse: lighthouse && Object.fromEntries(CATS.map(([k]) => [k, lhMin(k)]))
  };
}

function tile(label, value, detail, ok) {
  return `<div class="tile"><div class="label">${esc(label)}</div><div class="value ${ok === false ? 'bad' : ''}">${esc(
    value
  )}</div><div class="detail">${esc(detail)}</div></div>`;
}

export function renderHtml({ summary, coverage, e2e, lighthouse, links }) {
  const { meta, unit } = summary;
  const na = 'not available';
  const tiles = [
    unit
      ? tile(
          'Unit & API tests',
          `${unit.passed}/${unit.tests}`,
          unit.failures ? `${unit.failures} failing` : 'all passing',
          !unit.failures
        )
      : tile('Unit & API tests', '—', na),
    coverage
      ? tile(
          'Coverage (lines)',
          `${coverage.lines}%`,
          `branches ${coverage.branches}% · functions ${coverage.functions}%`,
          coverage.lines >= 85
        )
      : tile('Coverage', '—', na),
    e2e
      ? tile(
          'End-to-end (Playwright)',
          `${e2e.passed}/${e2e.passed + e2e.failed}`,
          `${e2e.flaky} flaky · ${e2e.durationSec ?? '?'} s in Chrome`,
          !e2e.failed
        )
      : tile('End-to-end', '—', na),
    summary.lighthouse
      ? tile(
          'Lighthouse accessibility',
          String(summary.lighthouse.accessibility),
          `lowest of ${lighthouse.length} pages`,
          summary.lighthouse.accessibility === 100
        )
      : tile('Lighthouse', '—', na)
  ].join('');

  const lhRows = (lighthouse || [])
    .map(
      p =>
        `<tr><th scope="row">#/${esc(p.page)}</th>${CATS.map(([k]) => `<td class="${p.scores[k] < 90 ? 'bad' : ''}">${p.scores[k] ?? '—'}</td>`).join('')}<td>${
          p.report ? `<a href="${esc(p.report)}">full report</a>` : ''
        }</td></tr>`
    )
    .join('');

  const byFile = new Map();
  for (const t of e2e?.specs || []) byFile.set(t.file, [...(byFile.get(t.file) || []), t]);
  const e2eList = [...byFile]
    .map(
      ([file, tests]) =>
        `<details open><summary><code>${esc(file)}</code> · ${tests.filter(t => t.ok).length}/${tests.length}</summary><ul>${tests
          .map(
            t =>
              `<li class="${t.ok ? 'ok' : 'bad'}"><span aria-hidden="true">${t.ok ? '✓' : '✗'}</span> ${esc(t.title)}${t.retried ? ' <em>(retried)</em>' : ''}</li>`
          )
          .join('')}</ul></details>`
    )
    .join('');

  const covRows = (coverage?.files || [])
    .map(
      f =>
        `<tr><th scope="row"><code>${esc(f.file)}</code></th><td class="${f.lines < 80 ? 'warn' : ''}">${f.lines ?? '—'}%</td></tr>`
    )
    .join('');

  const commit = meta.sha
    ? `<a href="${esc(meta.repoUrl)}/commit/${esc(meta.sha)}"><code>${esc(meta.sha.slice(0, 7))}</code></a>`
    : 'local build';
  const linkItems = [
    links.app && `<a href="${esc(links.app)}">Play the app</a>`,
    links.e2eReport && `<a href="${esc(links.e2eReport)}">Full Playwright report (traces, timings)</a>`,
    meta.runUrl && `<a href="${esc(meta.runUrl)}">This CI run on GitHub</a>`,
    meta.repoUrl && `<a href="${esc(meta.repoUrl)}">Source code</a>`
  ]
    .filter(Boolean)
    .map(a => `<li>${a}</li>`)
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Breath Runner · Quality report</title>
<meta name="description" content="Automated quality report for Breath Runner: unit, API and end-to-end tests, coverage and Lighthouse scores from the latest CI run on main." />
<style>
  :root { --ink: ${ink}; --canvas: ${canvas}; --teal: ${brand.teal.DEFAULT}; --teal-ink: ${brand.teal.ink}; --bad: ${brand.pink.ink}; }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--canvas); color: var(--ink); font: 15px/1.55 system-ui, -apple-system, 'Segoe UI', sans-serif; }
  main { max-width: 1040px; margin: 0 auto; padding: 32px 16px 64px; }
  .eyebrow { font: 600 12px/1 ui-monospace, 'SFMono-Regular', Menlo, monospace; color: var(--teal-ink); letter-spacing: .04em; }
  h1 { font-size: 30px; margin: 8px 0 4px; }
  h2 { font-size: 18px; margin: 36px 0 12px; }
  .meta { color: #475569; font-size: 14px; }
  .tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 12px; margin-top: 24px; }
  .tile, .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 20px; padding: 18px 20px; }
  .label { font: 600 11px/1.2 ui-monospace, Menlo, monospace; text-transform: uppercase; letter-spacing: .06em; color: #475569; }
  .value { font-size: 32px; font-weight: 700; margin-top: 6px; color: var(--teal-ink); }
  .value.bad, td.bad, li.bad { color: var(--bad); }
  .detail { font-size: 13px; color: #475569; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #edf2f7; }
  td { font-variant-numeric: tabular-nums; }
  thead th { font: 600 11px ui-monospace, Menlo, monospace; text-transform: uppercase; color: #475569; }
  td.warn { color: #8a6500; }
  .scroll { overflow-x: auto; }
  details { margin: 6px 0; } summary { cursor: pointer; font-weight: 600; }
  ul { margin: 6px 0 10px; padding-left: 20px; } li { margin: 2px 0; } li.ok span { color: var(--teal-ink); }
  a { color: var(--teal-ink); } code { font-size: 13px; }
  .links { padding-left: 18px; }
</style>
</head>
<body>
<main>
  <div class="eyebrow">BREATH RUNNER // AUTOMATED QUALITY REPORT</div>
  <h1>Is it working? Here's the evidence.</h1>
  <p class="meta">Generated by CI from commit ${commit}${meta.date ? ` on ${esc(meta.date)}` : ''}. Every merge to <code>main</code> must pass all of this before it deploys.</p>
  <section class="tiles" aria-label="Summary">${tiles}</section>

  <h2>Lighthouse (desktop)</h2>
  <div class="card scroll">${
    lhRows
      ? `<table><thead><tr><th scope="col">Page</th>${CATS.map(([, n]) => `<th scope="col">${n}</th>`).join('')}<th scope="col">Report</th></tr></thead><tbody>${lhRows}</tbody></table>`
      : na
  }</div>

  <h2>End-to-end tests</h2>
  <div class="card">${e2eList || na}</div>

  <h2>Unit & API coverage by file</h2>
  <div class="card scroll">${covRows ? `<table><thead><tr><th scope="col">File</th><th scope="col">Lines</th></tr></thead><tbody>${covRows}</tbody></table>` : na}</div>

  <h2>Links</h2>
  <ul class="links">${linkItems}</ul>
</main>
</body>
</html>
`;
}

export function renderMarkdown(summary) {
  const { unit, coverage, e2e, lighthouse } = summary;
  const row = (k, v) => `| ${k} | ${v} |`;
  return [
    '### Breath Runner quality report',
    '',
    '| Check | Result |',
    '|---|---|',
    row('Unit & API tests', unit ? `${unit.passed}/${unit.tests} passing` : 'n/a'),
    row(
      'Coverage',
      coverage ? `${coverage.lines}% lines · ${coverage.branches}% branches · ${coverage.functions}% functions` : 'n/a'
    ),
    row('End-to-end', e2e ? `${e2e.passed} passed · ${e2e.failed} failed · ${e2e.flaky} flaky` : 'n/a'),
    row('Lighthouse (lowest page)', lighthouse ? CATS.map(([k, n]) => `${n} ${lighthouse[k]}`).join(' · ') : 'n/a'),
    ''
  ].join('\n');
}

/* --------------------------------- CLI --------------------------------- */

function readIf(path, parse) {
  return path && existsSync(path) ? parse(readFileSync(path, 'utf8')) : null;
}

function main(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) args[argv[i].replace(/^--/, '')] = argv[i + 1];
  const out = resolve(args.out || 'quality');
  mkdirSync(join(out, 'badges'), { recursive: true });

  const coverage = readIf(args.lcov, parseLcov);
  const unit = readIf(args.junit, parseJunit);
  const e2e = readIf(args.e2e, t => summarizePlaywright(JSON.parse(t)));
  const lhDir = args.lighthouse;
  const lighthouse = readIf(lhDir && join(lhDir, 'manifest.json'), t => summarizeLighthouse(JSON.parse(t)));

  // Copy the full reports next to the page so its links work on Pages.
  const links = { app: '../' };
  if (args['e2e-report'] && existsSync(args['e2e-report'])) {
    cpSync(args['e2e-report'], join(out, 'e2e'), { recursive: true });
    links.e2eReport = './e2e/';
  }
  if (lighthouse) {
    mkdirSync(join(out, 'lighthouse'), { recursive: true });
    for (const p of lighthouse) {
      const html = p.htmlPath && existsSync(p.htmlPath) ? p.htmlPath : join(lhDir, basename(p.htmlPath || ''));
      if (existsSync(html) && readdirSync(lhDir).length) {
        cpSync(html, join(out, 'lighthouse', `${p.page}.html`));
        p.report = `./lighthouse/${p.page}.html`;
      }
    }
  }

  const repo = process.env.GITHUB_REPOSITORY;
  const server = process.env.GITHUB_SERVER_URL || 'https://github.com';
  const meta = {
    sha: process.env.GITHUB_SHA || null,
    date: new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC',
    repoUrl: repo ? `${server}/${repo}` : null,
    runUrl: repo && process.env.GITHUB_RUN_ID ? `${server}/${repo}/actions/runs/${process.env.GITHUB_RUN_ID}` : null
  };

  const summary = buildSummary({ coverage, unit, e2e, lighthouse, meta });
  writeFileSync(join(out, 'index.html'), renderHtml({ summary, coverage, e2e, lighthouse, links }));
  writeFileSync(join(out, 'summary.json'), JSON.stringify(summary, null, 2));

  const badges = {
    tests: unit && e2e && badge('tests', `${unit.passed + e2e.passed} passing`, !unit.failures && !e2e.failed),
    coverage: coverage && badge('coverage', `${coverage.lines}%`, coverage.lines >= 85),
    accessibility:
      summary.lighthouse &&
      badge('lighthouse a11y', String(summary.lighthouse.accessibility), summary.lighthouse.accessibility === 100)
  };
  for (const [name, b] of Object.entries(badges))
    if (b) writeFileSync(join(out, 'badges', `${name}.json`), JSON.stringify(b));

  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, renderMarkdown(summary));
  console.log(`quality report -> ${relative(process.cwd(), out)}/index.html`);
  console.log(renderMarkdown(summary));
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2));
