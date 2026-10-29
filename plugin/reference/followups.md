# Follow-ups that work

The first render is a draft. The loop: render stills → look → notes with frame numbers → fix → re-render only what
changed. Two to four rounds is normal. Pick one or two notes per round; pasting all of them turns a fix into a rewrite.

## Review prompts (point at frames, not feelings)
1. Render stills at frames 0, 24, 48, 72 and 96. Describe each in one sentence as a viewer would. Does that match the
   shot list? Fix what does not.
2. Make a contact sheet of every 12th frame. Mark every frame where two things move at once, then fix the hierarchy.
3. Onion-skin frames 24-47 at 25% opacity. Spacing should tighten near the keys. Adjust the easing until it does.
4. Plot the hero's x position and scale per frame. Show where motion is linear or stops dead, then fix it with the tokens.
5. Review like a senior motion designer: 10 notes ordered by impact, each with a frame number and the exact code change.
   Apply the top 5.
6. It is too busy. Remove 30% of the motion and keep only the moves that guide the eye.
7. The ending is abrupt. Add a 36-frame hold with a 2% push, then settle on a spring at ζ 0.8.
8. The fix at frame N did not hold. Render frames N-1 and N+1, diff them, list every difference, find the one line that
   causes it, fix only that line, re-render both.

## Measure, then note
The strongest follow-ups quote a measurement: "strip on vs off changes 178,864 pixels, so the glint is a flood light";
"the anticipation holds 4 frames (57-60), not 3"; "outer droplets leave the frame by 8 px around frame 112". Use
`diff-frames`, `probe`, `speed-graph` and `audit` to get those numbers before writing the note.

## Translating feelings
| Note as received | Note as sent |
|---|---|
| make it pop | scale 1.0 → 1.08 → 1.0 over 6 frames, peak on the beat |
| make it feel premium | ease-out-quint entrances, springs ζ 0.8, no overshoot on text |
| it drags | shorten each hold by one beat (12 frames at 120 BPM / 24 fps) so cuts stay on the grid |
| it feels busy | one hero at a time; everything else starts 150 ms later at 60% travel |
| it looks like AI | list the defaults it used by name, ban each, render again |
| it feels cheap | real lighting numbers + one material change; remove glow; add contact shadows |
| it's floaty | fewer frames of air, faster ease-in on falls, squash on contact |

## Counting
A creative follow-up changes how the piece looks or moves. Technical fixes (capture hooks, font loading) are logged
separately and don't count. Pros count prompts; 2-4 rounds and 3-15 creative follow-ups is honest and normal.
