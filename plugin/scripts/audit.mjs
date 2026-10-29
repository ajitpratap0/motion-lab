import {readFile, writeFile, mkdtemp, rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {cli, ensureParent} from './lib/args.mjs';
import {loadProjectConfig, resolveProjectOptions} from './lib/project.mjs';
import {withPage, freeze} from './lib/page.mjs';
import {frameCount} from './lib/timing.mjs';
import {compareImages} from './lib/image.mjs';

const usage = 'audit.mjs <file.html> --spec audit.json [--secs 6] [--fps 24] '
  + '[--width 1080] [--height 1080] [--out out/audit.json] [--json]\n'
  + 'Defaults come from motion-lab.json when present.';

function compare(actual, operator, expected, tolerance) {
  switch (operator) {
    case '==': return actual === expected;
    case '!=': return actual !== expected;
    case '<': return actual < expected;
    case '<=': return actual <= expected;
    case '>': return actual > expected;
    case '>=': return actual >= expected;
    case '~=':
      return typeof actual === 'number' && Math.abs(actual - expected) <= tolerance;
    default: throw new Error(`Unsupported audit operator: ${operator}`);
  }
}

async function screenshot(page, time, directory, name) {
  await freeze(page, time);
  const output = path.join(directory, `${name}.png`);
  await page.screenshot({path: output});
  return output;
}

async function checkLoop(page, options, directory, index, result) {
  const count = frameCount(options.secs, options.fps);
  const zero = await screenshot(page, 0, directory, `${index}-zero`);
  const end = await screenshot(page, options.secs, directory, `${index}-end`);
  const last = await screenshot(page, (count - 1) / options.fps, directory, `${index}-last`);
  const seam = await compareImages(zero, end, 2);
  const duplicate = await compareImages(zero, last, 0);
  result.actual = {
    seamChangedPixels: seam.changedPixels,
    lastChangedPixels: duplicate.changedPixels
  };
  result.expected = {seamChangedPixels: 0, lastChangedPixels: '> 0'};
  result.ok = seam.changedPixels === 0 && duplicate.changedPixels > 0;
  result.message = result.ok
    ? 'Loop seam matches without a duplicated final frame'
    : 'Loop seam mismatch or duplicated final frame';
}

async function checkDeterministic(file, options, directory, index, time, result) {
  const snapshots = [];
  for (let load = 0; load < 2; load++) {
    snapshots.push(await withPage(file, options, fresh => {
      return screenshot(fresh, time, directory, `${index}-fresh-${load}`);
    }));
  }
  const stats = await compareImages(snapshots[0], snapshots[1], 0);
  result.actual = stats.changedPixels;
  result.expected = 0;
  result.ok = stats.changedPixels === 0;
  result.message = result.ok ? 'Fresh page loads are pixel-identical' : 'Fresh page loads differ';
}

async function checkExpression(page, check, time, result) {
  if (typeof check.expr !== 'string') throw new Error('Expression check requires expr');
  await freeze(page, time);
  result.actual = await page.evaluate(({expr, t, frame}) => {
    return new Function('t', 'frame', `return (${expr});`)(t, frame);
  }, {expr: check.expr, t: time, frame: check.frame});
  result.ok = compare(result.actual, check.op, check.value, check.tol ?? 1e-3);
  result.message = result.ok ? 'Expression matched' : `Expression did not satisfy ${check.op}`;
}

async function executeChecks(file, options, checks, directory) {
  const count = frameCount(options.secs, options.fps);
  const results = [];
  await withPage(file, options, async page => {
    for (const [index, check] of checks.entries()) {
      const result = {
        id: check.id ?? `check-${index}`,
        frame: check.frame ?? null,
        ok: false,
        actual: null,
        expected: check.value ?? null,
        message: ''
      };
      try {
        if (check.type === 'loop') {
          await checkLoop(page, options, directory, index, result);
        } else {
          if (!Number.isInteger(check.frame) || check.frame < 0 || check.frame >= count) {
            throw new Error(`frame must be an integer from 0 to ${count - 1}`);
          }
          const time = check.frame / options.fps;
          if (check.type === 'deterministic') {
            await checkDeterministic(file, options, directory, index, time, result);
          } else {
            await checkExpression(page, check, time, result);
          }
        }
      } catch (error) {
        result.message = error.message;
      }
      results.push(result);
    }
  });
  return results;
}

async function auditCommand(args) {
  if (!args.spec) throw new Error('--spec is required');
  const spec = JSON.parse(await readFile(args.spec, 'utf8'));
  if (!Array.isArray(spec.checks)) throw new Error('Audit spec must contain a checks array');
  const options = resolveProjectOptions(args, await loadProjectConfig(), spec);
  const directory = await mkdtemp(path.join(tmpdir(), 'motion-audit-'));
  let results;
  try {
    results = await executeChecks(options.file, options, spec.checks, directory);
  } finally {
    await rm(directory, {recursive: true, force: true});
  }
  const result = {
    passed: results.filter(check => check.ok).length,
    failed: results.filter(check => !check.ok).length,
    results
  };
  const out = args.out || 'out/audit.json';
  await ensureParent(out);
  await writeFile(out, JSON.stringify(result, null, 2));
  if (result.failed) process.exitCode = 3;
  return result;
}

await cli(usage, auditCommand);
