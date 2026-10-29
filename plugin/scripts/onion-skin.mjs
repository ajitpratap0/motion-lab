import path from 'node:path';
import {writeFile} from 'node:fs/promises';
import {cli, number, ensureParent} from './lib/args.mjs';
import {checked} from './lib/ffmpeg.mjs';
import {frameFiles, frameNumber} from './lib/image.mjs';

const usage = 'onion-skin.mjs --range 24-47 [--frames out/frames] ' +
  '[--opacity 0.25] [--out out/onion.png]';

async function stackFrames(files, opacity, out) {
  const filters = [];
  let previous = '0:v';
  for (let index = 1; index < files.length; index++) {
    const name = `onion${index}`;
    filters.push(
      `[${previous}][${index}:v]blend=all_expr='A*(1-${opacity})+B*${opacity}'[${name}]`,
    );
    previous = name;
  }
  const command = files.flatMap(file => ['-i', file]);
  if (filters.length) command.push('-filter_complex', filters.join(';'), '-map', `[${previous}]`);
  command.push('-frames:v', '1', '-y', out);
  await checked(command);
}

async function createOnionSkin(args) {
  const range = /^(\d+)-(\d+)$/.exec(args.range ?? '');
  if (!range || Number(range[2]) < Number(range[1])) {
    throw new Error('--range must be START-END');
  }
  const opacity = number(args, 'opacity', 0.25, {min: 0, max: 1});
  const files = (await frameFiles(args.frames ?? 'out/frames')).filter(file => {
    const frame = frameNumber(file);
    return frame >= Number(range[1]) && frame <= Number(range[2]);
  });
  if (!files.length) throw new Error('No frames in range');
  const out = args.out ?? 'out/onion.png';
  await ensureParent(out);
  await stackFrames(files, opacity, out);
  const metadata = {range: args.range, opacity};
  const metadataFile = path.join(path.dirname(out), `${path.parse(out).name}.json`);
  await writeFile(metadataFile, JSON.stringify(metadata, null, 2) + '\n');
  return {out, ...metadata};
}

await cli(usage, createOnionSkin);
