# motion-lab

A Claude Code plugin for directed, frame-exact motion design. Claude writes code that draws the frames, so every
frame is reproducible, every edit is a number, and Claude can check its own work. Direction does the heavy lifting;
a render → look → fix loop finishes it.

Inspired by the "Opus 5.5 Motion Lab" write-up (@flxrnc, Sept 2026): directed prompts beat adjectives, a render
contract makes frames exact, follow-ups name frames, sound is scored from frame numbers and verified by measurement,
and honest receipts beat "one prompt".

## Install
```
claude plugin marketplace add ajitpratap0/motion-lab
claude plugin install motion-lab@motion-lab
```
Or inside a session: `/plugin marketplace add ajitpratap0/motion-lab`, then `/plugin install motion-lab@motion-lab`.

Per project: Node ≥ 20, ffmpeg/ffprobe on PATH, `npm i -D playwright && npx playwright install chromium`
(`/motion-lab:motion-setup` checks and scaffolds). Engine-specific skills pair well with it: the official
Remotion, HyperFrames, GSAP and Motion plugins.

## Status
v0.1.0. Tried end to end on a 2D kinetic-type loop and a three.js product loop (render, review, audit, export,
receipts). Sound scoring and the Remotion, HyperFrames and Motion paths are covered by tests and fixtures but have
not yet had a full project run; reports welcome.

## Skills
| Skill | Does |
|---|---|
| `motion-lab` | end-to-end pipeline; routes to the skills below |
| `motion-setup` | dependency check, `motion-lab.json`, `RECEIPTS.md`, `out/` |
| `motion-direct` | brief → directed prompt (template, numbers, ban list, QA) in `PROMPT.md` |
| `motion-build` | builds the scene under the render contract; lint-clean |
| `motion-render` | frames, stills, contact sheet, onion skin, probes, speed graph, frame diffs, motion blur |
| `motion-review` | review-pack → `motion-reviewer` notes → apply 1-2 per round, logged |
| `motion-audit` | prompt numbers → `audit.json` → checks on the live scene |
| `motion-score` | Web Audio score from `__events`, measured (offsets, dB over bed, LUFS, bands, seam) |
| `motion-export` | MP4 / exact-delay GIF / loop check / X limits |
| `motion-fix` | symptom → measured fix |
| `motion-receipts` | `RECEIPTS.md` → post + reply thread |

## Agents
`motion-reviewer` (Sonnet), `motion-auditor` (Sonnet), `motion-mixer` (Sonnet), `motion-receipts` (Haiku).
The orchestrating session (Opus) directs, builds, and decides which notes to apply.

## Hooks
- `UserPromptSubmit`: appends raw prompts to `RECEIPTS.md` (only inside folders with `motion-lab.json`, `receipts: true`).
- `PostToolUse` (Write/Edit): lints edited `.html` scenes against the render contract; errors are fed back to Claude.

## Scripts (`plugin/scripts/`, zero runtime deps; Playwright peer)
`render` `inject` (freeze hook) `contact-sheet` `onion-skin` `probe` `speed-graph` `diff-frames` `audit`
`contract-lint` `beats` `score` `audio-measure` `export` (mp4 | gif | loopcheck | xcheck) `lab` (review pack).
Run `node plugin/scripts/<tool>.mjs --help`. Tests: `cd plugin && npm test`.

## References (`plugin/reference/`)
`template.md` · `contract.md` · `numbers.md` · `motion-tokens.js` · `banned.md` · `principles.md` · `followups.md` ·
`fixes.md` · `sound.md` · `export-x.md` · `engines/` (html, threejs, remotion, hyperframes, motion-react) · `examples/`.

## License
MIT. See `LICENSE`.
