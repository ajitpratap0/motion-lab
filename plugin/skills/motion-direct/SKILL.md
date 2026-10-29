---
name: motion-direct
description: Turn a vague motion brief into a directed prompt - every adjective replaced by a number (easing, springs, frames, beats, lights, camera, materials), shots with one hero each, named ban list and QA line - written to PROMPT.md. Use when the user describes an animation they want, or says a result looks generic or "like AI".
---

# Direct the piece

`LAB` = two directories above this skill's base directory. Read `$LAB/reference/template.md`, `numbers.md`,
`banned.md`, and `principles.md` if characters move; read the chosen engine file in `reference/engines/`.
`LAB` is an absolute path, not a shell variable: start each Bash call with `LAB=<path>;` and write the path
itself into agent prompts.

## Steps
1. Extract from the brief and `motion-lab.json`: subject, platform/canvas, duration, loop, brand facts, copy.
   Ask the user (one short message, max 3 questions) only for what you cannot infer: GOAL in one sentence, exact
   on-screen copy, brand colors/fonts. Never invent taglines.
2. Fill **every** template line. Write the numbers:
   - TIME: `secs x fps = N frames`; BPM so beats land on whole or rounded frames (`node $LAB/scripts/beats.mjs`).
   - LOOK: hex palette, one accent and where it may appear, typeface/weight/size/tracking.
   - MOTION: named easings, springs as ζ (+ Hz), durations in frames.
   - SHOTS: frame ranges on the beat grid, one hero per shot, handoff per shot, holds ≥ 0.3 s/word + 0.5 s.
   - 3D: MODEL (units, dimensions, materials as numbers), LIGHT (key/fill/rim hex + intensity + position), CAMERA.
   - KEEP: proportions/geometry that must never change.
   - BANNED: `banned.md` + `motion-lab.json.banned`, extended with whatever the subject usually attracts
     (product → turntable, halo; tech → particles, neon; logo → glow).
   - QA: stills at the hit frames, contact sheet, audits; frame N-1 flows into frame 0 for loops.
3. Append the render contract (`reference/contract.md`) plus any `contract_extra` lines.
4. Write `PROMPT.md`, then copy the full prompt into `RECEIPTS.md` under `## Prompt` with its word count. Keep the
   user's original brief verbatim under `## User brief` (add it if missing).
5. Show the user the prompt (or a 6-line summary for long prompts) and the beat/shot table before building.

## Quality bar
A directed prompt for a 6 s 2D piece is typically 250-500 words; 3D prompts run 500-800 because MODEL, LIGHT and
CAMERA need their own numbers. Length is not the goal: cut any line that does not change a frame.
If a line still contains an adjective without a number,
replace it. Each line should remove one decision the model would otherwise make.

See `$LAB/reference/examples/` for complete directed prompts. They show the level of detail, not a house style:
derive palette, type and layout from this brief, and never copy an example's hex values or fonts.
