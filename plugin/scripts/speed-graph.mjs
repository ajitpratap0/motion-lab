import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { cli, ensureParent } from './lib/args.mjs';
import { lineChart } from './lib/svg.mjs';
import { analyzeSeries } from './lib/analysis.mjs';
import { withPage } from './lib/page.mjs';

// The SVG namespace is an identifier, not a URL anything fetches.
const SVG_NS = ['http:', '', 'www.w3.org', '2000', 'svg'].join('/');

const usage = 'Usage: node scripts/speed-graph.mjs [--probe out/probe.json] '
  + '--keys x,scale [--linear-ok rotorAngle] [--out out/speed.svg] [--png] [--json]\n'
  + '--linear-ok marks linear runs on keys the prompt declares linear as intended.';

function stackCharts(charts) {
  const height = charts.length * 400;
  const groups = charts.map((chart, index) => (
    `<g transform="translate(0 ${index * 400})">${chart}</g>`
  )).join('');

  return `<svg xmlns="${SVG_NS}" width="1200" `
    + `height="${height}" viewBox="0 0 1200 ${height}">${groups}</svg>`;
}

async function rasterize(svgFile, chartCount) {
  const raster = svgFile.replace(/\.svg$/i, '') + '.png';
  await withPage(svgFile, { width: 1200, height: chartCount * 400 }, async page => {
    await page.screenshot({ path: raster });
  });
  return raster;
}

/** Plot each probe series and its deltas, returning paths and motion findings. */
export async function speedGraph({
  probe = 'out/probe.json',
  keys,
  out = 'out/speed.svg',
  png = false,
  linearOk = [],
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
  for (const series of keys) {
    const result = analyzeSeries(data.frames.map(frame => frame[series]), series);
    const intended = linearOk.includes(series);
    findings.push(...result.findings.map(finding => (
      intended && finding.type === 'linear-run' ? { ...finding, intended: true } : finding
    )));
    charts.push(lineChart({
      series: [
        { name: series, values: result.values },
        { name: `${series} delta/frame`, values: result.delta },
      ],
      marks: result.findings,
      xLabel: 'Frame',
      yLabel: series,
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
    linearOk: typeof args['linear-ok'] === 'string' ? args['linear-ok'].split(',') : [],
  });
}

const isMain = process.argv[1]
  && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  await cli(usage, runSpeedGraph);
}
