---
name: motion-render
description: Render a frame-exact animation to PNG frames, stills, contact sheets, onion skins, speed graphs, frame diffs and video using the Motion Lab scripts (Playwright freeze-per-frame, optional GPU and linear-light subframe motion blur). Use whenever you need to see or measure frames of a code-drawn animation.
---

# Render and inspect

`LAB` = two directories above this skill's base directory. Every script reads `file`, `secs`, `fps`, `width` and
`height` from the nearest `motion-lab.json` (walking up from the current directory); flags override it. Run from the
project folder and pass flags only to deviate (e.g. a 24 fps GIF pass of a 60 fps scene).
All tools: `node "$LAB/scripts/<tool>.mjs" --help`.

| Need | Command |
|---|---|
| review pack (lint + stills + contact sheet + probe + speed graphs) | `lab.mjs anim.html --stills 0,24,48,72,96 --every 12` |
| specific stills | `render.mjs anim.html --frames 0,60,84 --out out/stills` |
| a range | `render.mjs anim.html --range 24-47` |
| all frames | `render.mjs anim.html --secs 6 --fps 24 --width 1080 --height 1080` |
| final 3D frames with motion blur | `render.mjs anim.html --fps 60 --subframes 4 --shutter 0.5 --gpu` |
| crisp text | add `--scale 2`, downscale in export |
| contact sheet | `contact-sheet.mjs --every 12 --cols 4 --labels` |
| onion skin | `onion-skin.mjs --range 24-47 --opacity 0.25` |
| values per frame | `probe.mjs anim.html` → `out/probe.json` |
| speed graph | `speed-graph.mjs --keys x,scale --png` (flags linear runs and dead stops) |
| what changed between two frames | `diff-frames.mjs out/frames/0083.png out/frames/0085.png` |
| quick MP4 | `render.mjs ... --video out/anim.mp4` |
| live frame in a browser | `inject.mjs anim.html`, then open `anim.html?t=2.5` (`&counter=1&fps=24`) |

## Reading frames
After rendering, Read the PNGs (contact sheet first) and describe each frame in one sentence as a viewer would before
proposing any change. Compare against the shot list. Name frames, not feelings.

Frames are 0..N-1 (never N). Every PNG is the page frozen at `t = i / fps`, so output is exact on any machine speed.
