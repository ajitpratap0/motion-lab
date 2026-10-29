import {mkdir, readdir, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';

/** Remove stale full-sequence frames and record the exact output contract. */
export async function prepareRenderOutput(directory, metadata, {selected = false} = {}) {
  await mkdir(directory, {recursive: true});
  if (selected) return;
  for (const name of await readdir(directory)) {
    if (/^\d{4}\.png$/.test(name) && Number(name.slice(0, 4)) >= metadata.count) {
      await rm(path.join(directory, name));
    }
  }
  await writeFile(path.join(directory, 'frames.json'), JSON.stringify(metadata, null, 2));
}
