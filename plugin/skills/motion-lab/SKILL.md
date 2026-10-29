---
name: motion-lab
description: Make a directed, frame-exact motion piece end to end - brief to directed prompt, build as one HTML file (or Remotion/HyperFrames), render, review frame by frame, audit the numbers, score with code-synthesized sound, export for X with receipts. Use when the user asks for an animation, motion graphic, product loop, logo sting, launch video, showreel or "make Claude animate like a studio".
---

# Motion Lab

Code instead of pixels: every piece is a program that draws frames, so every frame is reproducible, every edit is a
number, and you can check your own work. Direction does the heavy lifting; the loop finishes it.

Paths: `LAB` = two directories above this skill's base directory (the plugin root).
Scripts: `node "$LAB/scripts/<tool>.mjs"`, run from the project folder; they take `file`/`secs`/`fps`/`width`/`height`
from `motion-lab.json`, and flags override. References: `$LAB/reference/`.

## Pipeline (run in order; each step is its own skill you can also call directly)

1. **Setup** (`motion-setup`) - check node/ffmpeg/playwright, create the project folder with `motion-lab.json`,
   `RECEIPTS.md`, `out/`. Skip if `motion-lab.json` exists.
2. **Direct** (`motion-direct`) - turn the brief into a filled template in `PROMPT.md`. Ask the user only for GOAL,
   canvas/platform and any copy/brand facts you cannot infer. Everything else gets numbers from the references.
3. **Build** (`motion-build`) - write the scene from `PROMPT.md` + render contract + engine adapter. Run
   `contract-lint` until it has zero errors.
4. **Render + review loop** (`motion-render`, `motion-review`) - `lab.mjs` makes a review pack; the `motion-reviewer`
   agent returns frame-anchored notes; apply 1-2 notes per round; 2-4 rounds. Log every creative follow-up.
5. **Audit** (`motion-audit`) - the `motion-auditor` agent turns every number in `PROMPT.md` into checks; `audit.mjs`
   runs them on the live scene. Fix until all pass.
6. **Score** (`motion-score`, optional) - Web Audio score from `__events`; measure with `audio-measure`; the
   `motion-mixer` agent writes sound follow-ups from measurements; iterate.
7. **Export** (`motion-export`) - full render (subframe motion blur for 3D), MP4/GIF, `xcheck`, `loopcheck`.
8. **Receipts** (`motion-receipts`) - the `motion-receipts` agent turns `RECEIPTS.md` into a post + reply thread.

Stop and show the user stills (contact sheet) after step 3 and after the last review round; they direct, you execute.

## Defaults
- Effort: medium. Raise only when a from-scratch piece misses twice.
- Engine choice (reference/engines/): one 2D idea < 10 s → plain HTML; 3D → three.js; series/template/data/long →
  Remotion; HTML+GSAP thinker wanting a CLI → HyperFrames; motion inside a live product → Motion/GSAP (no contract).
- Remotion and HyperFrames have official Claude Code plugins (`remotion@remotion`, `hyperframes@hyperframes`). When
  the engine is one of them, use that plugin's skills for engine APIs and project mechanics; if it isn't installed,
  give the user the install commands from the engine file. Motion Lab still owns direction, review, audit and sound.
- Picture first, muted. Sound last.
- Never claim "one prompt". Count prompts and follow-ups in `RECEIPTS.md`.

## Variants (only when the user asks for multiple directions or a "shootout")
Build N directions from the same GOAL with different LOOK/MOTION lines, each in `variants/<name>/`, render a contact
sheet per variant, and present them side by side. If the user explicitly asked for a workflow or multi-agent fan-out,
use the Workflow tool with one agent per variant (Sonnet builders, Opus picks); otherwise do them sequentially.

## Model routing
- You (orchestrator): directing, building, deciding which notes to apply.
- `motion-reviewer` (Sonnet): reads the review pack, returns ≤ 5 frame-anchored notes.
- `motion-auditor` (Sonnet): numbers in the prompt → `audit.json`.
- `motion-mixer` (Sonnet): audio measurements → sound follow-ups.
- `motion-receipts` (Haiku): `RECEIPTS.md` → post text.
