# When an experiment breaks

| Symptom | Fix to apply / paste |
|---|---|
| flicker or jitter | make every value a pure function of t; replace Math.random with a seeded generator; remove timers and CSS transitions |
| wrong or fallback font | load with `display=block`; await `document.fonts.ready` before `__ready` |
| final render differs from reviewed frames | system fonts (Georgia, Helvetica) resolve differently in each renderer's Chromium: load a web font instead |
| hiccup at the loop seam | render frames 0..N-1 only; drive the loop from `phase = frame / N` with whole cycles |
| audio drifts off the beat | each beat = `round(n·60/BPM·fps)`; never add a rounded frame count |
| jank / dropped frames (live) | animate only transform and opacity; never width, height, top, left |
| banding in the GIF | no gradients, or dither the palette (bayer scale 5); flat colors preferred |
| blurry / shimmering text | snap resting text to whole pixels; render at `--scale 2` and downscale |
| text moves before you can read it | hold 0.3 s/word + 0.5 s before it moves |
| everything moves at once | one hero move at a time; others start 150 ms later at 60% travel |
| white material reads plastic / gray | darken the environment, push softboxes, so curved faces show dark and bright bands |
| a glint floods the face | keep the glint strip in reflections only (separate specular environment), narrow it |
| a value pops on one frame | diff frames N-1/N/N+1; a smooth-min or spring is starting from a nonzero state; fade its influence in |
| an element leaves the frame | probe its screen bounds per frame; reduce travel or dolly out over that range |
| a hold has one extra frame | the spring starts at rest exactly on the beat frame; release half a frame early |
| 3D text 50 units deep (three.js r160) | `TextGeometry` reads `height` for extrusion depth, not `depth` |
| GIF loop runs 4% fast | GIF delays are centiseconds; `export gif` writes the 4,4,4,4,4,5… pattern so 6 s stays 6.00 s |
| sound hits late by 2-10 ms | start tones in cosine phase with a 0.5-1 ms attack so the first peak sits on frame + 1; no waveshaper on hits |
| MP4 audio has a click at the seam | codec padding (~16 ms); keep the WAV as master; 2 ms raised-cosine fade on first/last 96 samples for the single-loop MP4 |

If a fix doesn't hold: render the two frames on either side, diff them, describe the difference, fix one line.

When a fix works, add a line to the project's contract (`motion-lab.json` → `contract_extra`). The contract is the lab's
memory: every line is a failure you never have to see again.
