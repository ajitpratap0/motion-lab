---
name: motion-setup
description: Set up a Motion Lab project - verify node, ffmpeg and Playwright Chromium, then create motion-lab.json, RECEIPTS.md and out/. Use before the first render in a new folder or when a lab script reports a missing dependency.
---

# Motion Lab setup

`LAB` = two directories above this skill's base directory.

## 1. Check tools (report what is missing; do not install system packages without asking)
```bash
node -v            # >= 20
ffmpeg -version | head -1 && ffprobe -version | head -1
node -e "import('playwright').then(()=>console.log('playwright ok')).catch(()=>console.log('playwright missing'))"
```
- Missing node/ffmpeg on macOS: suggest `brew install node ffmpeg`; Windows: `winget install OpenJS.NodeJS.LTS` and
  `winget install Gyan.FFmpeg` (open a new terminal after; PowerShell 5.1 has no `&&`, use `;`; use `npx.cmd` if
  `npx` is blocked).
- Missing Playwright (project-local, pinned by the project's lockfile; the scripts resolve it from the current
  project first, then fall back to a copy next to the plugin):
  `npm init -y` (if no package.json) then `npm i -D playwright` and `npx playwright install chromium`.

## 2. Create the project files (only if absent; never overwrite)
`motion-lab.json`:
```json
{
  "name": "<slug>",
  "engine": "html | threejs | remotion | hyperframes",
  "file": "anim.html",
  "width": 1080, "height": 1080, "fps": 24, "secs": 6, "loop": true,
  "bpm": 120,
  "banned": [],
  "contract_extra": [],
  "receipts": true
}
```
`RECEIPTS.md`:
```markdown
# Receipts: <name>
Model: <model> | effort: medium

## Prompt
(filled by motion-direct)

## Creative follow-ups

## Sound follow-ups

## Technical fixes (not counted)
```
Create `out/` and add `out/` and `node_modules/` to `.gitignore` if the folder is a git repo.

Keep this file valid JSON: if it fails to parse, the scripts warn and use built-in defaults, and the receipts hook
stops logging until it is fixed.

The `receipts` flag lets the plugin's UserPromptSubmit hook append the user's raw prompts to `RECEIPTS.md`
under `## Raw log`; set it to false to disable.

## 3. Optional: live preview helpers
`node "$LAB/scripts/inject.mjs" anim.html` adds the `?t=` freeze hook, `?counter=1` frame counter and space-to-pause.
Remove before final render with `--remove`.
