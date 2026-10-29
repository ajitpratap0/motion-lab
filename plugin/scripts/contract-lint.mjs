import { readFile } from 'node:fs/promises';
import { cli, output } from './lib/args.mjs';
import { lint } from './lib/lint.mjs';

const usage = 'Usage: node scripts/contract-lint.mjs <file.html> [--json]';

function formatFindings(file, findings) {
  if (!findings.length) {
    return 'Render contract: no findings.';
  }
  return findings.map(finding => (
    `${file}:${finding.line}: ${finding.severity} ${finding.rule}: ${finding.message}`
  )).join('\n');
}

async function lintFile(args) {
  if (args._.length !== 1) {
    throw new Error('Expected one HTML file');
  }
  const file = args._[0];
  const findings = lint(await readFile(file, 'utf8'));
  const errors = findings.filter(finding => finding.severity === 'error').length;
  const result = { file, errors, warnings: findings.length - errors, findings };

  output(args, args.json ? result : formatFindings(file, findings));
  if (errors) {
    process.exitCode = 3;
  }
}

await cli(usage, lintFile);
