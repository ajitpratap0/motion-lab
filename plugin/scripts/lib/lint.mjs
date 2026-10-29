import { prepareSource, hasTimeGuard, hasPinnedPathVersion } from './lint-source.mjs';

const renderAssignment = /(?:window\s*\.\s*renderAt|window\[['"]renderAt['"]\])\s*=/;
const animationCall = /\b(?:requestAnimationFrame|setInterval|setTimeout)\s*\(/;
const clockCall = /\b(?:Date|performance)\s*\.\s*now\s*\(/;

function isFontUrl(value) {
  try {
    const url = new URL(value);
    return ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname);
  } catch {
    return false;
  }
}

function nonFontRequest(match, context) {
  if (!match[0].startsWith('fetch')) return true;
  const argument = context.literals.find(literal => (
    literal.start > match.index && literal.end <= match.index + match[0].length
  ));
  return !argument || !isFontUrl(argument.value);
}

/** Data-driven rules scan executable code; CDN rules use extracted import URLs. */
export const rules = [
  {
    id: 'date-now',
    severity: 'error',
    pattern: /\bDate\s*\.\s*now\s*\(/g,
    message: 'Date.now makes motion depend on wall time; use renderAt(t).',
  },
  {
    id: 'performance-now',
    severity: 'error',
    pattern: /\bperformance\s*\.\s*now\s*\(/g,
    when: (_, context) => !context.frozenGuard,
    message: 'performance.now requires a location.search guard for t.',
  },
  {
    id: 'new-date',
    severity: 'error',
    pattern: /\bnew\s+Date\s*\(/g,
    message: 'Use explicit render time instead of new Date.',
  },
  {
    id: 'timeout',
    severity: 'error',
    pattern: /\bsetTimeout\s*\(/g,
    message: 'Timers violate deterministic rendering.',
  },
  {
    id: 'interval',
    severity: 'error',
    pattern: /\bsetInterval\s*\(/g,
    message: 'Intervals violate deterministic rendering.',
  },
  {
    id: 'random',
    severity: 'error',
    pattern: /\bMath\s*\.\s*random\s*\(/g,
    message: 'Use a seeded generator instead of Math.random.',
  },
  {
    id: 'transition',
    severity: 'error',
    pattern: /\btransition(?:-property)?\s*:\s*[^;}]+/g,
    message: 'CSS transitions depend on prior state; derive animated properties from t.',
  },
  {
    id: 'cdn-version',
    severity: 'error',
    urls: true,
    message: 'Pin the import URL to an exact x.y.z version in its path.',
  },
  {
    id: 'network',
    severity: 'error',
    pattern: /\bfetch\s*\([^)]*\)|\bnew\s+XMLHttpRequest\s*\(/g,
    when: nonFontRequest,
    message: 'External fetch/XHR is nondeterministic; only font hosts are allowed.',
  },
  {
    id: 'raf-guard',
    severity: 'error',
    pattern: /\brequestAnimationFrame\s*\(/g,
    when: (_, context) => !context.frozenGuard,
    message: 'Guard animation loops with a location.search check for t.',
  },
  {
    id: 'missing-render',
    severity: 'error',
    pattern: new RegExp(animationCall.source + '|' + clockCall.source, 'g'),
    once: true,
    when: (_, context) => !renderAssignment.test(context.code),
    message: 'JS animation requires window.renderAt(t).',
  },
  {
    id: 'keyframe-layout',
    severity: 'warn',
    pattern: /@(?:-webkit-)?keyframes\b[\s\S]*?\}\s*\}/g,
    when: match => /\b(?:width|height|top|left|margin(?:-[a-z]+)?)\s*:/.test(match[0]),
    message: 'Prefer transform/opacity over layout properties in keyframes.',
  },
];

function sourceLineStarts(source) {
  const starts = [0];
  for (let index = 0; index < source.length; index++) {
    if (source[index] === '\n') starts.push(index + 1);
  }
  return starts;
}

function lineAt(starts, index) {
  let lower = 0;
  let upper = starts.length;
  while (lower + 1 < upper) {
    const middle = (lower + upper) >> 1;
    if (starts[middle] <= index) lower = middle;
    else upper = middle;
  }
  return lower + 1;
}

function matchesForRule(rule, context) {
  if (rule.urls) {
    return context.urls.filter(entry => !isFontUrl(entry.url)
      && !hasPinnedPathVersion(entry.url)).map(entry => ({ index: entry.index }));
  }
  const pattern = new RegExp(rule.pattern.source, rule.pattern.flags);
  return context.code.matchAll(pattern);
}

/** Find render-contract violations, ignoring comments and literal prose. */
export function lint(source) {
  const context = prepareSource(source);
  context.frozenGuard = hasTimeGuard(context.guardCode);
  const lineStarts = sourceLineStarts(source);
  const findings = [];

  for (const rule of rules) {
    for (const match of matchesForRule(rule, context)) {
      if (rule.when && !rule.when(match, context)) continue;
      findings.push({
        rule: rule.id,
        severity: rule.severity,
        line: lineAt(lineStarts, match.index),
        message: rule.message,
      });
      if (rule.once) break;
    }
  }
  return findings.sort((first, second) => (
    first.line - second.line || first.rule.localeCompare(second.rule)
  ));
}
