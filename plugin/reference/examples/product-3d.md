# Example: 3D product loop (three.js)

The numbers show the level of direction a prompt needs. The palette, type and layout belong to this example only;
derive your own from each brief.

```
GOAL: a studio film for a matte ceramic travel mug: the lid twists open, steam curls out once, the lid seats back
with a satisfying click, so the viewer feels the build quality.
OUTPUT: one self-contained HTML file, three.js 0.160.0 via jsDelivr importmap, 1080x1350.
TIME: 5 s loop, 60 fps = 300 frames, 96 BPM (1 beat = 37.5 frames; beats at round(n x 37.5)).
MODEL (1 unit = 1 cm): body lathe profile, 8.4 tall, 7.2 top diameter tapering to 6.6, 0.35 lip radius; lid 7.4
diameter, 1.6 tall, 0.08 chamfer; silicone ring 0.25 thick between them.
LOOK: body glaze 2F3A33 (roughness 0.62, clearcoat 0.15), lid brushed steel (metalness 1, roughness 0.28, anisotropy 0.6),
ring E9E2D6 (roughness 0.8). Backdrop EDE8E0 to D9D2C6 corners, dithered. Neutral tone mapping, 6% vignette,
1.5% grain seeded per frame.
LIGHT: key FFF1E0 2.8 at (-6, 9, 7), soft shadows radius 4; fill E6EEF6 0.5 at (6, 2, 5); rim FFFFFF 3.5 at (3, 7, -9).
PMREM studio built in code: warm gray dome 0.3, one overhead softbox 2.0, one strip 1.2 wide at 120° azimuth for the
steel highlight. Contact shadow opacity 0.5.
CAMERA: fov 32, elevation 14°, distance 34 creeping to 33.4 over the loop; azimuth 20° -> 8° (0-2.4 s, ease-in-out-sine)
and back (2.4-5 s). One push to 30 at 1.2 s (ease-out-expo, 0.7 s), back to 33.6 by 4.4 s (ease-in-out-cubic).
SHOTS:
 0-0.6 s: hold; a strip glint crosses the lid left to right (reflection only), finished composition on frame 0.
 0.62-0.76 s: anticipation: lid counter-twists 4° (ease-in-out-quart), holds 3 frames.
 0.78 s: lid twists 70° open on a spring ζ 0.7 at 2.2 Hz while lifting 1.1; ring stays seated.
 1.2 s: push-in. Steam: one curl of 3 ribbons rising 6 units over 1.2 s, seeded noise, periodic, opacity 0 -> 0.35 -> 0.
 2.8 s: lid descends (ease-in-cubic, 0.45 s) and twists back.
 3.25 s: seats on frame 195 with a 0.03 dip and a 1.5° rebound (ζ 0.45); body recoils 1%.
 3.3-5 s: settle and hold; azimuth returns; frame 299 flows into frame 0.
KEEP: mug proportions above; the glaze color never shifts hue.
BANNED: turntable spin, bloom, glow, neon, particles, dark backgrounds, lens flares, text, purple or blue gradients.
QA: renderAt(t) only, seeded noise; stills at 0, 37, 47, 72, 168, 195, 299; contact sheet every 25th frame; audit lid
angle at 47 and 195, seat contact at 195, steam opacity 0 at 0 and 299; loop seam; deterministic frame 120.
```
