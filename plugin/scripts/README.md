# motion-lab scripts

Run these tools from `plugin/` with Node >= 20. No runtime dependencies are added.
ffmpeg and ffprobe must be on PATH. Browser operations dynamically import the
Playwright peer dependency; all `--help` and static/media operations work without it.
Missing Playwright prints installation guidance and exits 2; tools never install it.
Browser commands prefer Playwright resolved from the current project directory
and its parents, then fall back to the plugin-local peer dependency.

## Project defaults

Defaults come from motion-lab.json when present. The tools search from the current
directory up to the filesystem root and use the nearest configuration. Malformed
JSON prints one warning and falls back to built-in values. For example:

```json
{"file":"anim.html","secs":8,"fps":60,"width":1920,"height":1080}
```

Render, probe, audit, lab, score, and inject use these scene defaults; the scene
positional is optional and falls back to `anim.html`. Explicit CLI flags win over
configuration. Audit spec values override project configuration and lose to CLI
flags. Export and audio-measure also use the configured FPS (their built-in
fallbacks remain 24 and 60 respectively). Relative paths remain relative to cwd.

## CLI reference

All paths are relative to the current directory. Every CLI accepts `--help` and
`--json`; JSON results go to stdout and progress/errors go to stderr. Ordinary
errors exit 1, missing Playwright exits 2, and failed lint/audit/X checks exit 3.

- `node scripts/render.mjs page.html` writes `0000.png` through frame `N-1`.
  Defaults: `--secs 6 --fps 24 --width 1080 --height 1080 --out out/frames`.
  Select stills with `--frames 0,24` or `--range 24-47`.
  Other options: `--subframes 1 --shutter 0.5 --scale 1 --gpu --video out/anim.mp4`.
- `node scripts/inject.mjs page.html` installs the inline query-time hook.
  `--remove` removes the marked hook.
- `node scripts/contact-sheet.mjs` tiles frames.
  Defaults: `--frames out/frames --every 12 --cols 4 --width 400 --out out/contact.png`.
  `--labels` burns frame numbers with drawtext, or uses Chromium captions if that
  filter is unavailable. If Playwright is also missing, it warns and writes an
  unlabeled sheet. Other browser errors remain errors.
- `node scripts/onion-skin.mjs --range 24-47` blends frames.
  Defaults: `--frames out/frames --opacity 0.25 --out out/onion.png`.
  Writes adjacent JSON metadata.
- `node scripts/probe.mjs page.html` samples numeric state.
  Defaults: `--secs 6 --fps 24 --width 1080 --height 1080 --out out/probe.json`.
- `node scripts/speed-graph.mjs --keys x,scale` charts values and per-frame deltas.
  Defaults: `--probe out/probe.json --out out/speed.svg`; `--png` adds a raster.
  Prints dead-stop and linear-run findings.
- `node scripts/diff-frames.mjs a.png b.png` writes A/B/amplified difference images
  and pixel statistics. Defaults: `--out out/diff.png --threshold 8`.
- `node scripts/audit.mjs page.html --spec audit.json` checks frame expressions,
  loop seams, and fresh-load determinism. Supports timing/viewport overrides and
  `--out out/audit.json`.
- `node scripts/contract-lint.mjs page.html` reports static contract findings with
  source line numbers.
- `node scripts/beats.mjs --bpm 120 --fps 24` computes exact beat frames and drift.
  Options: `--beats 32 --secs 6 --hold "two words" --words 2`.
- `node scripts/score.mjs page.html` keeps the final audio warm-up pass.
  Defaults: `--out out/score.wav --secs 6 --sample-rate 48000 --passes 2`.
  `--dc` subtracts channel means. `--bed-only` passes `bedOnly: true` to
  `renderAudio` so the page can return a bed stem for `audio-measure --bed`.
- `node scripts/audio-measure.mjs score.wav` measures LUFS, true peak, spectrum,
  hit offsets, and the seam. Options: `--events events.json` or
  `--from-page page.html`, `--fps 60 --bed bed.wav --video anim.mp4`.
- `node scripts/export.mjs mp4` writes H.264 High/yuv420p video.
  Defaults: `--frames out/frames --fps 24 --out out/anim.mp4`.
  Options: `--audio score.wav --loudnorm`.
