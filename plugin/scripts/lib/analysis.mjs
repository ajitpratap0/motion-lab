function nearConstant(deltas) {
  const mean = deltas.reduce((sum, value) => sum + value, 0) / deltas.length;
  if (Math.abs(mean) < 1e-12 || deltas.some(value => value * mean <= 0)) {
    return false;
  }
  const variance = deltas.reduce((sum, value) => sum + (value - mean) ** 2, 0)
    / deltas.length;
  return variance / (mean * mean) < 0.02;
}

function findDeadStops(delta, key) {
  const absolute = delta.slice(1).map(Math.abs).sort((first, second) => first - second);
  const percentile75 = absolute[Math.floor((absolute.length - 1) * 0.75)] ?? 0;
  const findings = [];

  for (let frame = 2; frame < delta.length; frame++) {
    const previous = Math.abs(delta[frame - 1]);
    const current = Math.abs(delta[frame]);
    if (previous > percentile75 && current < previous * 0.05) {
      findings.push({
        key,
        type: 'dead-stop',
        frame,
        delta: delta[frame],
        previousDelta: delta[frame - 1],
      });
    }
  }
  return findings;
}

function findLinearRuns(delta, key) {
  const findings = [];
  let start = 1;

  while (start < delta.length) {
    if (!nearConstant(delta.slice(start, start + 1))) {
      start++;
      continue;
    }

    let end = start + 1;
    while (end < delta.length && nearConstant(delta.slice(start, end + 1))) {
      end++;
    }
    if (end - start >= 6) {
      const sum = delta.slice(start, end).reduce((total, value) => total + value, 0);
      findings.push({
        key,
        type: 'linear-run',
        startFrame: start,
        endFrame: end - 1,
        frame: start,
        delta: sum / (end - start),
      });
    }
    start = end;
  }
  return findings;
}

/** Derive per-frame deltas and annotate dead stops and nearly constant runs. */
export function analyzeSeries(values, key) {
  if (!values.length || values.some(value => !Number.isFinite(value))) {
    throw new Error(`Probe key ${key} must contain finite numbers in every frame`);
  }
  const delta = values.map((value, frame) => frame ? value - values[frame - 1] : 0);
  const findings = [...findDeadStops(delta, key), ...findLinearRuns(delta, key)];
  return { values, delta, findings };
}
