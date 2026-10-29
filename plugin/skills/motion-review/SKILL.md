---
name: motion-review
description: Run the render-look-fix loop on a code-drawn animation - build a review pack, get frame-anchored notes from the motion-reviewer agent, apply one or two per round, log follow-ups in RECEIPTS.md. Use after a first build, when the user says it looks off, generic, busy, floaty or "like AI", or asks to polish.
---

# Review loop

`LAB` = two directories above this skill's base directory. Notes reference: `$LAB/reference/followups.md`;
fixes: `$LAB/reference/fixes.md`.

## Each round
1. `node "$LAB/scripts/lab.mjs" anim.html --stills <hit frames> --every 12` → `out/review/<ts>/pack.json`.
2. Spawn the **motion-reviewer** agent (plugin agent `motion-lab:motion-reviewer`) with: the plugin root path (`LAB`), the pack path, `PROMPT.md`
   path, the round number, and any user note. It returns ≤ 5 notes as JSON:
   `{frame, observation, measurement, change, priority}`.
3. Translate any user feeling into numbers first (followups.md table) and merge with the reviewer's notes.
4. Apply the top 1-2 notes only. Prefer the one with a measurement.
5. Re-render only the affected frames (`render.mjs --frames` / `--range`) and verify each note visually or with
   `diff-frames`/`probe`.
6. Append the notes, verbatim as applied, under `## Creative follow-ups` in `RECEIPTS.md` as
   `### Round <n> (after <what was measured>)` + numbered list.
7. Add any default the reviewer spotted to `motion-lab.json.banned`.

Stop when the reviewer returns no priority-1 or -2 notes, after 4 rounds, or when the user is happy. Then run
`motion-audit`.

## If a fix doesn't hold
Render frames N-1 and N+1, `diff-frames` them, list every difference, find the one line, fix only that line.
