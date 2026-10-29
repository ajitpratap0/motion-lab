import {cli, number, ensureParent} from './lib/args.mjs';
import {frameFiles} from './lib/image.mjs';
import {renderContactSheet} from './lib/contact-sheet.mjs';

const usage = 'contact-sheet.mjs [--frames out/frames] [--every 12] [--cols 4] ' +
  '[--width 400] [--labels] [--out out/contact.png]';

async function createContactSheet(args) {
  const files = await frameFiles(args.frames ?? 'out/frames');
  const every = number(args, 'every', 12, {min: 1, integer: true});
  const cols = number(args, 'cols', 4, {min: 1, integer: true});
  const width = number(args, 'width', 400, {min: 1, integer: true});
  const selected = files.filter((_, index) => index % every === 0);
  if (!selected.length) throw new Error('No PNG frames found');
  const out = args.out ?? 'out/contact.png';
  await ensureParent(out);
  const labels = await renderContactSheet(selected, {
    cols, width, out, labels: Boolean(args.labels),
  });
  return {out, frames: selected.length, cols, rows: Math.ceil(selected.length / cols), labels};
}

await cli(usage, createContactSheet);
