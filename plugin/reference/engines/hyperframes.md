# Engine: HyperFrames (HeyGen, Apache-2.0)

Use when you think in web pages and GSAP timelines and want a CLI that renders MP4. No company-license rule.

## Official Claude Code plugin (verified, from the HyperFrames README)
```
claude plugin marketplace add heygen-com/hyperframes
claude plugin install hyperframes@hyperframes     # invoke as /hyperframes:hyperframes
```
Its skills cover the CLI, registry, media, slideshows and a `remotion-to-hyperframes` converter. Use them for
project mechanics; Motion Lab supplies direction, numbers, review, audit and sound.

## Project setup (Node 22+, FFmpeg)
```
npx hyperframes init my-video && cd my-video
npx hyperframes preview
npx hyperframes render
```

## Mapping the lab onto HyperFrames
- Write HTML + CSS + a paused GSAP timeline; the directed template and ban list apply unchanged.
- Keep `window.renderAt(t)` seeking the master timeline so the lab's `render.mjs`, `audit.mjs` and `lab.mjs` also work
  on the page directly for reviews; use HyperFrames' renderer for the final MP4 if preferred.
- Verify versions in the project's lockfile before relying on an API.

## Verified on hyperframes 0.8.217, gsap 3.14.2
Lab `contract-lint`, `audit`, `render` and `export xcheck` all pass on a HyperFrames composition, and its frames
match `hyperframes render` (mean difference 0.19/255 between the two MP4s). What it took:
```js
const tl = gsap.timeline({ paused: true });
// ... tweens ...
window.__timelines = window.__timelines || {};   // the blank scaffold assumes it exists; it doesn't outside the CLI
window.__timelines['main'] = tl;
window.renderAt = (t) => { tl.seek(t, false); };
const params = new URLSearchParams(location.search);
window.renderAt(params.has('t') ? Number(params.get('t')) : 0);
document.fonts.ready.then(() => { window.__ready = true; });
```
- **Frame rate:** `hyperframes render` defaults to 30 fps. Set `data-fps` on the root composition to the brief's fps,
  or pass `--fps`, so its MP4 matches the lab's frames.
- **Fonts:** load a web font (`display=block`). With system Georgia the two renderers drew different serifs (mean
  difference 3.2/255, text visibly shifted).
- **Run both checks:** `contract-lint` and `npx hyperframes check`. HyperFrames' check also catches GSAP traps, for
  example a CSS `transform` on an element whose scale or position GSAP tweens: drop the CSS transform and use
  `tl.fromTo`, so GSAP owns the whole transform.
- `check` warns `first_frame_empty` when frame 0 is only background (it becomes the thumbnail); for a loop that
  starts empty, accept it or start mid-entrance.
