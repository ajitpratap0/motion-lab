import {readFile, writeFile} from 'node:fs/promises';
import {cli} from './lib/args.mjs';
import {loadProjectConfig, resolveProjectOptions} from './lib/project.mjs';

async function injectCommand(args) {
  const {file} = resolveProjectOptions(args, await loadProjectConfig());
  const original = await readFile(file, 'utf8');
  const pattern = /<!-- motion-lab:freeze-hook -->[\s\S]*?<!-- \/motion-lab:freeze-hook -->/g;
  let html = original.replace(pattern, '');
  if (!args.remove) {
    const script = await readFile(new URL('./freeze-hook.js', import.meta.url), 'utf8');
    const hook = '<!-- motion-lab:freeze-hook -->\n<script>\n'
      + script + '\n</script>\n<!-- /motion-lab:freeze-hook -->';
    if (!/<\/body\s*>/i.test(html)) throw new Error('HTML must contain a closing </body> tag');
    html = html.replace(/<\/body\s*>/i, match => hook + match);
  }
  await writeFile(file, html);
  return {file, removed: Boolean(args.remove), changed: html !== original};
}

await cli('inject.mjs <file.html> [--remove] [--json]\n'
  + 'Defaults come from motion-lab.json when present.', injectCommand);
