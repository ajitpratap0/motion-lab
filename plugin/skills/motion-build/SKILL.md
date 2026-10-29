---
name: motion-build
description: Build the animation from PROMPT.md as one frame-exact file (plain HTML, three.js, Remotion or HyperFrames) that follows the render contract - renderAt(t), __ready, __probe, __events - and passes contract-lint. Use after motion-direct, or when the user hands you a directed prompt to build.
---

# Build the scene

`LAB` = two directories above this skill's base directory. Read `PROMPT.md`, `$LAB/reference/contract.md`, the
engine file in `$LAB/reference/engines/`, and use `$LAB/reference/motion-tokens.js` (inline it into the HTML, or
import it relatively) for every easing, spring, beat and hold - no inline motion numbers.
`LAB` is an absolute path, not a shell variable: start each Bash call with `LAB=<path>;` and write the path
itself into agent prompts.

## Rules
- One file (`motion-lab.json.file`, default `anim.html`), libraries pinned to exact versions, no other network.
- Every value is a pure function of t. Loops: everything from `phase(t, secs)` with whole cycles.
- Build a single **timeline table** at the top of the script (shot ranges, hit frames, durations) copied from the
  SHOTS line, and derive all motion from it. Audits and the score read the same table.
- `window.__probe(t)`: expose every hero value, screen-space bounds of anything that could leave the frame, and a
  0/1 flag per labeled event. `window.__events`: every visual hit `{frame, name}` (sound lands on frame + 1).
- `window.__ready`: true after fonts, textures, environment bakes.
- With `?t=` present: draw once and do not start requestAnimationFrame.
- Dev aids (frame counter, playhead, labels) behind `?debug=1` only.

## Verify before showing anything
```bash
node "$LAB/scripts/contract-lint.mjs" anim.html        # must exit 0
node "$LAB/scripts/render.mjs" anim.html --secs <s> --fps <fps> --width <w> --height <h> --frames 0,<hit1>,<hit2>,<N-1>
```
Open the stills (Read the PNGs) and compare each with the shot list before declaring the first build done.
If the prompt makes a value move at constant speed on purpose (a steady spin, a scroll), add its probe key to
`linear_ok` in `motion-lab.json` so the review pack does not flag it.

Log technical fixes (capture hooks, font loading) under `## Technical fixes` in `RECEIPTS.md`, not as follow-ups.
