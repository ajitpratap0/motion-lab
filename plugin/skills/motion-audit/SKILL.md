---
name: motion-audit
description: Prove a code-drawn animation matches its prompt - turn every number in PROMPT.md (hit frames, landings, label timings, bounds, loop seam, determinism) into machine checks and run them on the live scene with audit.mjs. Use after the review loop, before export, or when the user asks whether the animation really does what the prompt says.
---

# Numeric audit

`LAB` = two directories above this skill's base directory.

1. Make sure `window.__probe(t)` exposes the values the checks need (hero positions, screen bounds, flags per
   labeled event, lid angles, opacities). Add probes rather than weakening checks.
2. Spawn the **motion-auditor** agent (`motion-lab:motion-auditor`) with the plugin root path (`LAB`), `PROMPT.md`, the scene file and a sample
   `out/probe.json` (`node "$LAB/scripts/probe.mjs" anim.html`). It writes `audit.json`:
   - one check per stated number (frame of each hit, each landing touching its target, each label lighting on its
     frame and dark the frame before, holds lasting their frames, nothing leaving the frame over each range);
   - `{"type":"loop"}` for loops, `{"type":"deterministic","frame":<busy frame>}` always.
3. Run: `node "$LAB/scripts/audit.mjs" anim.html --spec audit.json` (exit 0 = all pass, 3 = failures).
4. Fix the scene (not the spec) for each failure; re-run until all pass. A spec change is allowed only when the
   prompt itself changed; say so in RECEIPTS.md.
5. Record `Audit: <passed>/<total> checks` in RECEIPTS.md.
