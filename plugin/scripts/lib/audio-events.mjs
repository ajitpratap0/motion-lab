import { db, kWeight, peakSearch } from './dsp.mjs';

/** Subtract a sample-aligned bed, treating samples beyond the bed as silence. */
export function subtractBed(channels, bed) {
  return channels.map((channel, channelIndex) => Float64Array.from(
    channel,
    (value, sample) => value - (bed[channelIndex]?.[sample] ?? 0),
  ));
}

/** Return multichannel RMS over a time window; filters must be applied before windowing. */
export function windowRms(channels, sampleRate, target, duration = 0.06) {
  const start = Math.max(0, Math.round(target * sampleRate));
  const end = Math.round((target + duration) * sampleRate);
  let energy = 0;
  let count = 0;
  for (const channel of channels) {
    for (let index = start; index < Math.min(end, channel.length); index++) {
      energy += channel[index] ** 2;
      count++;
    }
  }
  return count ? Math.sqrt(energy / count) : 0;
}

/** Prepare signals once, preserving K-weighting filter history ahead of every event. */
export function eventSignals(channels, bed, sampleRate) {
  const alignedBed = bed ? channels.map((channel, channelIndex) => Float64Array.from(
    { length: channel.length },
    (_, sample) => bed[channelIndex]?.[sample] ?? 0,
  )) : null;
  return {
    peakChannels: alignedBed ? subtractBed(channels, alignedBed) : channels,
    weightedMix: alignedBed ? channels.map(channel => kWeight(channel, sampleRate)) : null,
    weightedBed: alignedBed ? alignedBed.map(channel => kWeight(channel, sampleRate)) : null,
    offsetBasis: bed ? 'hit' : 'mix',
  };
}

/** Measure event timing and K-weighted mix-versus-bed level in its first 60 ms. */
export function measureEvent(event, signals, fps, sampleRate, findings) {
  const target = (event.frame + 1) / fps;
  const peak = peakSearch(signals.peakChannels, sampleRate, target);
  const result = { ...event, target, offset_basis: signals.offsetBasis, offset_ms: null };
  if (signals.weightedBed) result.weighting = 'K';
  if (!peak || peak.amplitude === 0) {
    findings.push({
      severity: 'warn',
      event: event.name,
      message: !peak ? 'Event search window is outside audio'
        : 'Event search window contains only silence',
    });
    return result;
  }
  result.peak = peak.time;
  result.offset_ms = peak.offset_ms;
  if (Math.abs(peak.offset_ms) > 1) {
    findings.push({
      severity: Math.abs(peak.offset_ms) > 2 ? 'warn' : 'info',
      event: event.name,
      message: 'Hit offset exceeds 1 ms',
      offset_ms: peak.offset_ms,
    });
  }
  if (signals.weightedBed) {
    result.db_over_bed = db(windowRms(signals.weightedMix, sampleRate, target))
      - db(windowRms(signals.weightedBed, sampleRate, target));
    if (!Number.isFinite(result.db_over_bed) || result.db_over_bed < 3 || result.db_over_bed > 6) {
      findings.push({
        severity: 'warn',
        event: event.name,
        message: 'Hit level is outside 3–6 dB over bed',
        db_over_bed: result.db_over_bed,
      });
    }
  }
  return result;
}
