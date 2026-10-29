import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFile, spawnSync } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { writeWav, readWav } from '../scripts/lib/wav.mjs';
import { fft, bandEnergy, medianFreq, rms, db, peakSearch, removeDC } from '../scripts/lib/dsp.mjs';

const pluginDirectory = fileURLToPath(new URL('../', import.meta.url));
const execute = promisify(execFile);

for (const format of ['pcm16', 'pcm24', 'float32']) {
  test(`WAV ${format} mono/stereo round trip`, () => {
    for (const count of [1, 2]) {
      const channels = Array.from({ length: count }, (_, channel) =>
        Float32Array.from([0, -0.5, 0.25, 0.9 - channel / 10]));
      const result = readWav(writeWav({ sampleRate: 48000, channels, format }));
      assert.equal(result.sampleRate, 48000);
      assert.equal(result.channels.length, count);
      channels.forEach((samples, channel) => {
        samples.forEach((value, index) => {
          assert.ok(Math.abs(value - result.channels[channel][index]) < 0.00004);
        });
      });
    }
  });
}

test('FFT and spectral measurements identify sine frequencies and bass energy', () => {
  const sampleRate = 40960;
  const sine = Float32Array.from(
    { length: 4096 },
    (_, index) => Math.sin(2 * Math.PI * 1000 * index / sampleRate),
  );
  const spectrum = fft(sine);
  const magnitudes = spectrum.real.map((value, index) => Math.hypot(value, spectrum.imag[index]));
  const peakIndex = magnitudes.indexOf(Math.max(...magnitudes.slice(0, 2048)));
  assert.equal(peakIndex * sampleRate / sine.length, 1000);
  assert.ok(Math.abs(medianFreq(sine, sampleRate) - 1000) < 20);
  const bass = Float32Array.from(
    { length: 48000 },
    (_, index) => Math.sin(2 * Math.PI * 40 * index / 48000),
  );
  assert.ok(bandEnergy(bass, 48000).under60 > 95);
});

test('DSP RMS, DC subtraction and sample-exact peak search', () => {
  assert.equal(rms([1, -1]), 1);
  assert.equal(db(0.1), -20);
  assert.deepEqual([...removeDC([1, 2, 3])], [-1, 0, 1]);
  const samples = new Float32Array(4800);
  samples[2403] = -1;
  assert.equal(peakSearch([samples], 48000, 0.05).sample, 2403);
});

