import { cli, number } from './lib/args.mjs';
import { beatFrames, accumulatedDrift, holdSeconds } from './lib/timing.mjs';

const usage = 'Usage: node scripts/beats.mjs --bpm 120 --fps 24 [--beats 32] '
  + '[--secs 6] [--hold "two words" | --words 2] [--json]';

function textHold(args, fps) {
  if (args.hold === true) {
    throw new Error('--hold requires text');
  }
  const words = args.words !== undefined
    ? number(args, 'words', 0, { min: 0, integer: true })
    : String(args.hold).trim().split(/\s+/).filter(Boolean).length;
  const seconds = holdSeconds(words);
  return { words, seconds, frames: Math.round(seconds * fps) };
}

function reportBeats(args) {
  const bpm = number(args, 'bpm', 120, { min: Number.EPSILON });
  const fps = number(args, 'fps', 24, { min: Number.EPSILON });
  const defaultCount = args.secs
    ? Math.ceil(number(args, 'secs', 6, { min: Number.EPSILON }) * bpm / 60)
    : 32;
  const count = number(args, 'beats', defaultCount, { min: 1, integer: true });
  const frames = beatFrames(bpm, fps, count);
  const result = {
    bpm,
    fps,
    framesPerBeat: fps * 60 / bpm,
    beats: frames,
    bars: frames.filter((_, index) => index % 4 === 0),
    driftFrames: accumulatedDrift(bpm, fps, count),
  };

  if (args.hold !== undefined || args.words !== undefined) {
    result.hold = textHold(args, fps);
  }
  return result;
}

await cli(usage, reportBeats);
