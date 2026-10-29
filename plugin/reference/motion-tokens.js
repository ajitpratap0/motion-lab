// motion-tokens.js: one tokens file, imported (or inlined) everywhere; no inline motion numbers in scenes.
// Every function is a pure function of time so any frame renders on its own.

export const EASE = {
  enter: [0.16, 1, 0.3, 1],     // ease-out-expo
  premium: [0.22, 1, 0.36, 1],  // ease-out-quint
  move: [0.76, 0, 0.24, 1],     // ease-in-out-quart
  orbit: [0.37, 0, 0.63, 1],    // ease-in-out-sine
  exit: [0.7, 0, 0.84, 0],      // ease-in-expo
  fall: [0.32, 0, 0.67, 0],     // ease-in-cubic
  pop: [0.34, 1.56, 0.64, 1],   // ease-out-back
};
export const css = (b) => `cubic-bezier(${b.join(', ')})`;

export const MS = { feedback: 150, move: 400, hero: 750, exit: 240 };
export const STAGGER = { letter: 30, word: 90, item: 60 };

// Cubic-bezier evaluation (x -> y) by Newton-Raphson with bisection fallback.
export function bezier([x1, y1, x2, y2]) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t) => ((ax * t + bx) * t + cx) * t;
  const sy = (t) => ((ay * t + by) * t + cy) * t;
  const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const e = sx(t) - x, d = dx(t);
      if (Math.abs(e) < 1e-6) return sy(t);
      if (Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    let lo = 0, hi = 1; t = x;
    while (hi - lo > 1e-6) { if (sx(t) < x) lo = t; else hi = t; t = (lo + hi) / 2; }
    return sy(t);
  };
}

// Progress of a segment: 0 before start, 1 after end, eased in between.
export const seg = (t, start, dur, ease = EASE.move) =>
  bezier(ease)(Math.min(1, Math.max(0, (t - start) / dur)));

// Damping ratio from any library's spring numbers: 1 = no bounce.
export const dampingRatio = (k, c, m = 1) => c / (2 * Math.sqrt(k * m));

// Analytic spring from 0 to 1. zeta: damping ratio. f: natural frequency in Hz.
export function spring(t, zeta = 0.7, f = 2) {
  if (t <= 0) return 0;
  const w = 2 * Math.PI * f;
  if (zeta === 1) return 1 - Math.exp(-w * t) * (1 + w * t);
  if (zeta > 1) {
    const root = Math.sqrt(zeta * zeta - 1);
    const r1 = -w * (zeta - root), r2 = -w * (zeta + root);
    return 1 - (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r2 - r1);
  }
  const wd = w * Math.sqrt(1 - zeta * zeta);
  return 1 - Math.exp(-zeta * w * t) * (Math.cos(wd * t) + ((zeta * w) / wd) * Math.sin(wd * t));
}

// Beat grid: frame of beat n, rounded per beat (never accumulated).
export const beatFrame = (n, bpm, fps) => Math.round((n * 60 * fps) / bpm);

// Text hold: 0.3 s per word + 0.5 s.
export const holdSecs = (words) => 0.3 * words + 0.5;

// Seeded PRNG for decoration that must not jitter between frames.
export function mulberry32(seed) {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Loop helpers: phase in [0,1) and loop-safe periodic drift (whole cycles only).
export const phase = (t, secs) => (((t % secs) + secs) % secs) / secs;
export const loopSine = (t, secs, cycles = 1) => Math.sin(2 * Math.PI * cycles * phase(t, secs));

// Loop-safe 1D noise: sample a smooth 2D field along a circle so it returns to its start.
export function loopNoise(t, secs, seed = 1, radius = 1) {
  const a = 2 * Math.PI * phase(t, secs);
  return valueNoise2(Math.cos(a) * radius + seed * 17.13, Math.sin(a) * radius - seed * 9.71);
}
function hash2(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function valueNoise2(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
  return (a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v) * 2 - 1;
}
