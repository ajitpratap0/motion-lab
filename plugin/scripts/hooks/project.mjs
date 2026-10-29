// Shared helpers for Motion Lab hooks. Hooks must never fail the user's turn: callers catch everything.
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

export async function readStdinJson() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8').trim();
  return raw ? JSON.parse(raw) : {};
}

// Walk up to the filesystem root looking for motion-lab.json; returns { root, config, malformed } or null.
// A malformed config fails closed: receipts are disabled until the file parses again.
export function findProject(start) {
  let dir = path.resolve(start || process.cwd());
  for (;;) {
    const file = path.join(dir, 'motion-lab.json');
    if (existsSync(file)) {
      try {
        return { root: dir, config: JSON.parse(readFileSync(file, 'utf8')), malformed: false };
      } catch {
        return { root: dir, config: { receipts: false }, malformed: true };
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}
