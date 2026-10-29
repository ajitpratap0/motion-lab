import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const booleanFlags = new Set([
  'help', 'json', 'gpu', 'labels', 'png', 'remove', 'dc', 'loudnorm', 'bed-only',
]);

/** Parse long flags, equals assignments, booleans, and positional arguments. */
export function parseArgs(argv = process.argv.slice(2)) {
  const args = { _: [] };

  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];
    if (argument === '--') {
      args._.push(...argv.slice(index + 1));
      break;
    }
    if (!argument.startsWith('--')) {
      args._.push(argument);
      continue;
    }

    const equalsIndex = argument.indexOf('=');
    const key = argument.slice(2, equalsIndex < 0 ? undefined : equalsIndex);
    if (!/^[a-z][a-z0-9-]*$/i.test(key)) {
      throw new Error(`Invalid flag: ${argument}`);
    }

    const hasValue = index + 1 < argv.length && !argv[index + 1].startsWith('--');
    if (equalsIndex >= 0) {
      args[key] = argument.slice(equalsIndex + 1);
    } else if (!booleanFlags.has(key) && hasValue) {
      args[key] = argv[++index];
    } else {
      args[key] = true;
    }
  }

  return args;
}

/** Read a finite numeric flag, optionally bounded and restricted to integers. */
export function number(args, key, fallback, options = {}) {
  const { min = -Infinity, max = Infinity, integer = false } = options;
  const raw = args[key] ?? fallback;
  const value = Number(raw);
  const invalid = raw === true || raw === '' || !Number.isFinite(value)
    || value < min || value > max || (integer && !Number.isInteger(value));

  if (invalid) {
    const kind = integer ? 'an integer' : 'a number';
    throw new Error(`--${key} must be ${kind} between ${min} and ${max}`);
  }
  return value;
}

/** Create the containing directory for a file resolved relative to cwd. */
export async function ensureParent(file) {
  await mkdir(path.dirname(path.resolve(file)), { recursive: true });
}

/** Print human-readable text or a single JSON result to stdout. */
export function output(args, value) {
  const text = typeof value === 'string' && !args.json
    ? value
    : JSON.stringify(value, null, args.json ? 0 : 2);
  process.stdout.write(`${text}\n`);
}

/** Execute a CLI with shared help, result formatting, and error exit handling. */
export async function cli(usage, command) {
  try {
    const args = parseArgs();
    if (args.help) {
      process.stdout.write(`${usage}\n`);
      return;
    }

    const value = await command(args);
    if (value !== undefined) {
      output(args, value);
    }
  } catch (error) {
    const prefix = error.message.startsWith('motion-lab:') ? '' : 'motion-lab: ';
    process.stderr.write(`${prefix}${error.message}\n`);
    process.exitCode = error.exitCode ?? 1;
  }
}
