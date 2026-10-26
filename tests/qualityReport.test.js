import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseLcov,
  parseJunit,
  summarizePlaywright,
  summarizeLighthouse,
  buildSummary,
  renderHtml,
  renderMarkdown
} from '../scripts/ci/quality-report.mjs';

const LCOV = [
  'SF:/repo/src/a.ts',
  'FNF:2',
  'FNH:2',
  'BRF:4',
  'BRH:3',
  'LF:10',
  'LH:9',
  'end_of_record',
  'SF:/repo/src/b.js',
  'FNF:2',
  'FNH:1',
  'BRF:0',
  'BRH:0',
  'LF:10',
  'LH:5',
  'end_of_record'
].join('\n');

test('lcov: totals across files and per-file line coverage', () => {
  const c = parseLcov(LCOV, '/repo');
  assert.equal(c.lines, 70);
  assert.equal(c.branches, 75);
  assert.equal(c.functions, 75);
  assert.deepEqual(c.files, [
    { file: 'src/a.ts', lines: 90 },
    { file: 'src/b.js', lines: 50 }
  ]);
});

test('junit: counts passes, failures and skips', () => {
  const xml = `<testsuites>
    <testcase name="a" time="0.1"/>
    <testcase name="b" time="0.1"><failure message="boom"/></testcase>
    <testcase name="c" time="0"><skipped/></testcase>
    <testcase name="d" time="0.1"></testcase>
  </testsuites>`;
  assert.deepEqual(parseJunit(xml), { tests: 4, passed: 2, failures: 1, skipped: 1 });
});

test('playwright: stats and specs from nested suites, retries flagged', () => {
  const report = {
    stats: { expected: 2, unexpected: 0, flaky: 1, skipped: 0, duration: 12345 },
    suites: [
      {
        file: 'nav.spec.js',
        specs: [{ title: 'opens', ok: true, tests: [{ results: [{ duration: 5 }] }] }],
        suites: [{ specs: [{ title: 'retried', ok: true, tests: [{ results: [{ duration: 1 }, { duration: 2 }] }] }] }]
      }
    ]
  };
  const s = summarizePlaywright(report);
  assert.equal(s.passed, 2);
  assert.equal(s.flaky, 1);
  assert.equal(s.durationSec, 12.3);
  assert.deepEqual(
    s.specs.map(t => [t.file, t.title, t.retried]),
    [
      ['nav.spec.js', 'opens', false],
      ['nav.spec.js', 'retried', true]
    ]
  );
});

test('lighthouse: page names from hash routes, scores as 0-100', () => {
  const pages = summarizeLighthouse([
    { url: 'http://h/?page=play#/play', summary: { accessibility: 1, performance: 0.976 }, htmlPath: 'x.html' }
  ]);
  assert.deepEqual(pages[0].scores, { accessibility: 100, performance: 98 });
  assert.equal(pages[0].page, 'play');
});

test('summary uses the lowest Lighthouse score; output escapes test titles', () => {
  const lighthouse = [
    { page: 'home', scores: { accessibility: 100, performance: 99, 'best-practices': 100, seo: 100 } },
    { page: 'play', scores: { accessibility: 96, performance: 97, 'best-practices': 100, seo: 100 } }
  ];
  const e2e = {
    passed: 1,
    failed: 0,
    flaky: 0,
    skipped: 0,
    durationSec: 1,
    specs: [{ file: 'x', title: '<img onerror=x>', ok: true }]
  };
  const unit = { tests: 3, passed: 3, failures: 0, skipped: 0 };
  const summary = buildSummary({ coverage: null, unit, e2e, lighthouse, meta: {} });
  assert.equal(summary.lighthouse.accessibility, 96);
  const html = renderHtml({ summary, coverage: null, e2e, lighthouse, links: {} });
  assert.ok(html.includes('&lt;img onerror=x&gt;'));
  assert.ok(!html.includes('<img onerror'));
  assert.match(renderMarkdown(summary), /Accessibility 96/);
});

test('missing inputs render as not available instead of throwing', () => {
  const summary = buildSummary({ coverage: null, unit: null, e2e: null, lighthouse: null, meta: {} });
  const html = renderHtml({ summary, coverage: null, e2e: null, lighthouse: null, links: {} });
  assert.match(html, /not available/);
  assert.match(renderMarkdown(summary), /n\/a/);
});
