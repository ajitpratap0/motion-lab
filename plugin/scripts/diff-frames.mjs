import {cli, number, ensureParent} from './lib/args.mjs';
import {checked} from './lib/ffmpeg.mjs';
import {compareImages} from './lib/image.mjs';

const usage = 'diff-frames.mjs <a.png> <b.png> [--out out/diff.png] [--threshold 8]';

async function writeComparison(first, second, out) {
  const filter = '[0:v]split[a][ad];[1:v]split[b][bd];' +
    '[ad][bd]blend=all_mode=difference,lutrgb=r=val*4:g=val*4:b=val*4[d];' +
    '[a][b][d]hstack=inputs=3[out]';
  await checked([
    '-i', first, '-i', second, '-filter_complex', filter,
    '-map', '[out]', '-frames:v', '1', '-y', out,
  ]);
}

async function diffFrames(args) {
  const [first, second] = args._;
  if (!first || !second) throw new Error('Two PNG paths are required');
  const threshold = number(args, 'threshold', 8, {min: 0, max: 255});
  const out = args.out ?? 'out/diff.png';
  const stats = await compareImages(first, second, threshold);
  await ensureParent(out);
  await writeComparison(first, second, out);
  return {out, ...stats};
}

await cli(usage, diffFrames);
