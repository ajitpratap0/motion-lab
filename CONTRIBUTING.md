# Contributing

Thanks for helping. Bug reports from real projects are the most useful contribution right now, especially for
sound scoring and the Remotion, HyperFrames and Motion paths, which haven't had a full project run yet.

## Repository layout

```
.claude-plugin/marketplace.json   marketplace entry (source: ./plugin)
plugin/
  .claude-plugin/plugin.json      plugin manifest
  skills/<name>/SKILL.md          one skill per pipeline step, plus the motion-lab router
  agents/*.md                     reviewer, auditor, mixer, receipts subagents
  hooks/hooks.json                receipts and render-contract hooks
  scripts/*.mjs                   CLIs (render, audit, export, ...)
  scripts/lib/                    pure, tested helpers
  reference/                      template, contract, numbers, engines, examples
  examples/                       lint fixtures
  test/                           node:test suites
docs/media/                       README images
```

## Setup

```bash
cd plugin
npm i --no-save --no-package-lock playwright@1.58
npx playwright install chromium
npm test
```

You also need Node 20+ and ffmpeg/ffprobe on PATH. Browser tests skip themselves when Playwright isn't
installed; everything else runs without it.

To try your checkout in Claude Code:

```bash
claude plugin marketplace add /path/to/motion-lab
claude plugin install motion-lab@motion-lab
claude plugin validate plugin
```

## Guidelines

- **No runtime dependencies.** Scripts use Node built-ins, ffmpeg and the Playwright peer only.
- **Keep logic testable.** Put logic in `scripts/lib/` as pure functions with tests; keep browser glue thin.
- **Every CLI** takes `--help` and `--json`, writes results to stdout and progress to stderr, and uses the exit
  codes 1 (error), 2 (Playwright missing), 3 (a check failed).
- **Files stay under 400 lines.** Split by responsibility when one grows.
- **Skills and agents:** numbers over adjectives. Paths go through `LAB`, which is an absolute path written into
  each Bash call and agent prompt, not a shell variable.
- **Version pins:** any library a scene loads is pinned to an exact version. Engine docs name the version their
  advice was checked against.
- **Tests:** add one for each fix and each new behaviour. The contract-lint fixtures must keep their exit codes
  (`hello-loop.html` and `skeleton.html` 0, `bad-contract.html` 3).

## Adding an engine

1. Write `plugin/reference/engines/<engine>.md`: how to expose `renderAt(t)`, `__ready`, `__probe` and `__events`,
   how to freeze the engine's own clock, the pinned version, and known traps.
2. Mention it in the `motion-build` skill and the README.
3. Try it on a small real scene and include the contact sheet in your PR.

## Pull requests

- Branch from `main`, use [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`,
  `docs:`, ...).
- Fill in the PR template: summary, test plan, breaking changes.
- CI runs the tests, the lint fixtures and every CLI's `--help`.

## Releasing

Bump `version` in `plugin/.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` and
`plugin/package.json`, add a `CHANGELOG.md` entry, tag `vX.Y.Z`, and create a GitHub release.
