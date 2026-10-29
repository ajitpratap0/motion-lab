import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, writeFile, readFile, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {run, checked, probe} from '../scripts/lib/ffmpeg.mjs';
import {discoverFrames, frameFiles, frameNumber} from '../scripts/lib/image.mjs';
import {listFrames} from '../scripts/lib/gif.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function invoke(tool, args) {
  const result = await run(process.execPath, [
    path.join(root, 'scripts', `${tool}.mjs`), ...args, '--json',
  ]);
  assert.equal(result.code, 0, result.stderr);
  return {...result, data: JSON.parse(result.stdout)};
}

test('frame discovery recognizes prefixes, start numbers, manifests and ambiguity', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'motion-discovery-'));
  try {
    for (let index = 5; index < 8; index++) {
      await writeFile(path.join(directory, `element-${String(index).padStart(4, '0')}.png`), '');
    }
    const sequence = await discoverFrames(directory);
    assert.equal(sequence.startNumber, 5);
    assert.equal(sequence.pattern, path.join(directory, 'element-%04d.png'));
    assert.equal(sequence.count, 3);
    assert.equal(sequence.contiguous, true);
    assert.equal(frameNumber(sequence.files[0]), 5);
    await writeFile(path.join(directory, 'frames.json'), JSON.stringify({count: 2}));
    assert.equal((await frameFiles(directory)).length, 2);
    await writeFile(path.join(directory, '0000.png'), '');
    await assert.rejects(discoverFrames(directory), /Multiple distinct PNG sequences/);
  } finally {
    await rm(directory, {recursive: true, force: true});
  }
});

test('prefixed exports and contact sheets ignore frames beyond manifest count', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'motion-prefix-'));
  try {
    const frames = path.join(directory, 'frames');
    await mkdir(frames);
    await checked([
      '-f', 'lavfi', '-i', 'testsrc=size=96x64:rate=24:duration=0.25',
      '-start_number', '5', '-y', path.join(frames, 'element-%04d.png'),
    ]);
    await writeFile(path.join(frames, 'frames.json'), JSON.stringify({count: 3, fps: 24}));
    const video = path.join(directory, 'anim.mp4');
    const videoResult = await invoke('export', ['mp4', '--frames', frames, '--out', video]);
    assert.match(videoResult.stderr, /ignoring 3 stale frames/);
    assert.equal(Number((await probe(video)).data.streams[0].nb_frames), 3);
    const gif = path.join(directory, 'anim.gif');
    await invoke('export', ['gif', '--frames', frames, '--out', gif]);
    assert.equal(listFrames(await readFile(gif)).length, 3);
    const sheet = await invoke('contact-sheet', [
      '--frames', frames, '--every', '1', '--cols', '3', '--width', '96',
      '--out', path.join(directory, 'contact.png'),
    ]);
    assert.equal(sheet.data.frames, 3);
    await invoke('onion-skin', [
      '--frames', frames, '--range', '5-7', '--out', path.join(directory, 'onion.png'),
    ]);
  } finally {
    await rm(directory, {recursive: true, force: true});
  }
});

test('default GIF exports never upscale and cap portrait height to X limits', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'motion-gif-box-'));
  try {
    for (const dimensions of ['1080x1080', '1080x1920', '96x64']) {
      const frames = path.join(directory, dimensions);
      await mkdir(frames);
      await checked([
        '-f', 'lavfi', '-i', `color=c=blue:size=${dimensions}:rate=24`,
        '-frames:v', '1', '-y', path.join(frames, '0000.png'),
      ]);
      const gif = path.join(directory, `${dimensions}.gif`);
      await invoke('export', ['gif', '--frames', frames, '--out', gif]);
      const metadata = (await probe(gif)).data.streams[0];
      const [sourceWidth, sourceHeight] = dimensions.split('x').map(Number);
      assert.ok(metadata.width <= sourceWidth);
      assert.ok(metadata.height <= sourceHeight);
      assert.ok(metadata.height <= 1080);
      assert.equal(metadata.width % 2, 0);
      assert.equal(metadata.height % 2, 0);
      await invoke('export', ['xcheck', gif]);
    }
  } finally {
    await rm(directory, {recursive: true, force: true});
  }
});


test('sequence padding naturally expands beyond the minimum digit width', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'motion-padding-'));
  try {
    for (const file of ['element-9999.png', 'element-10000.png']) {
      await writeFile(path.join(directory, file), '');
    }
    const sequence = await discoverFrames(directory);
    assert.equal(sequence.pattern, path.join(directory, 'element-%04d.png'));
    assert.equal(sequence.startNumber, 9999);
    assert.equal(sequence.contiguous, true);
    assert.equal(sequence.count, 2);
    await writeFile(path.join(directory, 'element-010001.png'), '');
    await assert.rejects(discoverFrames(directory), /inconsistent number padding/);
  } finally {
    await rm(directory, {recursive: true, force: true});
  }
});
