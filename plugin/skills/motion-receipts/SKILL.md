---
name: motion-receipts
description: Turn a Motion Lab project's RECEIPTS.md into an honest post - caption, then the exact prompt and every follow-up as a reply thread, with prompt word counts, follow-up counts, time spent and audit results. Use when the user is ready to post or share how an animation was made.
---

# Receipts

`LAB` = two directories above this skill's base directory.
`LAB` is an absolute path, not a shell variable: start each Bash call with `LAB=<path>;` and write the path
itself into agent prompts.

1. Ensure RECEIPTS.md has: the user's brief verbatim (`## User brief`), the directed prompt (with word count),
   creative follow-ups by round, sound prompt and follow-ups,
   technical fixes (separate, not counted), audit result, and approximate time per phase if known.
2. Count words with the shell (`wc -w` on the brief and on the directed prompt block, without the render contract)
   and pass the counts to the agent; it has no shell.
3. Spawn the **motion-receipts** agent (`motion-lab:motion-receipts`, Haiku) with the RECEIPTS.md path and target
   platform (default X). It writes `out/post.md`: a caption ≤ 280 chars stating the honest counts ("1 brief, directed into a
   W-word prompt, + N follow-ups, M checks passing"), then reply posts with the brief and the directed prompt, each
   labelled with who wrote it, that each fit 280 chars or a single long post if the user has
   long posts, with the prompt and follow-ups verbatim.
4. Show the user `out/post.md`. Never post anything yourself.
