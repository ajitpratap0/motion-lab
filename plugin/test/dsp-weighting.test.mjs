import test from 'node:test';
import assert from 'node:assert/strict';
import { kWeight, rms, db } from '../scripts/lib/dsp.mjs';
import { eventSignals, measureEvent, windowRms } from '../scripts/lib/audio-events.mjs';

function sine(sampleRate, frequency, amplitude = 0.1) {
  return Float64Array.from(
    { length: sampleRate * 2 },
    (_, sample) => amplitude * Math.sin(2 * Math.PI * frequency * sample / sampleRate),
  );
}

test('K-weighting calibrates 997 Hz and attenuates 50 Hz at multiple sample rates', () => {
  for (const sampleRate of [44100, 48000, 96000]) {
    const reference = sine(sampleRate, 997);
    const weighted = kWeight(reference, sampleRate);
    const originalLevel = db(rms(reference.subarray(sampleRate)));
    const weightedLevel = db(rms(weighted.subarray(sampleRate)));
    assert.ok(Math.abs(weightedLevel - originalLevel) < 0.1,
      `${sampleRate} Hz: reference gain ${weightedLevel - originalLevel} dB`);
    const bass = sine(sampleRate, 50);
    const weightedBass = kWeight(bass, sampleRate);
    assert.ok(db(rms(weightedBass.subarray(sampleRate))) < db(rms(bass)) - 3);
  }
});

test('event peaks use mix minus bed and K-weighted level over the first 60 ms', () => {
  const sampleRate = 48000;
  const targetSample = 24000;
  const bed = sine(sampleRate, 140, 0.3);
  const mix = Float64Array.from(bed);
  for (let sample = 0; sample < sampleRate * 0.005; sample++) {
    // An exponentially decaying cosine has its largest sample exactly at the target.
    mix[targetSample + sample] += 0.1 * Math.cos(2 * Math.PI * 1800 * sample / sampleRate)
      * Math.exp(-sample / (sampleRate * 0.001));
  }
  const signals = eventSignals([mix], [bed], sampleRate);
  const report = measureEvent({ frame: 29, name: 'hit' }, signals, 60, sampleRate, []);
  assert.ok(Math.abs(report.offset_ms) <= 0.1);
  assert.equal(report.offset_basis, 'hit');
  assert.equal(report.weighting, 'K');
  const expected = db(windowRms([kWeight(mix, sampleRate)], sampleRate, 0.5))
    - db(windowRms([kWeight(bed, sampleRate)], sampleRate, 0.5));
  assert.ok(Math.abs(report.db_over_bed - expected) < 1e-10);
});

test('events without a bed identify their timing basis as the mix', () => {
  const samples = new Float32Array(48000);
  samples[24000] = 1;
  const signals = eventSignals([samples], null, 48000);
  const report = measureEvent({ frame: 29, name: 'mix' }, signals, 60, 48000, []);
  assert.equal(report.offset_basis, 'mix');
  assert.equal(report.offset_ms, 0);
});

test('silent residuals have no timing peak and truncated beds are padded before filtering', () => {
  const sampleRate = 48000;
  const mix = sine(sampleRate, 140, 0.3);
  const identical = eventSignals([mix], [mix], sampleRate);
  const findings = [];
  const silent = measureEvent({ frame: 29, name: 'no hit' }, identical, 60, sampleRate, findings);
  assert.equal(silent.offset_ms, null);
  assert.equal(silent.offset_basis, 'hit');
  assert.equal(silent.weighting, 'K');
  assert.ok(findings.some(finding => /only silence/.test(finding.message)));
  const shortBed = mix.subarray(0, 12000);
  const truncated = eventSignals([mix], [shortBed], sampleRate);
  const padded = new Float64Array(mix.length);
  padded.set(shortBed);
  assert.deepEqual(truncated.weightedBed[0], kWeight(padded, sampleRate));
  assert.equal(truncated.peakChannels[0][24000], mix[24000]);
});
