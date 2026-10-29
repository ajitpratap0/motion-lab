---
name: motion-export
description: Export a finished animation for X and the web - full frame render (motion blur for 3D), H.264 MP4 with optional loudness-normalized audio, single-palette GIF with exact centisecond delays, loop-seam check and X limits validation. Use when the user wants to post, share, download or deliver the animation.
---

# Export

`LAB` = two directories above this skill's base directory. Limits and rationale: `$LAB/reference/export-x.md`.

1. Final frames: `render.mjs anim.html --secs <s> --fps <fps> --width <w> --height <h>` (3D: add
   `--fps 60 --subframes 4 --shutter 0.5 --gpu`). Remove dev aids first (`inject.mjs --remove`, no `?debug`).
2. MP4 for posts: `export.mjs mp4 --fps <fps> --out out/anim.mp4 [--audio out/score.wav --loudnorm]`.
3. GIF for X Articles / inline loops (≤ 350 frames, ≤ 1280 wide, ≤ 15 MB):
   `export.mjs gif --fps 24 --width 1200 --out out/anim.gif`. For 60 fps sources, render a 24 fps pass for the GIF.
4. Validate: `export.mjs xcheck out/anim.mp4` and `export.mjs xcheck out/anim.gif` (non-zero exit = violation;
   fix by lowering width/fps/duration, not by recompressing blindly).
5. Loops: `export.mjs loopcheck out/anim.mp4` writes `out/loop_check.mp4` (3 plays back to back) to watch. Prove the
   seam with `diff-frames.mjs out/frames/<N-1>.png out/frames/0000.png`: the change across the seam should match a
   neighbouring pair such as `<N-2>.png` vs `<N-1>.png` (a much larger or zero diff in a moving piece is a hitch).
6. Check frame 0 is a finished composition (it is the thumbnail and the GIF's loading frame).
7. Report the file paths, sizes, durations and xcheck tables. Then offer `motion-receipts`.
