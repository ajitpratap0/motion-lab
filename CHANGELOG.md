# Changelog

All notable changes are listed here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.1] - 2026-10-31
### Added
- README rewrite with demo media, quick start, pipeline overview and configuration reference.
- Contributing guide, code of conduct, security policy, issue and PR templates.
- GitHub Actions CI: tests, lint fixtures and `--help` for every CLI.
- Engine docs: verified setups for HyperFrames 0.8.217 (fps, fonts, `__timelines`, its `check`), Motion 14.2.0
  (seekable `animate()` clips) and Remotion 4.0.536 (value audits in plain Node, frame naming).
- Fix table: final render differing from reviewed frames because of system fonts.
- Sound docs: the scene wraps loop tails itself (`--passes` doesn't), an exact recipe for hits that crest on the
  target sample, and measuring the muxed MP4 with `--bed`.

## [0.1.0] - 2026-10-31
### Added
- First release: 11 skills (direct, build, render, review, audit, score, export, fix, receipts, setup and the
  `motion-lab` router), 4 agents, receipts and render-contract hooks, 14 command-line scripts, references for plain HTML,
  three.js, Remotion, HyperFrames and Motion.
- Tried end to end on a plain-HTML kinetic-type loop and a three.js product loop.

[Unreleased]: https://github.com/ajitpratap0/motion-lab/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/ajitpratap0/motion-lab/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/ajitpratap0/motion-lab/releases/tag/v0.1.0
