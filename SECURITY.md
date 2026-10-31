# Security policy

## What runs on your machine

- Scripts run locally with Node and ffmpeg, and open your scene files in headless Chromium through Playwright.
- The two hooks run on every prompt and on Write/Edit: they only read `motion-lab.json`, append to `RECEIPTS.md`,
  and lint `.html` files. Neither makes network requests.
- Scenes may load pinned libraries and fonts from CDNs when rendered; `contract-lint` rejects unpinned URLs.
- Nothing installs packages on its own; missing tools are reported with install instructions.

## Reporting a vulnerability

Please don't open a public issue. Use GitHub's private reporting:
**Security → Report a vulnerability** on https://github.com/ajitpratap0/motion-lab.
Expect a reply within a week. Only the latest release gets fixes.
