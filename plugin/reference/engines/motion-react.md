# Engine: Motion (React) / GSAP for live product UI

When the motion lives inside a product rather than a video. No video renderer.

- Import from `motion/react` (MIT); never the deprecated `framer-motion` package.
- Respect `useReducedMotion()`.
- Transform and opacity only; motion values for high-frequency updates; variants with `staggerChildren`.
- Springs: Motion's `{ type: 'spring', bounce, visualDuration }` or `{ stiffness, damping, mass }`; state ζ and derive.
- The numbers (numbers.md) and the ban list still apply. The render contract does not: UI runs on real time.
- To make a marketing clip of the UI, rebuild the moment as an HTML scene under the render contract instead of
  screen-recording the app.

## Rendering a clip with Motion (verified on motion 14.2.0)
Motion has no video renderer, but its vanilla `animate()` can be paused and seeked, so a Motion scene follows the
render contract and works with every lab script:
```html
<script src="https://cdn.jsdelivr.net/npm/motion@14.2.0/dist/motion.js"></script>   <!-- exposes window.Motion -->
<script>
  const { animate } = window.Motion;
  const controls = animate(card, { scale: [0.6, 1], rotate: [-8, 0] },
    { type: 'spring', stiffness: 220, damping: 14, mass: 1, delay: 0.25 });
  controls.pause();
  window.renderAt = (t) => { controls.time = t; };     // seconds; frames rendered alone match frames in sequence
</script>
```
- Measured: identical pixels for a frame rendered alone and in sequence; probe values follow the spring exactly
  (scale 1.0737 at frame 12, the same value Remotion's `spring()` gives with the same config).
- Keep opacity off springs: an underdamped spring clamps at 1, then dips (0.985 here). Tween opacity separately.

## Official agent tooling
motion.dev's official agent tooling is the paid Motion+ AI Kit (`npx motion-ai`, MCP server + `/motion` skill;
https://motion.dev/docs/ai-kit). There is no free official Claude Code plugin; `@motion.page/claude-plugin` belongs
to Motion.page, a different company. Without Motion+, rely on current Motion docs (Context7) and this file.
