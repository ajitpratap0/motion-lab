import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { run } from '../scripts/lib/ffmpeg.mjs';

const browserSkip = await import('playwright').then(
  () => false,
  () => 'playwright not installed; lab browser integration requires optional peer dependency',
);

async function runScript(script, args = [], options = {}) {
  return run(process.execPath, [path.join('scripts', script), ...args], options);
}

async function checkBeatReport() {
  const result = await runScript('beats.mjs', [
    '--bpm', '128', '--fps', '30', '--beats', '32', '--hold', 'two words', '--json',
  ]);
  assert.equal(result.code, 0);
  const report = JSON.parse(result.stdout);
  assert.equal(report.framesPerBeat, 14.0625);
  assert.equal(report.driftFrames, -2);
  assert.equal(report.hold.seconds, 1.1);
}

async function checkLintStatuses() {
  const cases = [['hello-loop.html', 0], ['bad-contract.html', 3]];
  for (const [file, expectedCode] of cases) {
    const result = await runScript('contract-lint.mjs', [
      path.join('examples', file), '--json',
    ]);
    assert.equal(result.code, expectedCode);
    assert.ok(Array.isArray(JSON.parse(result.stdout).findings));
  }
}

async function checkSpeedGraph(directory) {
  const source = path.join(directory, 'probe.json');
  const svg = path.join(directory, 'speed.svg');
  const frames = Array.from({ length: 24 }, (_, frame) => ({
    frame,
    t: frame / 24,
    x: frame,
    scale: 1 + frame * 0.01,
  }));
  await writeFile(source, JSON.stringify({ fps: 24, frames }));

  const result = await runScript('speed-graph.mjs', [
    '--probe', source, '--keys', 'x,scale', '--out', svg, '--json',
  ]);
  assert.equal(result.code, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).findings.length, 2);
  assert.match(await readFile(svg, 'utf8'), /delta\/frame/);
}

test('every CLI help exits successfully without browser dependencies', async () => {
  const files = (await readdir('scripts')).filter(file => file.endsWith('.mjs'));
  assert.equal(files.length, 14);

  for (const file of files) {
    const result = await runScript(file, ['--help']);
    assert.equal(result.code, 0, `${file}: ${result.stderr}`);
    assert.match(result.stdout, /\[|Usage/);
  }
});

test('CLI JSON beats, lint statuses, validation and SVG speed graph', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'motion-cli-'));
  try {
    await checkBeatReport();
    await checkLintStatuses();

    const invalid = await runScript('beats.mjs', ['--fps', '0']);
    assert.equal(invalid.code, 1);
    assert.equal(invalid.stdout, '');
    assert.match(invalid.stderr, /motion-lab:/);

    await checkSpeedGraph(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('lab review pack includes every artifact and probe charts', {
  skip: browserSkip,
}, async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'motion-lab-'));
  try {
    const result = await run(process.execPath, [
      path.resolve('scripts/lab.mjs'),
      path.resolve('examples/hello-loop.html'),
      '--secs', '1', '--fps', '4', '--width', '96', '--height', '96',
      '--every', '1', '--json',
    ], { cwd: directory });
    assert.equal(result.code, 0, result.stderr);

    const report = JSON.parse(result.stdout);
    const pack = JSON.parse(await readFile(report.pack, 'utf8'));
    assert.equal(pack.lint.errors, 0);
    assert.equal(pack.probeAvailable, true);
    assert.ok(pack.artifacts.some(artifact => artifact.endsWith('speed.svg')));

    for (const artifact of pack.artifacts) {
      await readFile(artifact);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
