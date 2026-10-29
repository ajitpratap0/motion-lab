import {writeFile} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {cli, ensureParent} from './lib/args.mjs';
import {loadProjectConfig, resolveProjectOptions} from './lib/project.mjs';
import {withPage, freeze} from './lib/page.mjs';
import {frameCount} from './lib/timing.mjs';

const usage = 'probe.mjs <file.html> [--secs 6] [--fps 24] [--width 1080] [--height 1080] '
  + '[--out out/probe.json] [--json]\n'
  + 'Defaults come from motion-lab.json when present.';

/** Collect a flat numeric probe after freezing each output frame. */
export async function collectProbe(page, {secs = 6, fps = 24} = {}) {
  if (!await page.evaluate(() => typeof window.__probe === 'function')) {
    throw new Error('Page is missing window.__probe(t)');
  }
  const frames = [];
  for (let frame = 0; frame < frameCount(secs, fps); frame++) {
    const time = frame / fps;
    await freeze(page, time);
    const values = await page.evaluate(async renderTime => window.__probe(renderTime), time);
    const invalid = !values || Array.isArray(values) || typeof values !== 'object'
      || Object.values(values).some(value => typeof value !== 'number' || !Number.isFinite(value));
    if (invalid) throw new Error(`__probe(${time}) must return a flat object of finite numbers`);
    frames.push({...values, frame, t: time});
  }
  return {fps, frames};
}

async function probeCommand(args) {
  const options = resolveProjectOptions(args, await loadProjectConfig());
  const result = await withPage(options.file, options, page => collectProbe(page, options));
  const out = args.out || 'out/probe.json';
  await ensureParent(out);
  await writeFile(out, JSON.stringify(result, null, 2));
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await cli(usage, probeCommand);
}
