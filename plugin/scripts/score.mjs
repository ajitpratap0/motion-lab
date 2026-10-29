import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import { cli, number, ensureParent } from './lib/args.mjs';
import { withPage } from './lib/page.mjs';
import { writeWav } from './lib/wav.mjs';
import { removeDC } from './lib/dsp.mjs';
import { loadProjectConfig, resolveProjectOptions } from './lib/project.mjs';

const usage = [
  'Usage: score.mjs <file.html> [--out out/score.wav] [--secs 6]',
  '  [--sample-rate 48000] [--passes 2] [--dc] [--bed-only] [--json]',
  '  --bed-only requests the bed-only stem from window.renderAudio.',
  'Defaults come from motion-lab.json when present.',
].join('\n');

async function renderPass(page, options) {
  return page.evaluate(async renderOptions => {
    if (typeof window.renderAudio !== 'function') {
      throw new Error('Page must implement window.renderAudio(opts)');
    }
    const result = await window.renderAudio(renderOptions);
    if (!result || !Number.isInteger(result.sampleRate) || result.sampleRate <= 0
      || !Array.isArray(result.channels) || ![1, 2].includes(result.channels.length)) {
      throw new Error('renderAudio must return {sampleRate, channels} with one or two channels');
    }
    let length;
    const channels = result.channels.map(channel => {
      const floats = Float32Array.from(channel);
      if (length !== undefined && floats.length !== length) {
        throw new Error('renderAudio channel lengths differ');
      }
      length = floats.length;
      if (!floats.every(Number.isFinite)) {
        throw new Error('renderAudio returned non-finite samples');
      }
      const bytes = new Uint8Array(floats.length * 4);
      const view = new DataView(bytes.buffer);
      floats.forEach((value, index) => view.setFloat32(index * 4, value, true));
      let binary = '';
      for (let offset = 0; offset < bytes.length; offset += 32768) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
      }
      return btoa(binary);
    });
    return { sampleRate: result.sampleRate, channels };
  }, options);
}

function decodeChannel(encoded) {
  const bytes = Buffer.from(encoded, 'base64');
  return Float32Array.from(
    { length: bytes.length / 4 },
    (_, index) => bytes.readFloatLE(index * 4),
  );
}

async function score(args) {
  const project = resolveProjectOptions(args, await loadProjectConfig());
  const sampleRate = number(args, 'sample-rate', 48000, { min: 1, integer: true });
  const secs = project.secs;
  const passes = number(args, 'passes', 2, { min: 1, integer: true });
  const options = { sampleRate, secs };
  if (args['bed-only']) options.bedOnly = true;
  const audio = await withPage(project.file, project, async page => {
    let last;
    for (let pass = 0; pass < passes; pass++) {
      last = await renderPass(page, options);
    }
    return last;
  });
  let channels = audio.channels.map(decodeChannel);
  if (args.dc) channels = channels.map(removeDC);
  const out = path.resolve(args.out || 'out/score.wav');
  await ensureParent(out);
  await writeFile(out, writeWav({ sampleRate: audio.sampleRate, channels }));
  return {
    out,
    sampleRate: audio.sampleRate,
    channels: channels.length,
    samples: channels[0].length,
    secs: channels[0].length / audio.sampleRate,
    passes,
    dc: Boolean(args.dc),
  };
}

await cli(usage, score);
