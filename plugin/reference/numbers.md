# Motion numbers cheat sheet

Give the model curves and frames, not adjectives.

## Easing (cubic-bezier)

| Name | cubic-bezier | Use for |
|---|---|---|
| ease-out-expo | 0.16, 1, 0.3, 1 | text and logo reveals |
| ease-out-quint | 0.22, 1, 0.36, 1 | premium entrances |
| ease-out-cubic | 0.33, 1, 0.68, 1 | UI enters |
| ease-in-out-quart | 0.76, 0, 0.24, 1 | moves across screen, camera pushes |
| ease-in-out-sine | 0.37, 0, 0.63, 1 | camera orbits, ambient drift |
| ease-in-expo | 0.7, 0, 0.84, 0 | fast exits |
| ease-in-cubic | 0.32, 0, 0.67, 0 | falls, lids shutting |
| ease-out-back | 0.34, 1.56, 0.64, 1 | playful pop with overshoot |

Rules:
- Enter with ease-out; exit with ease-in, 40-50% shorter (400 ms in → 200-240 ms out).
- Move across the screen with ease-in-out.
- Linear only for rotation, progress bars and loop phase. Linear on a move is the fastest way to look rendered.
- Camera gets the softest curves (ease-in-out-quart/sine); objects get the snappier ones.

## Springs: the damping ratio translates between every library

ζ = c / (2·√(k·m))

| ζ | Feel |
|---|---|
| 1.0 | never bounces (critically damped) |
| 0.7-0.85 | premium |
| 0.4-0.6 | playful |
| < 0.3 | cartoon |

- Remotion default (mass 1, damping 10, stiffness 100) → ζ 0.5. react-spring default (tension 170, friction 26) → ζ ≈ 1.0.
- Position and size may bounce; opacity and color never do.
- Use the analytic spring in `motion-tokens.js`: progress at any t directly, so frame 84 renders without frames 0-83.

## Durations and stagger

| Thing | Duration |
|---|---|
| UI feedback | 100-200 ms (100 ms feels instant) |
| UI moves | 200-500 ms |
| hero reveals | 600-900 ms |
| letters | 1 frame apart (~30-40 ms) |
| words | 60-120 ms apart |
| list items | 40-80 ms apart |

Start the next element when the previous one is 30-50% done. Fully sequential looks robotic; all at once looks cheap.

In video, say it in frames: at 24 fps 1 frame ≈ 41.7 ms (400 ms = 10 frames, 750 ms = 18). At 30 fps: 33.3 ms. At 60 fps: 16.7 ms.

## Beat grid

frames per beat = fps × 60 / BPM. Compute every beat from time and round each one: `round(n·60/BPM·fps)`.
Never add a rounded frame count repeatedly (128 BPM @ 30 fps = 14.0625; adding 14 drifts 2 frames by beat 32).
`node scripts/beats.mjs --bpm 128 --fps 30 --beats 32` prints the grid and the drift.

| BPM | 24 fps | 30 fps | 60 fps |
|---|---|---|---|
| 120 | 12 | 15 | 30 |
| 128 | 11.25 | 14.0625 | 28.125 |
| 100 | 14.4 | 18 | 36 |
| 90 | 16 | 20 | 40 |

Cut on the beat; change layout on the bar.

## Holds
On-screen text holds ≥ 0.3 s per word + 0.5 s (two words = 1.1 s). During a hold, a slow 2% push keeps the frame alive.
Text never moves while being read.

## Camera
- FOV 30-50° for product and 3D scenes (30 for hero product, 18-24 for miniature/tilt-shift).
- Parallax speeds: foreground 1.0, mid 0.5, background 0.2.
- A camera that never parks: add a slow dolly creep (0.3-0.5 units) during holds.

## Exaggeration at phone size
Push key poses 10-30% further than feels right; the feed shrinks everything.

## Accessibility (WCAG)
- Text contrast ≥ 4.5:1 on every frame, including over moving backgrounds.
- Never flash more than 3 times per second.

## Canvas sizes
1920x1080 (16:9), 1080x1080 (1:1), 1080x1350 (4:5), 1080x1920 (9:16). X accepts 1:3 to 3:1. Pick before frame 0.
