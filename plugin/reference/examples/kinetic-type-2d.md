# Example: 2D kinetic type loop (plain HTML)

```
GOAL: a two-word studio name lands with weight, holds long enough to read, and folds back into a single bar, so the
viewer remembers the name.
OUTPUT: one self-contained HTML file, no libraries, Inter Tight 800 from Google Fonts (display=block), 1080x1080.
TIME: 4 s loop, 24 fps = 96 frames. 120 BPM (1 beat = 12 frames); hits on frames 12, 24, 48, 84.
LOOK: background F5F2EC flat; ink 141414; one accent E4572E used only on the bar. Inter Tight 800, 168 px,
tracking -0.04 em, words left-aligned at x 120, baselines 470 and 650.
MOTION: enters ease-out-expo, exits ease-in-expo at 50% of the entry length, bar width on a spring ζ 0.75 at 3 Hz;
letters staggered 1 frame; no overshoot on text; opacity never bounces.
SHOTS:
 0-11: the accent bar (24 px tall) holds at x 120, width 0, then grows to 840 px by frame 11 (ease-out-expo, 11 f).
 12: hit. The bar snaps down 180 px in 4 frames (ease-in-out-quart) and becomes the first word's underline.
 12-23: word 1 letters rise 40 px from behind the bar mask, 1 frame apart, 8 frames each (ease-out-expo).
 24: hit. Word 2 letters rise the same way; the bar stays still (one hero).
 32-71: hold 40 frames (1.67 s >= 0.3 s x 2 words + 0.5 s), whole frame pushes 2% (scale 1.00 -> 1.02, linear on
 the hold only).
 72-83: letters drop back behind the mask in reverse order, 4 frames each (ease-in-expo).
 84: hit. The bar springs back to width 0 from the right, ζ 0.75, landing on frame 95 so frame 95 flows into frame 0.
KEEP: the word baselines and left edge never move; the bar is the only colored element.
BANNED: gradients, glow, drop shadows, particles, fade-and-slide-up, centered layout, text moving while held,
everything appearing at once, made-up copy.
QA: stills at 0, 11, 12, 24, 48, 72, 84, 95; contact sheet every 8th frame; audit each hit frame and the hold; loop seam.
```
