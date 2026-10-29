---
name: motion-export
description: Export a finished animation for X and the web - full frame render (motion blur for 3D), H.264 MP4 with optional loudness-normalized audio, single-palette GIF with exact centisecond delays, loop-seam check and X limits validation. Use when the user wants to post, share, download or deliver the animation.
---

# Export

`LAB` = two directories above this skill's base directory. Limits and rationale: `$LAB/reference/export-x.md`.
`LAB` is an absolute path, not a shell variable: start each Bash call with `LAB=<path>;` and write the path
itself into agent prompts.

1. Final frames: `render.mjs anim.html --secs <s> --fps <fps> --width <w> --height <h>` (3D: add
   `--subframes <n> --shutter 0.5 --gpu` at the brief's fps; 60 fps only if the brief asks for it). Pick `n` from
   the fastest rotation: ghost spacing = degrees per frame x shutter / n; keep it at or under 1.5 deg, so
   `n = max(4, ceil(deg_per_frame x shutter / 1.5))` (32 deg/frame at 0.5 shutter needs 11; use 12). For fast
   translation use pixels per frame with a 2 px limit. Zoom on the fastest frame to confirm no stepped copies.
   Remove dev aids first (`inject.mjs --remove`, no `?debug`).
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
