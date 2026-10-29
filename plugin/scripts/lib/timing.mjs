function requirePositive(value, name) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be positive`);
  }
}

/** Return the rounded number of frames; frame N is outside the sequence. */
export function frameCount(secs, fps) {
  requirePositive(secs, 'secs');
  requirePositive(fps, 'fps');
  return Math.round(secs * fps);
}

/** Return frame timestamps from zero through (N - 1) / fps. */
export function frameTimes(secs, fps) {
  return Array.from({ length: frameCount(secs, fps) }, (_, frame) => frame / fps);
}

/** Sample a centered shutter interval, optionally wrapping at the loop duration. */
export function subframeTimes(frame, fps, count = 1, shutter = 0.5, secs) {
  requirePositive(fps, 'fps');
  const invalid = !Number.isInteger(count) || count < 1 || !Number.isFinite(frame)
    || !Number.isFinite(shutter) || shutter < 0;
  if (invalid) {
    throw new Error('Invalid subframe parameters');
  }
  if (secs !== undefined) {
    requirePositive(secs, 'secs');
  }

  return Array.from({ length: count }, (_, sample) => {
    const time = (frame + shutter * ((sample + 0.5) / count - 0.5)) / fps;
    return secs === undefined ? time : ((time % secs) + secs) % secs;
  });
}

/** Round each beat's exact position independently, starting at beat zero. */
export function beatFrames(bpm, fps, count) {
  requirePositive(bpm, 'bpm');
  requirePositive(fps, 'fps');
  if (!Number.isInteger(count) || count < 0) {
    throw new Error('Beat count must be a nonnegative integer');
  }
  return Array.from({ length: count }, (_, beat) => Math.round(beat * 60 / bpm * fps));
}

/** Return signed rounded-interval drift relative to the exact rounded endpoint. */
export function accumulatedDrift(bpm, fps, beats) {
  requirePositive(bpm, 'bpm');
  requirePositive(fps, 'fps');
  return beats * Math.round(60 / bpm * fps) - Math.round(beats * 60 / bpm * fps);
}

/** Return the text hold duration: 0.3 seconds per word plus 0.5 seconds. */
export function holdSeconds(words) {
  if (!Number.isInteger(words) || words < 0) {
    throw new Error('words must be a nonnegative integer');
  }
  return words * 0.3 + 0.5;
}

/** Distribute centisecond delays so cumulative GIF duration tracks exact fps. */
export function gifDelays(count, fps) {
  requirePositive(fps, 'fps');
  if (!Number.isInteger(count) || count < 0) {
    throw new Error('Invalid frame count');
  }
  return Array.from({ length: count }, (_, frame) => (
    Math.round(100 * (frame + 1) / fps) - Math.round(100 * frame / fps)
  ));
}

/**
 * Default review stills: the first frame, the quarter points and the last frame, all inside 0..count-1.
 * @param {number} count Frame count.
 * @returns {number[]}
 */
export function defaultStills(count) {
  const points = [0, 0.25, 0.5, 0.75].map(fraction => Math.floor(fraction * count));
  return [...new Set([...points, count - 1])].filter(frame => frame >= 0 && frame < count);
}
