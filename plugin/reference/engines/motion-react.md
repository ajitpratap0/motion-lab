# Engine: Motion (React) / GSAP for live product UI

When the motion lives inside a product rather than a video. No video renderer.

- Import from `motion/react` (MIT); never the deprecated `framer-motion` package.
- Respect `useReducedMotion()`.
- Transform and opacity only; motion values for high-frequency updates; variants with `staggerChildren`.
- Springs: Motion's `{ type: 'spring', bounce, visualDuration }` or `{ stiffness, damping, mass }`; state ζ and derive.
- The numbers (numbers.md) and the ban list still apply. The render contract does not: UI runs on real time.
- To make a marketing clip of the UI, rebuild the moment as an HTML scene under the render contract instead of
  screen-recording the app.

## Official agent tooling
motion.dev's official agent tooling is the paid Motion+ AI Kit (`npx motion-ai`, MCP server + `/motion` skill;
https://motion.dev/docs/ai-kit). There is no free official Claude Code plugin; `@motion.page/claude-plugin` belongs
to Motion.page, a different company. Without Motion+, rely on current Motion docs (Context7) and this file.
