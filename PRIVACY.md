# Privacy policy

motion-lab is a Claude Code plugin that runs entirely on your machine. It has no server and collects nothing.

## What it reads and writes
- **Your project folder only.** Scripts read the scene files, `motion-lab.json` and rendered frames you point them
  at, and write their output (frames, contact sheets, audio, MP4/GIF, reports) into that folder.
- **Your prompts, locally.** In folders that contain a `motion-lab.json`, the `UserPromptSubmit` hook appends each
  prompt you type to `RECEIPTS.md` in that folder, so the finished piece can show how it was made. Nothing leaves
  your machine. Turn it off with `"receipts": false` in `motion-lab.json`.
- The `PostToolUse` hook runs the local render-contract linter on `.html` files Claude edits.

## What it sends
Nothing. The plugin makes no network requests of its own, has no analytics or telemetry, and reads no credentials,
tokens or environment secrets.

When a scene you build is rendered, headless Chromium loads whatever the scene references, typically pinned
libraries from public CDNs (for example jsDelivr) and Google Fonts. Those requests come from your scene, go
directly to those providers, and are covered by their privacy policies.

## Retention
The plugin keeps no data. Files it writes stay in your project folder until you delete them.

## Contact
Questions or concerns: open an issue at https://github.com/ajitpratap0/motion-lab/issues, or use private
vulnerability reporting for security matters (see `SECURITY.md`).
