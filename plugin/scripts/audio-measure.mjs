import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { cli, number } from './lib/args.mjs';
import { run, checked, probe } from './lib/ffmpeg.mjs';
import { withPage } from './lib/page.mjs';
import { bandEnergy, medianFreq, rms } from './lib/dsp.mjs';
import { eventSignals, measureEvent } from './lib/audio-events.mjs';
import { loadProjectConfig } from './lib/project.mjs';

const usage = [
  'Usage: audio-measure.mjs <audio.wav|video.mp4>',
  '  [--events events.json | --from-page file.html] [--fps 60]',
  '  [--bed bed.wav] [--video video.mp4] [--json]',
  'Defaults come from motion-lab.json when present.',
].join('\n');
const sampleRate = 48000;

function inputArgs(file) {
  // Periodic float samples can fool MPEG-TS detection; WAV is explicit in the contract.
  return [...(/\.wav$/i.test(file) ? ['-f', 'wav'] : []), '-i', path.resolve(file)];
}

async function decode(file) {
  const { stdout } = await checked([
    ...inputArgs(file), '-vn', '-ar', String(sampleRate), '-ac', '2', '-f', 'f32le', 'pipe:1',
  ], { raw: true });
  const count = Math.floor(stdout.length / 8);
  return Array.from({ length: 2 }, (_, channel) => Float32Array.from(
    { length: count },
    (_, index) => stdout.readFloatLE(index * 8 + channel * 4),
  ));
}

function parseLoudness(stderr) {
  const values = [...stderr.matchAll(/\bI:\s*(-?inf|-?[\d.]+)\s*LUFS/gi)];
  const peaks = [...stderr.matchAll(/Peak:\s*(-?inf|-?[\d.]+)\s*dBFS/gi)];
  if (!values.length || !peaks.length) {
    throw new Error('Could not parse ffmpeg ebur128 loudness summary');
  }
  const numeric = value => value.toLowerCase() === '-inf' ? -Infinity : Number(value);
  return {
    integrated_lufs: numeric(values.at(-1)[1]),
    true_peak_dbtp: numeric(peaks.at(-1)[1]),
  };
}

async function loudness(file, phone = false) {
  const filter = `${phone ? 'highpass=f=200,lowpass=f=6000,' : ''}ebur128=peak=true`;
  const result = await run('ffmpeg', [
    '-hide_banner', '-nostats', ...inputArgs(file), '-vn', '-af', filter, '-f', 'null', '-',
  ]);
  if (result.code) throw new Error(`ffmpeg loudness measurement failed: ${result.stderr}`);
  return parseLoudness(result.stderr);
}

async function readEvents(args) {
  let events = [];
  if (args.events) events = JSON.parse(await readFile(path.resolve(args.events), 'utf8'));
  if (args['from-page']) {
    events = await withPage(
      args['from-page'], {}, page => page.evaluate(() => window.__events || []),
    );
  }
  const validEvent = event => event && Number.isInteger(event.frame)
    && event.frame >= 0 && typeof event.name === 'string';
  if (!Array.isArray(events) || !events.every(validEvent)) {
    throw new Error('Events must be an array of {frame: nonnegative integer, name: string}');
  }
  return events;
}

function combinedBands(channels) {
  const energies = channels.map(channel => rms(channel) ** 2);
  const total = energies.reduce((sum, energy) => sum + energy, 0);
  const bands = channels.map(channel => bandEnergy(channel, sampleRate));
  return Object.fromEntries(Object.keys(bands[0]).map(key => [
    key,
    total ? bands.reduce((sum, band, index) => sum + band[key] * energies[index], 0) / total : 0,
  ]));
}

function loudnessFindings(full, bands, findings) {
  if (full.integrated_lufs < -15 || full.integrated_lufs > -13) {
    findings.push({ severity: 'warn', message: 'Integrated loudness is outside -14 ± 1 LUFS' });
  }
  if (full.true_peak_dbtp > -1) {
    findings.push({ severity: 'warn', message: 'True peak exceeds -1 dBTP' });
  }
  if (bands.under60 > 50) {
    findings.push({
      severity: 'warn',
      message: 'More than 50% energy is under 60 Hz; phones play nothing there',
    });
  }
}

async function measureSeam(channels, videoFile) {
  const seam = {
    sample_step: channels.map(channel =>
      channel.length ? Math.abs(channel.at(-1) - channel[0]) : 0),
  };
  if (videoFile) {
    const video = await probe(path.resolve(videoFile));
    if (video.code) throw new Error(`ffprobe failed: ${video.stderr}`);
    const stream = video.data.streams.find(candidate => candidate.codec_type === 'video');
    const duration = Number(stream?.duration ?? video.data.format?.duration);
    if (!Number.isFinite(duration)) throw new Error('Could not determine video duration');
    seam.audio_minus_video_ms = (channels[0].length / sampleRate - duration) * 1000;
  }
  return seam;
}

async function measureAudio(args) {
  if (!args._[0]) throw new Error('Expected an audio or video file');
  if (args.events && args['from-page']) throw new Error('Choose --events or --from-page');
  const file = args._[0];
  const config = await loadProjectConfig();
  const fps = number(args, 'fps', config.fps ?? 60, { min: 0.000001 });
  const [channels, full, phone] = await Promise.all([
    decode(file), loudness(file), loudness(file, true),
  ]);
  const events = await readEvents(args);
  const bed = args.bed ? await decode(args.bed) : null;
  const findings = [];
  if (!bed && events.length) {
    findings.push({
      severity: 'warn',
      message: 'Event offsets use mix peaks and may reflect the bed; supply --bed for hit offsets',
    });
  }
  const signals = eventSignals(channels, bed, sampleRate);
  const measuredEvents = events.map(event =>
    measureEvent(event, signals, fps, sampleRate, findings));
  const bands = combinedBands(channels);
  // Concatenating channels retains independent spectral energy, including antiphase stereo.
  const joined = new Float32Array(channels[0].length * 2);
  joined.set(channels[0]);
  joined.set(channels[1], channels[0].length);
  loudnessFindings(full, bands, findings);
  return {
    file: path.resolve(file),
    sampleRate,
    duration: channels[0].length / sampleRate,
    loudness: full,
    phone_band_lufs: phone.integrated_lufs,
    band_energy_percent: bands,
    median_spectral_hz: medianFreq(joined, sampleRate),
    events: measuredEvents,
    seam: await measureSeam(channels, args.video),
    findings,
  };
}

await cli(usage, measureAudio);
