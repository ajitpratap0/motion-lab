# Animation principles as numbers

Thomas & Johnston's principles of animation (The Illusion of Life, 1981). Five do most of the work in a short
loop, and every one can be written as frames and sizes.

| Principle | What it does | Write it in the prompt as |
|---|---|---|
| Anticipation | winds up before the move | `8-12 frame crouch, scale 1.2 x 0.75` / `lid presses 1.5° shut, holds 3 frames` |
| Squash and stretch | weight and speed | `stretch 0.85 x 1.28 at takeoff, squash 1.25 x 0.7 on landing` (keep volume ≈ constant: sx·sy ≈ 1) |
| Overlapping action | parts start later than the body | `arms lag 4 frames, legs 6` |
| Follow-through | parts keep moving after the body stops | `arms settle on a spring at 2.2 Hz, ζ 0.22` |
| Arcs | natural paths | `flip along a dotted arc 3.5 high`; never straight-line a jump |
| Slow in / slow out | accelerate and settle | `spring back at ζ 0.55` / ease-in-out on travel |
| Timing | frame count sets weight | `25 frames of air per hop`, heavier = more frames |
| Staging | one hero per shot | the SHOTS rule: everything else waits, dims, or holds |
| Exaggeration | reads at phone size | push key poses 10-30% further |

## Make principles testable
Pin each principle to a frame ("anticipation peaks on frame 69", "landing touches the pad on frame 105") and expose
the values through `__probe`. The audit then proves it instead of a reviewer guessing it. Optional on-screen labels
that light on their frame make timing errors visible: a label that lights before its move means the move runs late.

## Keep lines (guardrails)
Every recognizable character or logo needs a KEEP line with exact proportions (e.g. "body 14x10 voxels, arms 3x2,
eyes 2x3, 0.1 voxel size"). Without it, 3D reinterpretations drift off-model.
