---
name: motion-fix
description: Diagnose and fix common code-drawn animation failures - flicker/jitter, wrong fonts, loop-seam hiccups, beat drift, dropped frames, GIF banding or speed, blurry text, popping values, elements leaving the frame, late sound hits, seam clicks. Use when a render shows a defect or a fix didn't hold.
---

# Fix a broken experiment

`LAB` = two directories above this skill's base directory. Symptom table: `$LAB/reference/fixes.md`.
`LAB` is an absolute path, not a shell variable: start each Bash call with `LAB=<path>;` and write the path
itself into agent prompts.

1. Reproduce at the exact frame: `render.mjs anim.html --frames <N-1>,<N>,<N+1>`.
2. Lint first; most flicker is a contract violation: `contract-lint.mjs anim.html`.
3. Measure: `diff-frames.mjs` between neighbors (changed pixel count + bounding box), `probe.mjs` for the value that
   pops, `audit.mjs` with a `deterministic` check on the frame for nondeterminism.
4. Match the symptom in fixes.md; change one thing; re-render the same frames; diff again.
5. When the fix holds, add a line to `motion-lab.json.contract_extra` so it never recurs, and log it under
   `## Technical fixes` (if technical) or as a creative follow-up (if it changed the look or motion).
