import {mkdir, readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {cli, number} from './lib/args.mjs';
import {lint} from './lib/lint.mjs';
import {renderFrames, selectedFrames} from './render.mjs';
import {withPage} from './lib/page.mjs';
import {collectProbe} from './probe.mjs';
import {speedGraph} from './speed-graph.mjs';
import {run} from './lib/ffmpeg.mjs';
import {defaultStills, frameCount} from './lib/timing.mjs';
import {loadProjectConfig, resolveProjectOptions} from './lib/project.mjs';

const usage = 'Usage: node scripts/lab.mjs <file.html> [--secs 6] [--fps 24] '
  + '[--width 1080] [--height 1080] [--stills first,quarters,last] [--every 12]\n'
  + '  [--linear-ok key,key] [--json]\n'
  + 'Defaults come from motion-lab.json when present.';

async function createContactSheet(frameDirectory, every, output) {
  const script = fileURLToPath(new URL('./contact-sheet.mjs', import.meta.url));
  const result = await run(process.execPath, [
    script, '--frames', frameDirectory, '--every', String(every),
    '--labels', '--out', output, '--json'
  ]);
  if (result.code !== 0) throw new Error(result.stderr.trim() || 'Contact sheet failed');
}

async function collectProbeArtifacts(file, options, directory, artifacts, writeArtifact, linearOk) {
  let probeAvailable = false;
  await withPage(file, options, async page => {
    probeAvailable = await page.evaluate(() => typeof window.__probe === 'function');
    if (!probeAvailable) return;
    const data = await collectProbe(page, options);
    const probe = await writeArtifact('probe.json', data);
    const keys = Object.keys(data.frames[0] ?? {}).filter(key => key !== 'frame' && key !== 't');
    if (keys.length) {
      const speed = path.join(directory, 'speed.svg');
      const graph = await speedGraph({probe, keys, out: speed, linearOk});
      artifacts.push(speed);
      await writeArtifact('speed-findings.json', graph.findings);
    }
  });
  return probeAvailable;
}

async function labCommand(args) {
  if (args._.length > 1) throw new Error('Expected one HTML file');
  const config = await loadProjectConfig();
  const options = resolveProjectOptions(args, config);
  const linearOk = typeof args['linear-ok'] === 'string'
    ? args['linear-ok'].split(',')
    : (Array.isArray(config.linear_ok) ? config.linear_ok : []);
  const file = path.resolve(options.file);
  const count = frameCount(options.secs, options.fps);
  const every = number(args, 'every', 12, {min: 1, integer: true});
  const stills = args.stills === undefined
    ? defaultStills(count)
    : selectedFrames({frames: args.stills}, count);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const directory = path.resolve('out', 'review', timestamp);
  await mkdir(directory, {recursive: true});
  const artifacts = [];

  async function writeArtifact(name, data) {
    const output = path.join(directory, name);
    await writeFile(output, JSON.stringify(data, null, 2));
    artifacts.push(output);
    return output;
  }

  const findings = lint(await readFile(file, 'utf8'));
  const summary = {
    errors: findings.filter(finding => finding.severity === 'error').length,
    warnings: findings.filter(finding => finding.severity === 'warn').length
  };
  await writeArtifact('contract-lint.json', {...summary, findings});
  const frameDirectory = path.join(directory, 'frames');
  // Render the complete sequence so --every retains the exact frame cadence.
  await renderFrames(file, {...options, out: frameDirectory});
  const allFrames = Array.from({length: count}, (_, index) => {
    return path.join(frameDirectory, `${String(index).padStart(4, '0')}.png`);
  });
  artifacts.push(...allFrames);
  const contact = path.join(directory, 'contact.png');
  await createContactSheet(frameDirectory, every, contact);
  artifacts.push(contact);
  const probeAvailable = await collectProbeArtifacts(
    file, options, directory, artifacts, writeArtifact, linearOk
  );
  const packFile = path.join(directory, 'pack.json');
  artifacts.push(packFile);
  const pack = {
    file, options, lint: summary, stills: stills.map(frame => allFrames[frame]),
    contact, probeAvailable, artifacts
  };
  await writeFile(packFile, JSON.stringify(pack, null, 2));
  return {out: directory, pack: packFile, ...summary};
}

await cli(usage, labCommand);