test('audio-measure reports known event offsets and ffmpeg LUFS', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'motion-audio-'));
  try {
    const sampleRate = 48000;
    const samples = Float32Array.from(
      { length: sampleRate * 2 },
      (_, index) => 0.03 * Math.sin(2 * Math.PI * 1000 * index / sampleRate),
    );
    for (const index of [24000 + 144, 48000 - 192]) samples[index] = 0.9;
    const audio = path.join(directory, 'hits.wav');
    const opposite = Float32Array.from(samples, value => -value);
    await writeFile(audio, writeWav({ sampleRate, channels: [samples, opposite] }));
    const bed = path.join(directory, 'bed.wav');
    const bedChannels = [samples, opposite].map(channel =>
      Float32Array.from(channel, value => value / 10 ** (4 / 20)));
    await writeFile(bed, writeWav({ sampleRate, channels: bedChannels }));
    const events = path.join(directory, 'events.json');
    await writeFile(events, JSON.stringify([
      { frame: 29, name: 'late' }, { frame: 59, name: 'early' },
    ]));
    const measured = spawnSync(process.execPath, [
      'scripts/audio-measure.mjs', audio, '--events', events, '--fps', '60',
      '--bed', bed, '--json',
    ], { cwd: pluginDirectory, encoding: 'utf8' });
    assert.equal(measured.status, 0, measured.stderr);
    const report = JSON.parse(measured.stdout);
    assert.ok(Math.abs(report.events[0].offset_ms - 3) < 0.5);
    assert.ok(Math.abs(report.events[1].offset_ms + 4) < 0.5);
    assert.ok(Math.abs(report.events[0].db_over_bed - 4) < 0.001);
    assert.equal(report.events[0].offset_basis, 'hit');
    assert.equal(report.events[0].weighting, 'K');
    const withoutBed = spawnSync(process.execPath, [
      'scripts/audio-measure.mjs', audio, '--events', events, '--fps', '60', '--json',
    ], { cwd: pluginDirectory, encoding: 'utf8' });
    assert.equal(withoutBed.status, 0, withoutBed.stderr);
    const mixReport = JSON.parse(withoutBed.stdout);
    assert.equal(mixReport.events[0].offset_basis, 'mix');
    assert.ok(mixReport.findings.some(finding => /may reflect the bed/.test(finding.message)));
    assert.ok(report.band_energy_percent.hz150_6000 > 95);
    assert.ok(Math.abs(report.median_spectral_hz - 1000) < 20,
      'antiphase stereo retains spectral energy');
    const ffmpeg = spawnSync('ffmpeg', [
      '-hide_banner', '-i', audio, '-af', 'ebur128=peak=true', '-f', 'null', '-',
    ], { encoding: 'utf8' });
    const matches = [...ffmpeg.stderr.matchAll(/I:\s*(-?[\d.]+) LUFS/g)];
    const expectedLoudness = Number(matches.at(-1)[1]);
    assert.ok(Math.abs(report.loudness.integrated_lufs - expectedLoudness) < 0.5);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('WAV rejects malformed data and non-finite samples', () => {
  assert.throws(() => readWav(Buffer.from('not a wave')), /RIFF/);
  assert.throws(() => writeWav({ sampleRate: 48000, channels: [[NaN]] }), /finite/);
  assert.throws(() => writeWav({ sampleRate: 48000, channels: [[0], [0, 1]] }), /equal lengths/);
});

test('FFT rejects non-radix-2 input and peak search handles missing windows', () => {
  assert.throws(() => fft([1, 2, 3]), /power of two/);
  assert.equal(peakSearch([new Float32Array(10)], 48000, 2), null);
});

async function browserAvailable(context) {
  try {
    await import('playwright');
    return true;
  } catch {
    context.skip('playwright is not installed; score integration requires the optional peer');
    return false;
  }
}

test('score uses final warm-up pass and subtracts channel DC', async context => {
  if (!await browserAvailable(context)) return;
  const directory = await mkdtemp(path.join(tmpdir(), 'motion-score-'));
  try {
    const html = path.join(directory, 'audio.html');
    const wav = path.join(directory, 'audio.wav');
    await writeFile(html, `<!doctype html><script>
      let passes = 0;
      window.renderAudio = async ({ sampleRate, secs }) => {
        passes++;
        const channels = [Float32Array.from(
          { length: Math.round(sampleRate * secs) },
          (_, index) => 0.25 + passes * 0.1 * Math.sin(2 * Math.PI * 1000 * index / sampleRate)
        )];
        return { sampleRate, channels };
      };
    </script>`);
    const result = await execute(process.execPath, [
      'scripts/score.mjs', html, '--out', wav, '--secs', '0.1',
      '--passes', '2', '--dc', '--json',
    ], { cwd: pluginDirectory });
    const report = JSON.parse(result.stdout);
    assert.equal(report.passes, 2);
    const decoded = readWav(await readFile(wav));
    assert.equal(decoded.sampleRate, 48000);
    assert.equal(decoded.channels[0].length, 4800);
    assert.ok(Math.abs(rms(decoded.channels[0]) - 0.2 / Math.sqrt(2)) < 0.00001);
    const mean = decoded.channels[0].reduce((sum, value) => sum + value, 0) / 4800;
    assert.ok(Math.abs(mean) < 0.000001);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('score forwards --bed-only to renderAudio', async context => {
  if (!await browserAvailable(context)) return;
  const directory = await mkdtemp(path.join(tmpdir(), 'motion-bed-'));
  try {
    const html = path.join(directory, 'audio.html');
    await writeFile(html, `<!doctype html><script>
      window.renderAudio = async ({ sampleRate, bedOnly }) => ({
        sampleRate, channels: [[bedOnly ? 0.25 : 0.75]]
      });
    </script>`);
    for (const bedOnly of [false, true]) {
      const wav = path.join(directory, bedOnly ? 'bed.wav' : 'mix.wav');
      await execute(process.execPath, [
        'scripts/score.mjs', html, '--out', wav, '--passes', '1',
        ...(bedOnly ? ['--bed-only'] : []),
      ], { cwd: pluginDirectory });
      const decoded = readWav(await readFile(wav));
      assert.equal(decoded.channels[0][0], bedOnly ? 0.25 : 0.75);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('audio-measure isolates a quiet event from a louder 140 Hz bed', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'motion-residual-'));
  try {
    const sampleRate = 48000;
    const targetSample = sampleRate / 2;
    const bedSamples = Float32Array.from(
      { length: sampleRate },
      (_, sample) => 0.3 * Math.sin(2 * Math.PI * 140 * sample / sampleRate),
    );
    const mixSamples = Float32Array.from(bedSamples);
    for (let sample = 0; sample < sampleRate * 0.005; sample++) {
      mixSamples[targetSample + sample] += 0.1
        * Math.cos(2 * Math.PI * 1800 * sample / sampleRate)
        * Math.exp(-sample / (sampleRate * 0.001));
    }
    const mix = path.join(directory, 'mix.wav');
    const bed = path.join(directory, 'bed.wav');
    const events = path.join(directory, 'events.json');
    await writeFile(mix, writeWav({ sampleRate, channels: [mixSamples] }));
    await writeFile(bed, writeWav({ sampleRate, channels: [bedSamples] }));
    await writeFile(events, JSON.stringify([{ frame: 29, name: 'quiet hit' }]));
    const result = spawnSync(process.execPath, [
      'scripts/audio-measure.mjs', mix, '--bed', bed, '--events', events,
      '--fps', '60', '--json',
    ], { cwd: pluginDirectory, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    const report = JSON.parse(result.stdout);
    assert.ok(Math.abs(report.events[0].offset_ms) <= 0.1);
    assert.equal(report.events[0].offset_basis, 'hit');
    assert.equal(report.events[0].weighting, 'K');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