- `node scripts/export.mjs gif` uses one palette and exact cumulative delays.
  Defaults: `--frames out/frames --fps 24 --out out/anim.gif`. Default width is
  `min(1200, source width)`; `--width` never upscales. Output is capped to the
  1280x1080 GIF box with preserved aspect ratio and even dimensions.
- `node scripts/export.mjs loopcheck anim.mp4` repeats a video.
  Defaults: `--times 3 --out out/loop_check.mp4`.
- `node scripts/export.mjs xcheck anim.mp4` checks X format, dimension, duration,
  rate, and audio limits. Prints a table or JSON.
- `node scripts/lab.mjs page.html` writes a timestamped review pack and manifest.
  Defaults: `--secs 6 --fps 24 --width 1080 --height 1080`,
  `--stills 0,24,48,72,96 --every 12`. Always requests contact-sheet labels.

## Render contract

Pages may expose `window.renderAt(t)` (sync or async), `window.__ready` (boolean
or Promise), `window.__probe(t)` (flat numeric object), `window.__events`
(`[{frame,name}]`), and `window.renderAudio({sampleRate,secs,bedOnly})` returning
`{sampleRate,channels}`. Fonts and readiness settle before rendering. Each freeze
awaits renderAt, pauses CSS/WAAPI animations at `t*1000`, then waits two animation
frames. Screenshot time uses seconds; output never includes endpoint frame N.

Motion blur samples the centered shutter interval, wrapping at loop duration.
ffmpeg decodes/encodes RGB and pure numerical code averages exact sRGB transfer
functions in linear light. Device scale affects screenshot dimensions. Video
export requires a complete contiguous frame sequence, not selected stills.
Frame discovery accepts one bare or prefixed zero-padded PNG sequence, such as
`0000.png` or `element-0000.png`, including nonzero starting indices. Directories
containing multiple sequence prefixes are rejected. Full renders remove only
stale four-digit PNGs beyond frame N-1 and write `frames.json` with count, FPS,
duration, and dimensions. MP4/GIF exports and contact sheets respect that count
and warn when extra contiguous frames are ignored. Selected still renders leave
existing frames and metadata intact.

`freeze-hook.js` is a plain browser script. Injection markers allow replacement
and removal without duplicating hooks. `?t=1.5&counter=1&fps=24` freezes at 1.5
seconds with a frame counter; space toggles CSS animation pause when not frozen.

Audio events target `(frame+1)/fps`. Spectral analysis uses Hann windows of 4096
samples with a 2048 hop, including separate channel energies. Offset warnings
start beyond 2 ms; 1–2 ms offsets are informational. Signed beat drift is rounded
interval accumulation minus independently rounded endpoint (negative is early).
With `--bed`, event peaks are measured from sample-aligned mix minus bed and have
`offset_basis: "hit"`. Without it, events have `offset_basis: "mix"` and a warning
that bed peaks may affect timing. `db_over_bed` uses K-weighted mix and bed RMS
over the first 60 ms, with `weighting: "K"`. The rate-dependent BS.1770 shelf and
high-pass filters are calibrated to unity gain at 997 Hz for RMS reporting; the
common gain calibration cancels in the mix-versus-bed ratio.

Static lint masks comments and literal text, preserving template interpolation
code and source line numbers. Live preview performance clocks and rAF require a
query-time guard that reads `location.search` for `t`; `renderAt` alone is not a
guard. Date, timers, and unseeded random calls remain errors. Script, stylesheet,
module, dynamic import, and import-map URLs on every host require exact versions
in their paths; query-string versions do not qualify. Google Fonts are exempt.

## Verification

`npm test` runs `node --test "test/*.test.mjs"` for pure unit, real ffmpeg, and
browser integration tests. Node expands the quoted glob on supported versions,
including Windows cmd. Browser tests explicitly skip if Playwright is absent;
an installed browser that fails to launch remains a failure.

One test runs every CLI with `--help`. Lint hello-loop and skeleton: both must
exit 0; bad-contract must exit 3. The skeleton fixture preserves the reference
contract's minimal code block. Examples require no external assets or requests.
The hello-loop audio honors `bedOnly` by keeping kicks and omitting event clicks.
