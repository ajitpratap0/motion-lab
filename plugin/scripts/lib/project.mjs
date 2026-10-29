import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { number } from './args.mjs';

const defaults = { file: 'anim.html', secs: 6, fps: 24, width: 1080, height: 1080 };

/** Find the nearest project configuration, walking all the way to the root. */
export async function loadProjectConfig(startDir = process.cwd()) {
  let directory = path.resolve(startDir);
  while (true) {
    const file = path.join(directory, 'motion-lab.json');
    let source;
    try {
      source = await readFile(file, 'utf8');
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    if (source !== undefined) {
      try {
        const config = JSON.parse(source);
        if (!config || Array.isArray(config) || typeof config !== 'object') {
          throw new Error('expected an object');
        }
        return config;
      } catch {
        process.stderr.write(`motion-lab: invalid JSON in ${file}; using built-in defaults\n`);
        return {};
      }
    }
    const parent = path.dirname(directory);
    if (parent === directory) return {};
    directory = parent;
  }
}

/** Resolve CLI > audit spec > project configuration > built-in scene defaults. */
export function resolveProjectOptions(args, config = {}, spec = {}) {
  const settings = { ...defaults, ...config, ...spec };
  const file = args._?.[0] ?? settings.file;
  if (typeof file !== 'string' || !file.trim()) {
    throw new Error('Scene file must be a nonempty path');
  }
  return {
    file,
    secs: number(args, 'secs', settings.secs, { min: 0.001 }),
    fps: number(args, 'fps', settings.fps, { min: 0.001 }),
    width: number(args, 'width', settings.width, { min: 1, integer: true }),
    height: number(args, 'height', settings.height, { min: 1, integer: true }),
  };
}
