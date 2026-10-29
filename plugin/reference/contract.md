# The render contract

Paste under every motion prompt. Each line closes one way a frame-exact render goes wrong. The `contract-lint`
script and the PostToolUse hook enforce it.

```
RENDER CONTRACT
- One self-contained file. Only the libraries named in the prompt, pinned to an exact version.
- No network requests except fonts and those pinned libraries.
- Every frame is a pure function of time t in seconds.
- If JavaScript drives any motion, expose window.renderAt(t) that draws exactly that frame (may return a Promise).
- Animate with CSS keyframes, the Web Animations API, SVG, Canvas 2D or WebGL. No CSS transitions.
- No Date.now, performance.now, new Date, setTimeout or setInterval for motion; no unseeded Math.random.
- With ?t= in the URL, never start requestAnimationFrame; draw renderAt(t) once and stop.
- Set window.__ready = true (or a Promise) once fonts, textures and bakes are done.
- Loops: frames 0..N-1 only; frame N-1 must flow into frame 0; all periodic motion completes whole cycles in the loop.
- Expose window.__probe(t) returning named numbers for every hero value and every audited event.
- Expose window.__events = [{frame, name}] for every visual hit the sound should land on.
- If scored: window.renderAudio({sampleRate, secs}) renders the score with an OfflineAudioContext and returns channel data.
```

## Why each line exists
- **Clock or timer** → frame 84 differs on every run; the review loop can't converge.
- **Unseeded random** → shapes jitter between frames. Use a seeded PRNG (mulberry32) keyed by frame index or a
  fixed seed + t-periodic noise.
- **Rendering frame N of a loop** → frame 0 shows twice: the hiccup at the seam.
- **CSS transitions** → they run on wall-clock time and ignore `currentTime`.
- **Unpinned CDN** → API traps change under you (three.js TextGeometry `height` vs `depth` in r160).
- **No __ready** → the first frames capture fallback fonts or unbaked textures.

## Minimal skeleton (plain HTML / canvas)

```html
<script type="module">
  const FPS = 24, SECS = 6, N = FPS * SECS;
  function mulberry32(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  const state = {};                       // values for __probe
  window.renderAt = (t) => {
    const phase = (t % SECS) / SECS;      // loops drive everything from phase
    // ... compute every value from t, write into state, draw ...
  };
  window.__probe = (t) => { window.renderAt(t); return { ...state }; };
  window.__events = [ /* {frame: 60, name: 'lid-snap'} */ ];
  const frozen = new URLSearchParams(location.search).has('t');
  await document.fonts.ready;
  window.__ready = true;
  if (!frozen) { const t0 = performance.now(); const loop = (now) => { window.renderAt(((now - t0) / 1000) % SECS); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
</script>
```

The live preview loop may use `performance.now()` and `requestAnimationFrame` **only** to feed `renderAt`. The linter
allows those two only in files that read `t` from `location.search` (the frozen guard above); without the guard they
are errors. `Date.now`, `new Date`, timers and `Math.random` are errors everywhere. Rendering never uses the live loop.
This skeleton is a lint fixture (`examples/skeleton.html`) and must stay lint-clean.
