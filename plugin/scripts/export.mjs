import {readFile, writeFile, stat} from 'node:fs/promises';
import {cli, number, ensureParent} from './lib/args.mjs';
import {checked, probe} from './lib/ffmpeg.mjs';
import {encodeVideo, discoverFrames, sequenceInput} from './lib/image.mjs';
import {listFrames, rewriteDelays} from './lib/gif.mjs';
import {loadProjectConfig} from './lib/project.mjs';
import {gifDelays} from './lib/timing.mjs';

const usage = 'export.mjs <mp4|gif|loopcheck|xcheck> [--frames out/frames] [--fps 24] ' +
  '[--width 1200] [--out path] [--audio path] [--loudnorm] [--times 3] [--json]\n' +
  'Defaults come from motion-lab.json when present.';

async function exportMP4(args, fps) {
  const out = args.out ?? 'out/anim.mp4';
  await encodeVideo({
    frames: args.frames ?? 'out/frames', fps, out,
    audio: args.audio, loudnorm: Boolean(args.loudnorm),
  });
  return {out};
}

async function exportGIF(args, fps) {
  const frames = args.frames ?? 'out/frames';
  const out = args.out ?? 'out/anim.gif';
  const width = Math.min(1280, number(args, 'width', 1200, {min: 1, integer: true}));
  const sequence = await discoverFrames(frames);
  const input = sequenceInput(sequence, fps);
  await ensureParent(out);
  const filter = `[0:v]scale='min(${width},iw)':'min(1080,ih)':` +
    'force_original_aspect_ratio=decrease:flags=lanczos,' +
    'scale=trunc(iw/2)*2:trunc(ih/2)*2,split[a][b];' +
    '[a]palettegen=stats_mode=diff[p];' +
    '[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle';
  await checked([
    ...input, '-filter_complex', filter, '-frames:v', String(sequence.count),
    '-loop', '0', '-y', out,
  ]);
  const data = await readFile(out);
  const count = listFrames(data).length;
  await writeFile(out, rewriteDelays(data, gifDelays(count, fps)));
  return {out, frames: count};
}

async function exportLoopCheck(args, file) {
  if (!file) throw new Error('Video path is required');
  const out = args.out ?? 'out/loop_check.mp4';
  const times = number(args, 'times', 3, {min: 1, integer: true});
  await ensureParent(out);
  await checked(['-stream_loop', String(times - 1), '-i', file, '-c', 'copy', '-y', out]);
  return {out, times};
}

async function gifChecks(file, video, add) {
  const bytes = (await stat(file)).size;
  const count = listFrames(await readFile(file)).length;
  add('Size', bytes, '<= 15 MB', bytes <= 15 * 1024 * 1024);
  add('Frames', count, '<= 350', count <= 350);
  add('Width', video.width, '<= 1280', video.width <= 1280);
  add('Height', video.height, '<= 1080', video.height <= 1080);
}

function videoChecks(metadata, video, add) {
  const audio = metadata.streams.filter(stream => stream.codec_type === 'audio');
  const [numerator, denominator] = String(video.avg_frame_rate ?? video.r_frame_rate)
    .split('/').map(Number);
  const rate = denominator ? numerator / denominator : 0;
  const duration = Number(metadata.format.duration ?? video.duration);
  const {width, height} = video;
  add('Codec', video.codec_name, 'h264', video.codec_name === 'h264');
  add('Profile', video.profile, 'High', video.profile === 'High');
  add('Pixel format', video.pix_fmt, 'yuv420p', video.pix_fmt === 'yuv420p');
  add('Duration', duration, '<= 140 s', duration <= 140);
  add('Frame rate', rate, '<= 60 fps', rate > 0 && rate <= 60);
  add('Dimensions', `${width}x${height}`, '1920x1080 or 1080x1920',
    (width <= 1920 && height <= 1080) || (width <= 1080 && height <= 1920));
  add('Aspect', width / height, '1:3 to 3:1', width / height >= 1 / 3 && width / height <= 3);
  add('Audio', audio.map(stream => stream.codec_name).join(',') || 'none',
    'AAC if present', audio.every(stream => stream.codec_name === 'aac'));
}

async function checkX(args, file) {
  if (!file) throw new Error('File path is required');
  const metadata = await probe(file);
  if (metadata.code) throw new Error(metadata.stderr);
  const video = metadata.data.streams.find(stream => stream.codec_type === 'video');
  if (!video) throw new Error('No video stream found');
  const checks = [];
  const add = (name, actual, limit, passed) => {
    checks.push({name, actual, limit, ok: passed});
  };
  if (video.codec_name === 'gif') {
    await gifChecks(file, video, add);
  } else {
    videoChecks(metadata.data, video, add);
  }
  const allPassed = checks.every(check => check.ok);
  if (!args.json) console.table(checks);
  if (!allPassed) process.exitCode = 3;
  return {file, ok: allPassed, checks};
}

async function exportMedia(args) {
  const [mode, file] = args._;
  const config = await loadProjectConfig();
  const fps = number(args, 'fps', config.fps ?? 24, {min: 0.001});
  if (mode === 'mp4') return exportMP4(args, fps);
  if (mode === 'gif') return exportGIF(args, fps);
  if (mode === 'loopcheck') return exportLoopCheck(args, file);
  if (mode === 'xcheck') return checkX(args, file);
  throw new Error('Mode must be mp4, gif, loopcheck, or xcheck');
}

await cli(usage, exportMedia);
