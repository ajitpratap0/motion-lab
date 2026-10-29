import {readdir, mkdir, readFile} from 'node:fs/promises';
import path from 'node:path';
import {checked, probe} from './ffmpeg.mjs';

/** Read the frame index from a bare or prefixed numbered PNG filename. */
export function frameNumber(file) {
  const match = /^(.*?)(\d+)\.png$/i.exec(path.basename(file));
  if (!match) throw new Error(`Not a numbered PNG frame: ${file}`);
  return Number(match[2]);
}

/** Discover one PNG sequence and apply its optional frames.json count. */
export async function discoverFrames(directory) {
  const entries = await readdir(directory);
  const numbered = entries.map(file => {
    const match = /^(.*?)(\d+)\.png$/i.exec(file);
    if (!match) return null;
    return {
      file,
      prefix: match[1],
      digits: match[2].length,
      number: Number(match[2]),
      extension: path.extname(file),
    };
  }).filter(Boolean).sort((first, second) => first.number - second.number);
  const prefixes = new Set(numbered.map(frame => frame.prefix));
  if (prefixes.size > 1) throw new Error('Multiple distinct PNG sequences found');
  const digits = numbered.reduce((minimum, frame) => Math.min(minimum, frame.digits), Infinity);
  for (const frame of numbered) {
    const paddedNumber = String(frame.number).padStart(digits, '0');
    const expectedName = frame.prefix + paddedNumber + frame.extension;
    if (frame.file !== expectedName) {
      throw new Error('PNG sequence contains inconsistent number padding');
    }
  }
  let manifest;
  try {
    manifest = JSON.parse(await readFile(path.join(directory, 'frames.json'), 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') throw new Error(`Invalid frames.json: ${error.message}`);
  }
  if (manifest && (!Number.isInteger(manifest.count) || manifest.count < 1)) {
    throw new Error('frames.json count must be a positive integer');
  }
  const first = numbered[0];
  const count = manifest?.count ?? numbered.length;
  if (manifest && numbered.length < count) {
    throw new Error('PNG sequence contains fewer frames than frames.json count');
  }
  let contiguous = 0;
  while (numbered[contiguous]?.number === first?.number + contiguous) contiguous++;
  if (manifest && contiguous > count) {
    const stale = contiguous - count;
    console.error(`motion-lab: ignoring ${stale} stale frames beyond frames.json count`);
  }
  return {
    files: numbered.slice(0, count).map(frame => path.join(directory, frame.file)),
    pattern: first
      ? path.join(directory, `${first.prefix}%0${digits}d${first.extension}`) : null,
    startNumber: first?.number ?? 0,
    count,
    contiguous: contiguous >= count,
    manifest,
  };
}

/** List numbered PNG frames in numeric order, respecting frames.json when present. */
export async function frameFiles(directory) {
  return (await discoverFrames(directory)).files;
}

/** Return ffmpeg input arguments for a complete contiguous PNG sequence. */
export function sequenceInput(sequence, fps) {
  if (!sequence.files.length) throw new Error('No PNG frames found');
  if (!sequence.contiguous) throw new Error('PNG sequence contains missing frame numbers');
  return ['-framerate', String(fps), '-start_number', String(sequence.startNumber),
    '-i', sequence.pattern];
}

/** Decode one image as packed RGB bytes. */
export async function decodeImage(file) {
  const metadata = await probe(file);
  if (metadata.code) throw new Error(metadata.stderr);
  const stream = metadata.data.streams.find(stream => stream.codec_type === 'video');
  if (!stream) throw new Error('No image stream');
  const result = await checked([
    '-i', file, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1',
  ], {raw: true});
  return {width: stream.width, height: stream.height, data: result.stdout};
}

/** Compare RGB pixels, reporting the changed region and mean channel delta. */
export function comparePixels(first, second, threshold = 8) {
  if (first.width !== second.width || first.height !== second.height) {
    throw new Error('Image dimensions differ');
  }
  let changedPixels = 0;
  let total = 0;
  let minX = first.width;
  let minY = first.height;
  let maxX = -1;
  let maxY = -1;
  for (let pixel = 0; pixel < first.width * first.height; pixel++) {
    let changed = false;
    for (let channel = 0; channel < 3; channel++) {
      const offset = pixel * 3 + channel;
      const delta = Math.abs(first.data[offset] - second.data[offset]);
      total += delta;
      if (delta > threshold) changed = true;
    }
    if (changed) {
      changedPixels++;
      const x = pixel % first.width;
      const y = Math.floor(pixel / first.width);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  return {
    changedPixels,
    bbox: changedPixels
      ? {x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1}
      : null,
    meanDelta: total / (first.width * first.height * 3),
  };
}

/** Decode and compare two image files. */
export async function compareImages(first, second, threshold = 8) {
  return comparePixels(await decodeImage(first), await decodeImage(second), threshold);
}

/** Encode numbered PNGs as an X-compatible H.264 video. */
export async function encodeVideo({frames, fps = 24, out, audio, loudnorm = false, frameCount}) {
  await mkdir(path.dirname(path.resolve(out)), {recursive: true});
  const sequence = await discoverFrames(frames);
  const args = sequenceInput(sequence, fps);
  const count = frameCount ?? sequence.count;
  if (audio) args.push('-i', audio);
  if (count !== undefined) {
    if (!Number.isInteger(count) || count < 1) {
      throw new Error('Video frame count must be a positive integer');
    }
    args.push('-frames:v', String(Math.min(count, sequence.count)));
  }
  args.push(
    '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
    '-crf', '18', '-movflags', '+faststart',
  );
  if (audio) {
    args.push('-c:a', 'aac', '-b:a', '192k', '-shortest');
    if (loudnorm) args.push('-af', 'loudnorm=I=-14:TP=-1:LRA=11');
  }
  args.push('-y', out);
  await checked(args);
  return out;
}
