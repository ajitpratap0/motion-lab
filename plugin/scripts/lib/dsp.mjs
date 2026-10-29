/** Return the full radix-2 complex FFT without mutating the input. */
export function fft(input) {
  const size = input.length;
  if (size < 2 || (size & (size - 1))) {
    throw new Error('FFT size must be a power of two');
  }
  const real = Float64Array.from(input);
  const imag = new Float64Array(size);
  for (let index = 1, reversed = 0; index < size; index++) {
    let bit = size >> 1;
    for (; reversed & bit; bit >>= 1) reversed ^= bit;
    reversed ^= bit;
    if (index < reversed) {
      [real[index], real[reversed]] = [real[reversed], real[index]];
    }
  }
  for (let length = 2; length <= size; length *= 2) {
    for (let start = 0; start < size; start += length) {
      for (let index = 0; index < length / 2; index++) {
        const angle = -2 * Math.PI * index / length;
        const cosine = Math.cos(angle);
        const sine = Math.sin(angle);
        const first = start + index;
        const second = first + length / 2;
        const realPart = real[second] * cosine - imag[second] * sine;
        const imaginaryPart = real[second] * sine + imag[second] * cosine;
        real[second] = real[first] - realPart;
        imag[second] = imag[first] - imaginaryPart;
        real[first] += realPart;
        imag[first] += imaginaryPart;
      }
    }
  }
  return { real, imag };
}

/** Return root mean square amplitude, or zero for an empty signal. */
export function rms(samples) {
  if (!samples.length) return 0;
  let energy = 0;
  for (const value of samples) energy += value * value;
  return Math.sqrt(energy / samples.length);
}

/** Convert an amplitude ratio to decibels. */
export function db(amplitude) {
  return amplitude > 0 ? 20 * Math.log10(amplitude) : -Infinity;
}

/** Return float samples with the channel mean removed. */
export function removeDC(samples) {
  let sum = 0;
  for (const value of samples) sum += value;
  const mean = samples.length ? sum / samples.length : 0;
  return Float32Array.from(samples, value => value - mean);
}

/** Sum power over Hann-windowed 4096-sample windows with a 2048-sample hop. */
export function spectralPower(samples, sampleRate, size = 4096, hop = 2048) {
  const power = new Float64Array(size / 2 + 1);
  const window = new Float64Array(size);
  for (let start = 0; start < Math.max(1, samples.length); start += hop) {
    for (let index = 0; index < size; index++) {
      const hann = 0.5 - 0.5 * Math.cos(2 * Math.PI * index / (size - 1));
      window[index] = (samples[start + index] || 0) * hann;
    }
    const { real, imag } = fft(window);
    for (let index = 0; index < power.length; index++) {
      const weight = index === 0 || index === size / 2 ? 1 : 2;
      power[index] += (real[index] ** 2 + imag[index] ** 2) * weight;
    }
    if (start + size >= samples.length) break;
  }
  return { power, binHz: sampleRate / size };
}

function bandName(frequency) {
  if (frequency < 60) return 'under60';
  if (frequency < 150) return 'hz60_150';
  if (frequency < 6000) return 'hz150_6000';
  if (frequency <= 8000) return 'hz6000_8000';
  return 'over8000';
}

/** Return each frequency band's percentage of total spectral energy. */
export function bandEnergy(samples, sampleRate) {
  const { power, binHz } = spectralPower(samples, sampleRate);
  let total = 0;
  const bands = { under60: 0, hz60_150: 0, hz150_6000: 0, hz6000_8000: 0, over8000: 0 };
  power.forEach((energy, index) => {
    bands[bandName(index * binHz)] += energy;
    total += energy;
  });
  return Object.fromEntries(Object.entries(bands).map(([name, energy]) => [
    name,
    total ? energy / total * 100 : 0,
  ]));
}

/** Return the spectral frequency below which half the signal's power lies. */
export function medianFreq(samples, sampleRate) {
  const { power, binHz } = spectralPower(samples, sampleRate);
  const total = power.reduce((sum, value) => sum + value, 0);
  if (!total) return 0;
  let cumulative = 0;
  for (let index = 0; index < power.length; index++) {
    cumulative += power[index];
    if (cumulative >= total / 2) return index * binHz;
  }
  return 0;
}

