import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defaultStills } from '../scripts/lib/timing.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const hook = path.join(root, 'scripts', 'hooks', 'receipts.mjs');

function runHook(cwd, prompt) {
  return spawnSync(process.execPath, [hook], { input: JSON.stringify({ cwd, prompt }), encoding: 'utf8' });
}

test('default stills stay inside the frame range', () => {
  assert.deepEqual(defaultStills(96), [0, 24, 48, 72, 95]);
  assert.deepEqual(defaultStills(144), [0, 36, 72, 108, 143]);
  assert.deepEqual(defaultStills(2), [0, 1]);
  assert.deepEqual(defaultStills(1), [0]);
});

test('receipts hook creates RECEIPTS.md in a project and logs the prompt', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'ml-receipts-'));
  await writeFile(path.join(dir, 'motion-lab.json'), JSON.stringify({ name: 'demo' }));
  assert.equal(runHook(dir, 'make it calmer').status, 0);
  const text = await readFile(path.join(dir, 'RECEIPTS.md'), 'utf8');
  assert.match(text, /^# Receipts: demo\n/);
  assert.match(text, /## Raw log/);
  assert.match(text, /> make it calmer/);
});

test('receipts hook does nothing outside a project or when disabled', async () => {
  const plain = await mkdtemp(path.join(tmpdir(), 'ml-plain-'));
  assert.equal(runHook(plain, 'hello').status, 0);
  await assert.rejects(readFile(path.join(plain, 'RECEIPTS.md')));
  const off = await mkdtemp(path.join(tmpdir(), 'ml-off-'));
  await writeFile(path.join(off, 'motion-lab.json'), JSON.stringify({ receipts: false }));
  assert.equal(runHook(off, 'hello').status, 0);
  await assert.rejects(readFile(path.join(off, 'RECEIPTS.md')));
});

test('linear-run flags linear easing but not a smooth cosine drift', async () => {
  const { analyzeSeries } = await import('../scripts/lib/analysis.mjs');
  const linear = analyzeSeries(Array.from({ length: 20 }, (_, frame) => frame * 3), 'x');
  assert.ok(linear.findings.some(finding => finding.type === 'linear-run'));
  const drift = analyzeSeries(
    Array.from({ length: 120 }, (_, frame) => 25 + 3 * Math.cos((2 * Math.PI * frame) / 120)), 'azimuth',
  );
  assert.equal(drift.findings.filter(finding => finding.type === 'linear-run').length, 0);
});

test('speed-graph marks declared linear keys as intended', async () => {
  const { speedGraph } = await import('../scripts/speed-graph.mjs');
  const dir = await mkdtemp(path.join(tmpdir(), 'ml-speed-'));
  const frames = Array.from({ length: 20 }, (_, frame) => ({ frame, spin: frame * 32, x: frame * 2 }));
  const probe = path.join(dir, 'probe.json');
  await writeFile(probe, JSON.stringify({ frames }));
  const result = await speedGraph({ probe, keys: ['spin', 'x'], out: path.join(dir, 's.svg'), linearOk: ['spin'] });
  const runs = result.findings.filter(finding => finding.type === 'linear-run');
  assert.ok(runs.some(finding => finding.key === 'spin' && finding.intended === true));
  assert.ok(runs.some(finding => finding.key === 'x' && !finding.intended));
});
