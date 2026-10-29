# Directed motion prompt: the template

Every line removes one decision the model would otherwise make for you. The model's own decisions are the
default look. Fill every line before building; a blank line is a decision handed back.

```
GOAL:    what the viewer should feel or do, in one sentence
OUTPUT:  engine + file (one self-contained HTML | Remotion composition | HyperFrames), W x H, pinned versions
TIME:    seconds x fps = total frames. Loop: yes/no. BPM if scored (1 beat = fps*60/BPM frames)
LOOK:    palette in hex, one accent and where it may appear, typeface + weight + size + tracking
MODEL:   (3D) units, primitive dimensions, materials as roughness/metalness/clearcoat numbers
LIGHT:   (3D) key / fill / rim: color hex, intensity, position; environment; shadows
CAMERA:  fov, distance, orbit range with easing, push-ins with time + easing. Never parked unless stated.
MOTION:  easing as named cubic-bezier, springs as damping ratio (+ Hz), durations in frames
SHOTS:   frame or time ranges; one hero move per shot; how each shot hands off (cut | match cut | mask wipe)
KEEP:    what may never change (character proportions, logo geometry, brand colors)
BANNED:  the defaults you never want to see, by name (start from banned.md, extend after every render)
QA:      stills at named frames, contact sheet, audits, then the full render
```

Order of writing: GOAL first (if you cannot say it in one sentence, no curve rescues the piece), then TIME (every
other number hangs off the frame count), then SHOTS, then the rest.

## Adjective → number translations

| Vague word | Directed replacement |
|---|---|
| premium | named materials with roughness/clearcoat; ease-out-quint entrances; springs at ζ 0.75-0.85; no overshoot on text |
| cool / slick | a lit studio: key/fill/rim with hex + intensity, reflections, soft contact shadows; **no glow** |
| modern | a camera with numbers: fov 30-40, orbit range, one push-in on ease-out-expo at a named time |
| animated / dynamic | a beat grid (BPM), anticipation frames, spring damping per part, follow-through on a looser spring |
| pop | scale 1.0 → 1.08 → 1.0 over 6 frames, peak on the beat |
| smooth | ease-in-out-quart on moves, ease-out on enters, exits 40-50% shorter on ease-in |
| playful | springs ζ 0.4-0.6, squash/stretch 10-25%, 2-4 frame anticipation |

## SHOTS line rules
- Each shot: range, hero, handoff. Default handoff is the cut, on the beat. A transition must be a decision.
- Secondary moves: 50-70% of the hero's travel, start 100-200 ms after it.
- Ambient motion: < 5% of hero travel, slow sine, whole cycles per loop, never stops.
- Everything that is not the hero waits, dims to 40%, or holds still.
- Cut on the beat, change layout on the bar (every 4 beats).

## OUTPUT line examples
- `one self-contained HTML file, three.js 0.160.0 via jsDelivr importmap, 1080x1080`
- `a Remotion composition, 1920x1080, 30 fps, 450 frames, id LaunchLoop`
- `a HyperFrames project, HTML + GSAP 3.12.5 timeline, 1080x1920`

Append the render contract (contract.md) under every prompt.
