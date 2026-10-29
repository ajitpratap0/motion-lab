import path from 'node:path';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {checked, probe} from './ffmpeg.mjs';
import {frameNumber} from './image.mjs';
import {openPage} from './page.mjs';

/** Compose a contact sheet using ffmpeg, optionally burning frame numbers. */
export async function renderFFmpegSheet(files, {cols, width, out, labels = false}) {
  const filters = files.map((file, index) => {
    const label = labels
      ? `,drawtext=text='${frameNumber(file)}':x=8:y=8:fontsize=22:` +
        'fontcolor=white:box=1:boxcolor=black@0.7'
      : '';
    return `[${index}:v]scale=${width}:-1,setsar=1${label}[v${index}]`;
  });
  if (files.length === 1) {
    filters.push('[v0]null[out]');
  } else {
    const inputs = files.map((_, index) => `[v${index}]`).join('');
    const layout = files.map((_, index) => {
      const row = Math.floor(index / cols);
      return `${(index % cols) * width}_${row ? Array(row).fill('h0').join('+') : '0'}`;
    }).join('|');
    filters.push(`${inputs}xstack=inputs=${files.length}:layout=${layout}:fill=black[out]`);
  }
  await checked([
    ...files.flatMap(file => ['-i', file]), '-filter_complex', filters.join(';'),
    '-map', '[out]', '-frames:v', '1', '-y', out,
  ]);
}

/** Compose frame-number captions in Chromium when ffmpeg lacks drawtext. */
export async function renderBrowserSheet(files, {cols, width, out}) {
  const metadata = await probe(files[0]);
  if (metadata.code) throw new Error(metadata.stderr);
  const stream = metadata.data.streams.find(stream => stream.codec_type === 'video');
  const tileHeight = Math.round(stream.height * width / stream.width);
  const captionHeight = 30;
  const rows = Math.ceil(files.length / cols);
  const sheetWidth = Math.min(cols, files.length) * width;
  const sheetHeight = rows * (tileHeight + captionHeight);
  const tiles = files.map(file => {
    const url = pathToFileURL(path.resolve(file)).href.replaceAll('&', '&amp;');
    return `<figure><img src="${url}"><figcaption>${frameNumber(file)}` +
      '</figcaption></figure>';
  }).join('\n');
  const html = `<!doctype html><meta charset="utf-8"><style>
    * { box-sizing: border-box; }
    html, body { margin: 0; width: ${sheetWidth}px; height: ${sheetHeight}px; }
    body { display: grid; grid-template-columns: repeat(${Math.min(cols, files.length)},
      ${width}px); grid-auto-rows: ${tileHeight + captionHeight}px; background: black; }
    figure { margin: 0; width: ${width}px; }
    img { display: block; width: ${width}px; height: ${tileHeight}px; }
    figcaption { height: ${captionHeight}px; line-height: ${captionHeight}px;
      padding-left: 8px; background: #111; color: white; font: 20px/${captionHeight}px monospace; }
    </style>${tiles}`;
  const directory = await mkdtemp(path.join(tmpdir(), 'motion-sheet-'));
  try {
    const htmlFile = path.join(directory, 'sheet.html');
    await writeFile(htmlFile, html);
    const opened = await openPage(htmlFile, {width: sheetWidth, height: sheetHeight});
    try {
      await opened.page.evaluate(async () => {
        await Promise.all([...document.images].map(image => image.decode()));
      });
      await opened.page.screenshot({path: path.resolve(out), type: 'png'});
    } finally {
      await opened.close();
    }
  } finally {
    await rm(directory, {recursive: true, force: true});
  }
}

/** Prefer ffmpeg labels, then Chromium captions, then an explicitly warned fallback. */
export async function renderContactSheet(files, options, dependencies = {}) {
  const ffmpegRenderer = dependencies.ffmpegRenderer ?? renderFFmpegSheet;
  const browserRenderer = dependencies.browserRenderer ?? renderBrowserSheet;
  try {
    await ffmpegRenderer(files, options);
    return Boolean(options.labels);
  } catch (error) {
    if (!options.labels || !/drawtext|font|No such filter/i.test(error.message)) throw error;
  }
  console.error('motion-lab: drawtext unavailable; composing frame captions in Chromium');
  try {
    await browserRenderer(files, options);
    return true;
  } catch (error) {
    if (error.exitCode !== 2 || !/playwright not found/.test(error.message)) throw error;
    console.error('motion-lab: playwright unavailable; writing contact sheet without labels');
    await ffmpegRenderer(files, {...options, labels: false});
    return false;
  }
}
