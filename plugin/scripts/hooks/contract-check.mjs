// PostToolUse hook: lint edited HTML scenes in a Motion Lab project against the render contract.
// Errors are fed back to Claude (decision: block); warnings become additional context.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findProject, readStdinJson } from './project.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const LINT = path.join(here, '..', 'contract-lint.mjs');
const MAX_ITEMS = 12;

function collect(report) {
  const items = Array.isArray(report) ? report : report.issues || report.findings || report.results || [];
  return items.filter((item) => item && typeof item === 'object');
}

function format(item) {
  const where = item.line ? `line ${item.line}` : 'file';
  return `- ${where}: ${item.rule || item.id || 'rule'}: ${item.message || ''}`.trim();
}

function emit(obj) {
  process.stdout.write(JSON.stringify(obj));
}

try {
  const input = await readStdinJson();
  const file = input.tool_input && input.tool_input.file_path;
  if (file && /\.html?$/i.test(file) && existsSync(file) && existsSync(LINT)) {
    const project = findProject(path.dirname(file));
    if (project) {
      const res = spawnSync(process.execPath, [LINT, file, '--json'], { encoding: 'utf8', timeout: 8000 });
      const report = JSON.parse(res.stdout || '{}');
      const items = collect(report);
      const errors = items.filter((i) => i.severity === 'error');
      const warns = items.filter((i) => i.severity !== 'error');
      if (errors.length) {
        const lines = errors.slice(0, MAX_ITEMS).map(format).join('\n');
        emit({
          decision: 'block',
          reason: `Render contract violations in ${path.basename(file)} (fix before rendering):\n${lines}`,
        });
      } else if (warns.length) {
        emit({
          hookSpecificOutput: {
            hookEventName: 'PostToolUse',
            additionalContext: `Render contract warnings in ${path.basename(file)}:\n${warns.slice(0, MAX_ITEMS).map(format).join('\n')}`,
          },
        });
      }
    }
  }
} catch {
  // Linting is advisory; a hook failure must not interrupt the edit.
}
process.exit(0);
