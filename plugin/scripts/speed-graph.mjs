import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { cli, ensureParent } from './lib/args.mjs';
import { lineChart } from './lib/svg.mjs';
import { analyzeSeries } from './lib/analysis.mjs';
import { withPage } from './lib/page.mjs';

const usage = 'Usage: node scripts/speed-graph.mjs [--probe out/probe.json] '
  + '--keys x,scale [--out out/speed.svg] [--png] [--json]';

function stackCharts(charts) {
  const height = charts.length * 400;
  const groups = charts.map((chart, index) => (
    `<g transform="translate(0 ${index * 400})">${chart}</g>`
  )).join('');

  return '<svg xmlns="http://www.w3.org/2000/svg" width="1200" '
    + `height="${height}" viewBox="0 0 1200 ${height}">${groups}</svg>`;
}

async function rasterize(svgFile, chartCount) {
  const raster = svgFile.replace(/\.svg$/i, '') + '.png';
  await withPage(svgFile, { width: 1200, height: chartCount * 400 }, async page => {
    await page.screenshot({ path: raster });
  });
  return raster;
}

/** Plot each probe key and its deltas, returning paths and motion findings. */
export async function speedGraph({
  probe = 'out/probe.json',
  keys,
  out = 'out/speed.svg',
  png = false,
}) {
  const data = JSON.parse(await readFile(probe, 'utf8'));
  if (!Array.isArray(data.frames) || !data.frames.length) {
    throw new Error('Probe frames must be a nonempty array');
  }
  if (!keys?.length) {
    throw new Error('--keys requires comma-separated probe keys');
  }

  const findings = [];
  const charts = [];
  for (const key of keys) {
    const result = analyzeSeries(data.frames.map(frame => frame[key]), key);
    findings.push(...result.findings);
    charts.push(lineChart({
      series: [
        { name: key, values: result.values },
        { name: `${key} delta/frame`, values: result.delta },
      ],
      marks: result.findings,
      xLabel: 'Frame',
      yLabel: key,
    }));
  }

  await ensureParent(out);
  await writeFile(out, stackCharts(charts));
  const raster = png ? await rasterize(out, charts.length) : undefined;
  return {
    out: path.resolve(out),
    ...(raster ? { png: path.resolve(raster) } : {}),
    findings,
  };
}

function runSpeedGraph(args) {
  return speedGraph({
    probe: args.probe,
    keys: typeof args.keys === 'string' ? args.keys.split(',') : [],
    out: args.out,
    png: Boolean(args.png),
  });
}

const isMain = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  await cli(usage, runSpeedGraph);
}
