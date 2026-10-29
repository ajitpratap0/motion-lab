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
