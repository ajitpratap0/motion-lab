import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, readFile, writeFile, readdir, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {selectedFrames} from '../scripts/render.mjs';
import {prepareRenderOutput} from '../scripts/lib/render-output.mjs';

test('Playwright is resolved from the invoking project before the plugin peer', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'motion-project-playwright-'));
  try {
    const dependency = path.join(directory, 'node_modules', 'playwright');
    await mkdir(dependency, {recursive: true});
    await writeFile(path.join(dependency, 'package.json'), JSON.stringify({
      name: 'playwright', type: 'module', main: 'index.js'
    }));
    await writeFile(path.join(dependency, 'index.js'), 'export const marker = "project-peer";');
    const moduleUrl = pathToFileURL(path.resolve('scripts/lib/page.mjs')).href;
    const source = `import {loadPlaywright} from ${JSON.stringify(moduleUrl)};
      console.log((await loadPlaywright()).marker);`;
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', source], {
      cwd: directory, encoding: 'utf8'
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), 'project-peer');
  } finally {
    await rm(directory, {recursive: true, force: true});
  }
});

test('frame lists reject empty, blank, hexadecimal, and exponent tokens', () => {
  for (const frames of ['', ' ', '0,', ',1', '1,,2', '0x10', '1e1', '-1', '1.5']) {
    assert.throws(() => selectedFrames({frames}, 30), /Frames must be integers/);
  }
  assert.deepEqual(selectedFrames({frames: ' 2 , 0 , 2 '}, 30), [0, 2]);
  for (const range of ['', ' ', '0x1-2', '1-2e1', '-1-2', '1-', '2-1']) {
    assert.throws(() => selectedFrames({range}, 30), /Expected --range start-end/);
  }
  assert.deepEqual(selectedFrames({range: ' 1-3 '}, 30), [1, 2, 3]);
  assert.deepEqual(selectedFrames({range: ' 1 - 3 '}, 30), [1, 2, 3]);
  assert.throws(() => selectedFrames({range: '0-999999999999999999'}, 30),
    /Frames must be integers/);
});

test('resolved CommonJS Playwright exports expose chromium through loadPlaywright', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'motion-commonjs-playwright-'));
  try {
    const dependency = path.join(directory, 'node_modules', 'playwright');
    await mkdir(dependency, {recursive: true});
    await writeFile(path.join(dependency, 'package.json'), JSON.stringify({
      name: 'playwright', main: 'index.cjs'
    }));
    await writeFile(path.join(dependency, 'index.cjs'),
      'module.exports = Object.assign({}, {chromium: {marker: "commonjs-peer"}});');
    const moduleUrl = pathToFileURL(path.resolve('scripts/lib/page.mjs')).href;
    const source = `import {loadPlaywright} from ${JSON.stringify(moduleUrl)};
      console.log((await loadPlaywright()).chromium.marker);`;
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', source], {
      cwd: directory, encoding: 'utf8'
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout.trim(), 'commonjs-peer');
  } finally {
    await rm(directory, {recursive: true, force: true});
  }
});

test('full renders remove only stale numbered PNGs and write exact frame metadata', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'motion-render-output-'));
  const metadata = {count: 2, fps: 24, secs: 2 / 24, width: 1080, height: 1080};
  try {
    for (const name of ['0000.png', '0001.png', '0002.png', '0003.png', 'keep.png', '10000.png']) {
      await writeFile(path.join(directory, name), 'fixture');
    }
    await prepareRenderOutput(directory, metadata, {selected: true});
    assert.equal((await readdir(directory)).length, 6);
    await prepareRenderOutput(directory, metadata);
    assert.deepEqual((await readdir(directory)).sort(), [
      '0000.png', '0001.png', '10000.png', 'frames.json', 'keep.png'
    ]);
    assert.deepEqual(JSON.parse(await readFile(path.join(directory, 'frames.json'))), metadata);
    await prepareRenderOutput(directory, {...metadata, count: 1}, {selected: true});
    assert.deepEqual(JSON.parse(await readFile(path.join(directory, 'frames.json'))), metadata);
  } finally {
    await rm(directory, {recursive: true, force: true});
  }
});
