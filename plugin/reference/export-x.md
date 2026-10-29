# Export for X

| Spec | GIF | Video |
|---|---|---|
| size | ≤ 15 MB | ≤ 140 s (without Premium) |
| frame size | ≤ 1280 x 1080 | 1920 x 1080 for 16:9 (1080 x 1920 portrait) |
| frames / speed | ≤ 350 frames | ≤ 60 fps |
| format | one palette, loop forever | H.264 High, yuv420p, AAC audio, +faststart |
| lab default | 1200 px wide, 24 fps | CRF 18 |

- At 24 fps the 350-frame cap means a GIF tops out at ~14.5 s; a 4-6 s loop is 96-144 frames.
- MP4 for posts; GIF for X Articles and inline loops.
- GIF delays are stored in centiseconds: a 24 fps frame (41.7 ms) can't be stored exactly. Rounding all to 40 ms makes
  the loop 4% fast and drifts off the beat grid. `export.mjs gif` rewrites delays to the cumulative pattern
  (4,4,4,4,4,5…) so 6 s stays 6.00 s.
- One palette for the whole GIF keeps colors from flickering between frames.
- Make frame 0 a finished composition: it's on screen while the GIF loads, and it's the thumbnail.
- Loop check: `export.mjs loopcheck out/anim.mp4` plays it three times back to back; watch the seam.
- Validate: `export.mjs xcheck <file>` exits non-zero on any violated limit.

## Posting with receipts
Post the piece, then the exact prompt and every follow-up in the first reply (the `motion-receipts` agent formats
`RECEIPTS.md` into a thread). "One prompt" makes people suspicious; receipts convince them.
