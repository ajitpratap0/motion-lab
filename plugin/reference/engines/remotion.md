# Engine: Remotion

Use for series, templates, data-driven videos, anything > 15 s with many shots. Video as React components,
frame-exact by design (`useCurrentFrame()`).

License: free for individuals and companies of up to 3 people; larger companies need a company license. Say so to the
user before choosing it for company work.

## Official Claude Code plugin (verified)
Maintained by Remotion (https://remotion.dev/docs/ai/claude-code-plugin):
```
claude plugin marketplace add remotion-dev/claude-code-plugin
claude plugin install remotion@remotion      # restart Claude Code afterwards
```
It loads Remotion's Agent Skills automatically when creating or editing a Remotion video; the main skill is
`/remotion-best-practices`. Use it for Remotion APIs and project mechanics; Motion Lab supplies direction, numbers,
review, audit and sound.

## Project setup
```
npx create-video@latest     # pick a template
cd <project> && npm i
npm run dev                 # Remotion Studio
npx remotion render <CompId> out/video.mp4
```

Verified on remotion and @remotion/cli 4.0.536 with React 18.3.1: `render --sequence`, `still`, and the lab's
contact-sheet, onion-skin, diff-frames, export and xcheck on its output.

## OUTPUT line
`a Remotion composition, 1920x1080, 30 fps, 450 frames, id LaunchFilm`

## Mapping the lab onto Remotion
- The render contract is native: everything derives from `useCurrentFrame()` and `useVideoConfig()`. Ban
  `Date.now`, `Math.random` (use `random(seed)` from remotion), timers.
- Springs: `spring({ frame, fps, config: { mass, damping, stiffness } })`. Convert to damping ratio with
  `dampingRatio(stiffness, damping, mass)` from motion-tokens; state ζ in the prompt, derive config.
- Stills for review: `npx remotion still <CompId> out/f084.png --frame=84`.
- Frames for the lab tools: `npx remotion render <CompId> out/frames --sequence --image-format=png`
  (the lab tools detect any single zero-padded PNG sequence such as `element-0000.png`, so contact-sheet,
  onion-skin, export and diff-frames work on Remotion's output directly).
- Probes: put a pure `values(frame, fps)` function in a `.ts` file with no JSX, import it from the component, and
  audit it with a small Node script that imports the same file. Node 23.6+ runs `.ts` directly; Node 22.6+ needs
  `--experimental-strip-types`. `spring` from `remotion` works in plain Node.
- Remotion pads frame numbers to the digit count of the duration (`element-00.png` for 48 frames). The lab tools
  read this; there is no `frames.json`, so pass `--fps` to `export` if `motion-lab.json` doesn't set it.
- Sound: Remotion `<Audio>` with a WAV produced by the lab's `score.mjs` from a standalone audio HTML, or author it
  in Remotion; measure with `audio-measure.mjs` on the rendered MP4.
