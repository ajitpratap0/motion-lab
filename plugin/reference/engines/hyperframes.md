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
