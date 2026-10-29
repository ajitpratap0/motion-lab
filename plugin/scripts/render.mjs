import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {cli, number, ensureParent} from './lib/args.mjs';
import {withPage, freeze, linearAverage} from './lib/page.mjs';
import {frameCount, subframeTimes} from './lib/timing.mjs';
import {checked} from './lib/ffmpeg.mjs';
import {decodeImage, encodeVideo} from './lib/image.mjs';
import {loadProjectConfig, resolveProjectOptions} from './lib/project.mjs';
import {prepareRenderOutput} from './lib/render-output.mjs';

const usage = 'render.mjs <file.html> [--secs 6] [--fps 24] [--width 1080] [--height 1080] '
  + '[--out out/frames] [--frames 0,24,48 | --range 24-47] [--subframes 1] [--shutter 0.5] '
  + '[--gpu] [--scale 1] [--video out/anim.mp4] [--json]\n'
  + 'Defaults come from motion-lab.json when present.';

/** Resolve explicit frames or an inclusive range against the output frame count. */
export function selectedFrames(args, count) {
  if (args.frames !== undefined && args.range !== undefined) {
    throw new Error('--frames and --range are mutually exclusive');
  }
  let frames = Array.from({length: count}, (_, index) => index);
  if (args.frames !== undefined) {
    const tokens = String(args.frames).split(',').map(token => token.trim());
    if (tokens.some(token => !/^\d+$/.test(token))) {
      throw new Error(`Frames must be integers from 0 to ${count - 1}`);
    }
    frames = tokens.map(Number);
  }
  if (args.range !== undefined) {
    const bounds = String(args.range).split('-').map(bound => bound.trim());
    if (bounds.length !== 2 || bounds.some(bound => !/^\d+$/.test(bound))) {
      throw new Error('Expected --range start-end');
    }
    const [start, end] = bounds.map(Number);
    if (end < start) throw new Error('Expected --range start-end');
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || end >= count) {
      throw new Error(`Frames must be integers from 0 to ${count - 1}`);
    }
    frames = Array.from({length: end - start + 1}, (_, index) => start + index);
  }
  const invalidFrame = frames.some(frame => (
    !Number.isInteger(frame) || frame < 0 || frame >= count
  ));
  if (!frames.length || invalidFrame) {
    throw new Error(`Frames must be integers from 0 to ${count - 1}`);
  }
  return [...new Set(frames)].sort((first, second) => first - second);
}

async function renderBlurredFrame(page, frame, options, temporaryDirectory, output) {
  const {fps, subframes, shutter, secs} = options;
  let width;
  let height;
  const samples = [];
  const times = subframeTimes(frame, fps, subframes, shutter, secs);
  for (const [index, time] of times.entries()) {
    await freeze(page, time);
    const sample = path.join(temporaryDirectory, `${index}.png`);
    await page.screenshot({path: sample});
    const decoded = await decodeImage(sample);
    ({width, height} = decoded);
    samples.push(decoded.data);
  }
  const raw = path.join(temporaryDirectory, 'average.rgb');
  await writeFile(raw, linearAverage(samples));
  await checked([
    '-y', '-f', 'rawvideo', '-pixel_format', 'rgb24', '-video_size', `${width}x${height}`,
    '-i', raw, '-frames:v', '1', output
  ]);
}

/** Render selected frames, optionally averaging shutter samples in linear light. */
export async function renderFrames(file, options) {
  const {secs = 6, fps = 24, out = 'out/frames', subframes = 1, shutter = 0.5} = options;
  const frames = selectedFrames(options, frameCount(secs, fps));
  await prepareRenderOutput(out, {
    count: frameCount(secs, fps), fps, secs,
    width: options.width ?? 1080, height: options.height ?? 1080
  }, {selected: options.frames !== undefined || options.range !== undefined});
  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'motion-render-'));
  try {
    await withPage(file, options, async page => {
      let lastPercent = -10;
      for (const [index, frame] of frames.entries()) {
        const output = path.join(out, `${String(frame).padStart(4, '0')}.png`);
        if (subframes === 1) {
          await freeze(page, frame / fps);
          await page.screenshot({path: output});
        } else {
          await renderBlurredFrame(
            page, frame, {fps, subframes, shutter, secs}, temporaryDirectory, output
          );
        }
        const percent = Math.floor((index + 1) / frames.length * 10) * 10;
        if (percent >= lastPercent + 10) {
          process.stderr.write(`motion-lab: rendered ${percent}%\n`);
          lastPercent = percent;
        }
      }
    });
  } finally {
    await rm(temporaryDirectory, {recursive: true, force: true});
  }
  return {frames: frames.length, fps, secs, out};
}

async function renderCommand(args) {
  const project = resolveProjectOptions(args, await loadProjectConfig());
  const options = {
    ...args,
    ...project,
    scale: number(args, 'scale', 1, {min: 0.1}),
    subframes: number(args, 'subframes', 1, {min: 1, integer: true}),
    shutter: number(args, 'shutter', 0.5, {min: 0, max: 1})
  };
  if (args.video && (args.frames || args.range)) throw new Error('--video requires all frames');
  const result = await renderFrames(project.file, options);
  if (args.video) {
    await ensureParent(args.video);
    await encodeVideo({
      frames: result.out, fps: result.fps, out: args.video, frameCount: result.frames
    });
  }
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await cli(usage, renderCommand);
}
