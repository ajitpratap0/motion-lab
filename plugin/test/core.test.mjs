import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseArgs } from '../scripts/lib/args.mjs';
import {
  frameCount,
  frameTimes,
  subframeTimes,
  beatFrames,
  accumulatedDrift,
  holdSeconds,
  gifDelays,
} from '../scripts/lib/timing.mjs';
import { lint } from '../scripts/lib/lint.mjs';
import { analyzeSeries } from '../scripts/lib/analysis.mjs';
import { lineChart } from '../scripts/lib/svg.mjs';

test('argument formats, negative numbers, booleans and positionals', () => {
  const args = parseArgs([
    'file.html', '--fps=24', '--json', '--offset', '-2',
    '--out', 'space here', '--', '--literal',
  ]);
  assert.deepEqual(args, {
    _: ['file.html', '--literal'],
    fps: '24',
    json: true,
    offset: '-2',
    out: 'space here',
  });
  assert.deepEqual(parseArgs(['--bed-only', 'page.html']), {
    _: ['page.html'],
    'bed-only': true,
  });
  assert.throws(() => parseArgs(['--=x']), /flag/);
});

test('frame endpoints, beat rounding and accumulated drift', () => {
  assert.equal(frameCount(6, 24), 144);
  assert.equal(frameTimes(6, 24).at(-1), 143 / 24);
  assert.deepEqual(beatFrames(120, 24, 4), [0, 12, 24, 36]);
  assert.equal(30 * 60 / 128, 14.0625);
  assert.deepEqual(beatFrames(128, 30, 5), [0, 14, 28, 42, 56]);
  assert.equal(accumulatedDrift(128, 30, 32), -2);
  assert.equal(holdSeconds(2), 1.1);
  assert.throws(() => frameCount(-1, 24));
});

test('subframe centers, wrapping and GIF cumulative duration', () => {
  const samples = subframeTimes(12, 24, 4, 0.5);
  const center = samples.reduce((sum, time) => sum + time, 0) / 4;
  assert.ok(Math.abs(center - 0.5) < 1e-12);

  const wrapped = subframeTimes(0, 24, 4, 0.5, 6);
  assert.ok(wrapped.every(time => time >= 0 && time < 6));
  assert.ok(wrapped[0] > 5);

  for (const fps of [24, 30, 60]) {
    const delays = gifDelays(fps * 6, fps);
    assert.equal(delays.reduce((sum, delay) => sum + delay, 0), 600);
  }
  assert.deepEqual(gifDelays(6, 60), [2, 1, 2, 2, 1, 2]);
});

test('fixtures lint and every bad-contract violation', async () => {
  const goodFile = new URL('../examples/hello-loop.html', import.meta.url);
  const goodFindings = lint(await readFile(goodFile, 'utf8'));
  assert.deepEqual(goodFindings.filter(finding => finding.severity === 'error'), []);

  const badFile = new URL('../examples/bad-contract.html', import.meta.url);
  const badFindings = lint(await readFile(badFile, 'utf8'));
  for (const rule of ['date-now', 'random', 'interval', 'cdn-version', 'transition']) {
    assert.ok(badFindings.some(finding => finding.rule === rule), rule);
  }
  assert.ok(badFindings.every(finding => finding.line > 0));
});

test('lint covers guarded rAF, clocks, XHR, fetch and keyframe warnings', () => {
  const badSource = '<script>performance.now(); new Date(); requestAnimationFrame(tick); '
    + 'fetch("https://example.com/a"); new XMLHttpRequest()</script>\n'
    + '<style>@keyframes a {to {width:20px}}</style>';
  const findings = lint(badSource);
  const expectedRules = [
    'performance-now', 'new-date', 'raf-guard', 'network', 'missing-render', 'keyframe-layout',
  ];
  for (const rule of expectedRules) {
    assert.ok(findings.some(finding => finding.rule === rule), rule);
  }

  const goodSource = '<script>const frozen=new URLSearchParams(location.search).has("t"); '
    + 'window.renderAt=t=>{}; if (!frozen) requestAnimationFrame(tick); '
    + 'fetch("https://fonts.googleapis.com/a")</script>';
  assert.equal(lint(goodSource).length, 0);
});

test('analysis marks stops and linear runs; chart escapes labels', () => {
  const values = [0, 10, 20, 30, 40, 50, 60, 70, 90, 90];
  const result = analyzeSeries(values, 'x');
  assert.ok(result.findings.some(finding => finding.type === 'dead-stop'));
  assert.ok(result.findings.some(finding => finding.type === 'linear-run'));

  const stop = analyzeSeries([0, 1, 2, 3, 4, 5, 6, 106, 107], 'x');
  assert.ok(stop.findings.some(finding => (
    finding.type === 'dead-stop' && finding.frame === 8
  )));

  const svg = lineChart({
    series: [{ name: 'x<&', values }],
    xLabel: 'frame',
    yLabel: 'value',
  });
  assert.match(svg, /x&lt;&amp;/);
  assert.match(svg, /<svg/);
});
