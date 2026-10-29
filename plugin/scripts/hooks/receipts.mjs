// UserPromptSubmit hook: append the user's raw prompt to RECEIPTS.md in a Motion Lab project.
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { findProject, readStdinJson } from './project.mjs';

const RAW_HEADER = '\n## Raw log\n';
const MAX_CHARS = 8000;

function quote(text) {
  return text.split(/\r?\n/).map((line) => `> ${line}`).join('\n');
}

try {
  const input = await readStdinJson();
  const prompt = typeof input.prompt === 'string' ? input.prompt.trim() : '';
  const project = prompt ? findProject(input.cwd) : null;
  if (project && project.config.receipts !== false) {
    const file = path.join(project.root, 'RECEIPTS.md');
    if (!existsSync(file)) {
      const name = project.config.name ?? path.basename(project.root);
      writeFileSync(file, `# Receipts: ${name}\n`);
    }
    const current = readFileSync(file, 'utf8');
    const header = current.includes('## Raw log') ? '' : RAW_HEADER;
    const body = prompt.length > MAX_CHARS ? `${prompt.slice(0, MAX_CHARS)}\n[truncated]` : prompt;
    appendFileSync(file, `${header}\n**${new Date().toISOString()}**\n${quote(body)}\n`);
  }
} catch {
  // Receipts are best-effort; never block the prompt.
}
process.exit(0);
