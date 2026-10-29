import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile, mkdtemp, writeFile, rm} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {openPage, freeze, linearAverage, loadPlaywright} from '../scripts/lib/page.mjs';
import {speedGraph} from '../scripts/speed-graph.mjs';
import {decodeImage} from '../scripts/lib/image.mjs';

let available = true;
try {
  await loadPlaywright();
} catch {
  available = false;
}
const browserSkip = available
  ? false
  : 'playwright not installed; browser integration requires optional peer dependency';

function run(script, args = []) {
  return spawnSync(process.execPath, [`scripts/${script}.mjs`, ...args], {encoding: 'utf8'});
}

test('freeze follows renderAt and produces repeatable frames', {skip: browserSkip}, async () => {
  const opened = await openPage('examples/hello-loop.html', {width: 1080, height: 1080});
  try {
    await freeze(opened.page, 1);
    assert.equal(await opened.page.evaluate(() => window.__probe(1).rot), 22.5);
    const first = await opened.page.screenshot();
    await freeze(opened.page, 2);
    await freeze(opened.page, 1);
    assert.deepEqual(await opened.page.screenshot(), first);
  } finally {
    await opened.close();
  }
});

test('speed graph rasterizes within its exact SVG viewport', {skip: browserSkip}, async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'motion-speed-png-'));
  try {
    const probe = path.join(directory, 'probe.json');
    await writeFile(probe, JSON.stringify({
      fps: 24, frames: Array.from({length: 24}, (_, frame) => ({frame, x: frame, scale: 1}))
    }));
    const result = await speedGraph({
      probe, keys: ['x', 'scale'], out: path.join(directory, 'speed.svg'), png: true
    });
    const image = await decodeImage(result.png);
    assert.equal(image.width, 1200);
    assert.equal(image.height, 800);
  } finally {
    await rm(directory, {recursive: true, force: true});
  }
});

test('freeze hook is a plain browser script', async () => {
  const source = await readFile(new URL('../scripts/freeze-hook.js', import.meta.url), 'utf8');
  assert.doesNotThrow(() => new Function(source));
});

test('subframe averaging uses linear light rather than averaging encoded bytes', () => {
  assert.deepEqual(
    linearAverage([Buffer.from([0, 0, 0]), Buffer.from([255, 255, 255])]),
    Buffer.from([188, 188, 188])
  );
  assert.deepEqual(
    linearAverage([Buffer.from([12, 100, 240])]),
    Buffer.from([12, 100, 240])
  );
});

test('freeze awaits drawing before animation seek and exactly two animation ticks', async () => {
  const order = [];
  const prior = {
    window: globalThis.window,
    document: globalThis.document,
    requestAnimationFrame: globalThis.requestAnimationFrame
  };
  const animation = {
    pause: () => order.push('pause'),
    set currentTime(value) {
      order.push(value);
    }
  };
  try {
    globalThis.window = {
      renderAt: async time => {
        await Promise.resolve();
        order.push(`render:${time}`);
      }
    };
    globalThis.document = {getAnimations: () => [animation]};
    globalThis.requestAnimationFrame = callback => {
      order.push('raf');
      callback();
    };
    await freeze({evaluate: (callback, argument) => callback(argument)}, 0.5);
    assert.deepEqual(order, ['render:0.5', 'pause', 500, 'raf', 'raf']);
  } finally {
    for (const [key, value] of Object.entries(prior)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
});

test('inject installs once and removes only its marked inline script', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'motion-inject-'));
  try {
    const file = path.join(directory, 'fixture.html');
    const original = '<!doctype html><body><p>Keep me</p></body>';
    await writeFile(file, original);
    assert.equal(run('inject', [file, '--json']).status, 0);
    const first = await readFile(file, 'utf8');
    assert.equal(run('inject', [file]).status, 0);
    assert.equal(await readFile(file, 'utf8'), first);
    assert.equal(run('inject', [file, '--remove']).status, 0);
    assert.equal(await readFile(file, 'utf8'), original);
  } finally {
    await rm(directory, {recursive: true, force: true});
  }
});

test('browser CLIs report the exact missing playwright diagnostic', {
  skip: available ? 'playwright is present' : false
}, () => {
  for (const script of ['render', 'probe']) {
    const result = run(script, [
      'examples/hello-loop.html', '--secs', '0.1',
      '--out', path.join(tmpdir(), 'motion-missing-peer')
    ]);
    assert.equal(result.status, 2, result.stderr);
    assert.equal(
      result.stderr.trim(),
      'motion-lab: playwright not found. Run: npm i -D playwright '
        + '&& npx playwright install chromium'
    );
    assert.equal(result.stdout, '');
  }
});

test('render, probe, and audit execute their CLI contracts', {skip: browserSkip}, async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'motion-browser-'));
  try {
    const frames = path.join(directory, 'frames');
    const render = run('render', [
      'examples/hello-loop.html', '--secs', '1', '--fps', '2', '--width', '64', '--height', '64',
      '--out', frames, '--json'
    ]);
    assert.equal(render.status, 0, render.stderr);
    assert.equal(JSON.parse(render.stdout).frames, 2);
    await readFile(path.join(frames, '0000.png'));
    await readFile(path.join(frames, '0001.png'));

    const probeFile = path.join(directory, 'probe.json');
    const probe = run('probe', [
      'examples/hello-loop.html', '--secs', '1', '--fps', '2', '--out', probeFile, '--json'
    ]);
    assert.equal(probe.status, 0, probe.stderr);
    const values = JSON.parse(await readFile(probeFile, 'utf8'));
    assert.equal(values.frames.length, 2);
    assert.equal(values.frames[1].rot, 11.25);

    const spec = path.join(directory, 'spec.json');
    await writeFile(spec, JSON.stringify({
      secs: 1,
      fps: 2,
      checks: [
        {id: 'rotation', frame: 1, expr: '__probe(t).rot', op: '==', value: 11.25},
        {id: 'repeat', frame: 1, type: 'deterministic'}
      ]
    }));
    const audit = run('audit', [
      'examples/hello-loop.html', '--spec', spec,
      '--out', path.join(directory, 'audit.json'), '--json'
    ]);
    assert.equal(audit.status, 0, audit.stderr);
    assert.equal(JSON.parse(audit.stdout).passed, 2);

    await writeFile(spec, JSON.stringify({
      secs: 1,
      fps: 2,
      checks: [{frame: 1, expr: '__probe(t).rot', op: '==', value: 999}]
    }));
    const failed = run('audit', [
      'examples/hello-loop.html', '--spec', spec,
      '--out', path.join(directory, 'failed.json'), '--json'
    ]);
    assert.equal(failed.status, 3, failed.stderr);
    assert.equal(JSON.parse(failed.stdout).failed, 1);
  } finally {
    await rm(directory, {recursive: true, force: true});
  }
});
