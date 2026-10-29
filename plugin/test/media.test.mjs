import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, rm, access, readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {run, checked, probe} from '../scripts/lib/ffmpeg.mjs';
import {encodeVideo, frameFiles, compareImages} from '../scripts/lib/image.mjs';
import {renderContactSheet, renderFFmpegSheet} from '../scripts/lib/contact-sheet.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function generateFrames(directory) {
  const frames = path.join(directory, 'frames');
  await mkdir(frames);
  await checked([
    '-f', 'lavfi', '-i', 'testsrc=size=96x64:rate=24:duration=0.5',
    '-start_number', '0', '-y', path.join(frames, '%04d.png'),
  ]);
  return frames;
}

async function invoke(name, args) {
  const result = await run(process.execPath, [
    path.join(root, 'scripts', `${name}.mjs`), ...args, '--json',
  ]);
  assert.equal(result.code, 0, result.stderr);
  return JSON.parse(result.stdout);
}

test('media CLIs process generated frames without a browser', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'motion-media-'));
  try {
    const frames = await generateFrames(directory);
    await invoke('contact-sheet', [
      '--frames', frames, '--every', '3', '--cols', '2', '--width', '80',
      '--out', path.join(directory, 'contact.png'),
    ]);
    await access(path.join(directory, 'contact.png'));
    await invoke('onion-skin', [
      '--frames', frames, '--range', '0-3', '--out', path.join(directory, 'onion.png'),
    ]);
    const metadata = JSON.parse(await readFile(path.join(directory, 'onion.json'), 'utf8'));
    assert.deepEqual(metadata, {range: '0-3', opacity: 0.25});
    const diff = await invoke('diff-frames', [
      path.join(frames, '0000.png'), path.join(frames, '0001.png'),
      '--out', path.join(directory, 'diff.png'),
    ]);
    assert.ok(diff.changedPixels > 0);
    assert.ok(diff.bbox);
    await invoke('export', ['gif', '--frames', frames, '--out', path.join(directory, 'anim.gif')]);
    const video = path.join(directory, 'anim.mp4');
    await invoke('export', ['mp4', '--frames', frames, '--out', video]);
    await invoke('export', ['xcheck', video]);
    assert.equal((await probe(video)).data.streams[0].profile, 'High');
    const limited = path.join(directory, 'limited.mp4');
    await encodeVideo({frames, fps: 24, out: limited, frameCount: 3});
    assert.equal(Number((await probe(limited)).data.streams[0].nb_frames), 3);
  } finally {
    await rm(directory, {recursive: true, force: true});
  }
});

test('Chromium labels survive an unavailable drawtext filter', async context => {
  try {
    await import('playwright');
  } catch {
    context.skip('playwright not installed; Chromium caption fallback requires it');
    return;
  }
  const directory = await mkdtemp(path.join(tmpdir(), 'motion-labels-'));
  try {
    const frames = (await frameFiles(await generateFrames(directory))).slice(0, 4);
    const options = {
      cols: 2, width: 96, out: path.join(directory, 'labeled.png'), labels: true,
    };
    const labels = await renderContactSheet(frames, options, {
      ffmpegRenderer: async () => { throw new Error('No such filter: drawtext'); },
    });
    assert.equal(labels, true);
    const unlabeled = path.join(directory, 'unlabeled.png');
    await renderFFmpegSheet(frames, {...options, labels: false, out: unlabeled});
    const labeledSize = (await probe(options.out)).data.streams[0];
    const unlabeledSize = (await probe(unlabeled)).data.streams[0];
    assert.equal(labeledSize.width, 192);
    assert.equal(labeledSize.height, 188);
    assert.ok(labeledSize.height > unlabeledSize.height);
    // Compare a same-sized black-padded sheet so pixels prove captions are present.
    const padded = path.join(directory, 'padded.png');
    await checked([
      '-i', unlabeled, '-vf', 'pad=192:188:0:0:black', '-frames:v', '1', '-y', padded,
    ]);
    assert.ok((await compareImages(options.out, padded)).changedPixels > 0);
  } finally {
    await rm(directory, {recursive: true, force: true});
  }
});

test('contact sheet warns and removes labels only when Playwright is missing', async () => {
  const calls = [];
  const labels = await renderContactSheet(['0000.png'], {labels: true}, {
    ffmpegRenderer: async (files, options) => {
      calls.push(options.labels);
      if (options.labels) throw new Error('No such filter: drawtext');
    },
    browserRenderer: async () => {
      const error = new Error('motion-lab: playwright not found');
      error.exitCode = 2;
      throw error;
    },
  });
  assert.equal(labels, false);
  assert.deepEqual(calls, [true, false]);
});