/** Find the largest absolute multichannel sample near a target time in seconds. */
export function peakSearch(channels, sampleRate, target, before = 0.015, after = 0.04) {
  const length = channels[0]?.length || 0;
  const start = Math.max(0, Math.ceil((target - before) * sampleRate));
  const end = Math.min(length - 1, Math.floor((target + after) * sampleRate));
  if (start > end) return null;
  let sample = start;
  let amplitude = -1;
  for (let index = start; index <= end; index++) {
    for (const channel of channels) {
      if (Math.abs(channel[index]) > amplitude) {
        amplitude = Math.abs(channel[index]);
        sample = index;
      }
    }
  }
  return {
    sample,
    time: sample / sampleRate,
    amplitude,
    offset_ms: (sample / sampleRate - target) * 1000,
  };
}

function shelfCoefficients(sampleRate) {
  const tangent = Math.tan(Math.PI * 1681.974450955533 / sampleRate);
  const quality = 0.7071752369554196;
  const highGain = 10 ** (3.999843853973347 / 20);
  const bandGain = highGain ** 0.4996667741545416;
  const denominator = 1 + tangent / quality + tangent ** 2;
  return {
    numerator: [
      (highGain + bandGain * tangent / quality + tangent ** 2) / denominator,
      2 * (tangent ** 2 - highGain) / denominator,
      (highGain - bandGain * tangent / quality + tangent ** 2) / denominator,
    ],
    denominator: [
      1,
      2 * (tangent ** 2 - 1) / denominator,
      (1 - tangent / quality + tangent ** 2) / denominator,
    ],
  };
}

function highpassCoefficients(sampleRate) {
  const tangent = Math.tan(Math.PI * 38.13547087602444 / sampleRate);
  const quality = 0.5003270373238773;
  const denominator = 1 + tangent / quality + tangent ** 2;
  return {
    numerator: [1, -2, 1],
    denominator: [
      1,
      2 * (tangent ** 2 - 1) / denominator,
      (1 - tangent / quality + tangent ** 2) / denominator,
    ],
  };
}

function responseMagnitude(coefficients, frequency, sampleRate) {
  const angle = -2 * Math.PI * frequency / sampleRate;
  const magnitude = values => Math.hypot(
    values.reduce((sum, value, index) => sum + value * Math.cos(index * angle), 0),
    values.reduce((sum, value, index) => sum + value * Math.sin(index * angle), 0),
  );
  return magnitude(coefficients.numerator) / magnitude(coefficients.denominator);
}

function biquad(samples, coefficients) {
  const [first, second, third] = coefficients.numerator;
  const [, feedbackFirst, feedbackSecond] = coefficients.denominator;
  const output = new Float64Array(samples.length);
  let previousInput = 0;
  let olderInput = 0;
  let previousOutput = 0;
  let olderOutput = 0;
  for (let index = 0; index < samples.length; index++) {
    const value = first * samples[index] + second * previousInput + third * olderInput
      - feedbackFirst * previousOutput - feedbackSecond * olderOutput;
    output[index] = value;
    olderInput = previousInput;
    previousInput = samples[index];
    olderOutput = previousOutput;
    previousOutput = value;
  }
  return output;
}

/** Apply BS.1770 K-weighting, calibrated to unity gain at 997 Hz for RMS reporting. */
export function kWeight(samples, sampleRate) {
  if (!Number.isFinite(sampleRate) || sampleRate <= 4000) {
    throw new Error('K-weighting requires a sample rate above 4000 Hz');
  }
  const shelf = shelfCoefficients(sampleRate);
  const highpass = highpassCoefficients(sampleRate);
  const calibration = responseMagnitude(shelf, 997, sampleRate)
    * responseMagnitude(highpass, 997, sampleRate);
  const weighted = biquad(biquad(samples, shelf), highpass);
  return weighted.map(value => value / calibration);
}
