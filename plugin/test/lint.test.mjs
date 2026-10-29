import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { lint } from '../scripts/lib/lint.mjs';

function errors(source) {
  return lint(source).filter(finding => finding.severity === 'error');
}

test('documented minimal skeleton and guarded live preview pass lint', async () => {
  const source = await readFile('examples/skeleton.html', 'utf8');
  assert.deepEqual(errors(source), []);
  const guarded = `<script>
    const params = new URLSearchParams(location.search);
    const frozen = params.get('t');
    window.renderAt = t => {};
    if (!frozen) requestAnimationFrame(() => performance.now());
  </script>`;
  assert.deepEqual(errors(guarded), []);
});

test('renderAt and unrelated query parameters never count as frozen guards', () => {
  for (const guard of [
    '', 'const search = location.search;',
    "const frozen = new URLSearchParams(location.search).has('x');",
    "// new URLSearchParams(location.search).has('t')",
    'const description = "location.search has t";',
  ]) {
    const source = `<script>${guard}
      window.renderAt = t => {};
      requestAnimationFrame(() => performance.now());
    </script>`;
    const rules = errors(source).map(finding => finding.rule);
    assert.ok(rules.includes('raf-guard'), guard);
    assert.ok(rules.includes('performance-now'), guard);
  }
});

test('comments and string text are ignored but template interpolation remains code', () => {
  const source = [
    '<!-- Date.now() -->',
    '<style>/* transition: width 1s; */</style>',
    '<script>',
    '// Math.random() Date.now()',
    '/* setTimeout(call) */',
    'const text = "setTimeout(call)";',
    "const other = 'Math.random()';",
    'const template = `<!-- Date.now() ${Math.random()} -->`;',
    'window.renderAt = t => {};',
    '</script>',
  ].join('\n');
  const findings = errors(source);
  assert.deepEqual(findings.map(finding => [finding.rule, finding.line]), [['random', 8]]);
});

test('timers, Date and random remain errors even with a time guard', () => {
  const source = `<script>
    const frozen = new URLSearchParams(location.search).has('t');
    window.renderAt = t => {};
    Date.now(); new Date(); setTimeout(call); setInterval(call); Math.random();
  </script>`;
  const rules = errors(source).map(finding => finding.rule);
  for (const rule of ['date-now', 'new-date', 'timeout', 'interval', 'random']) {
    assert.ok(rules.includes(rule), rule);
  }
});

test('CDN rules inspect every import host and require exact path versions', () => {
  const invalidUrls = [
    'https://esm.sh/three@latest',
    'https://cdn.jsdelivr.net/npm/x@latest/a.js?v=1.2.3',
    'https://unpkg.com/three@3/a.js',
    'https://esm.run/three@^1.2.3',
    'https://cdn.skypack.dev/three@~1.2.3',
    'https://raw.githubusercontent.com/owner/repo/main/a.js',
    'https://esm.sh/three@latest/1.2.3/module.js',
    'https://esm.sh/three@3/1.2.3/module.js',
  ];
  for (const url of invalidUrls) {
    const inputs = [
      `<script src="${url}"></script>`,
      `<link rel="stylesheet" href="${url}">`,
      `<script type="module">import thing from '${url}';</script>`,
      `<script type="module">import { thing } from '${url}';</script>`,
      `<script type="module">export { thing } from '${url}';</script>`,
      `<script type="module">import('${url}');</script>`,
      `<script type="importmap">{"imports":{"thing":"${url}"}}</script>`,
    ];
    for (const source of inputs) {
      assert.equal(errors(source).filter(finding => finding.rule === 'cdn-version').length, 1);
    }
  }
  const allowed = `<script type="module">
    import thing from 'https://esm.sh/three@0.160.0';
    import('https://example.com/libs/1.2.3/module.js');
    const description = "https://example.com/unpinned";
  </script>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter">
  <!-- <script src="https://example.com/unpinned"></script> -->`;
  assert.deepEqual(errors(allowed), []);
});
