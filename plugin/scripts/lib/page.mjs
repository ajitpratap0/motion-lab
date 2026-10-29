import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';

async function waitForReadiness(page) {
  const readinessStarted = Date.now();
  await page.waitForFunction(
    () => window.__ready === undefined || Boolean(window.__ready),
    undefined,
    {timeout: 30000}
  );
  await page.evaluate(async timeout => {
    let timer;
    try {
      await Promise.race([
        Promise.all([Promise.resolve(window.__ready), document.fonts?.ready]),
        new Promise((resolve, reject) => {
          timer = setTimeout(() => {
            reject(new Error('Render readiness timed out after 30 seconds'));
          }, timeout);
        })
      ]);
    } finally {
      clearTimeout(timer);
    }
  }, Math.max(1, 30000 - (Date.now() - readinessStarted)));
}

/** Prefer the invoking project's Playwright before the plugin peer dependency. */
export async function loadPlaywright() {
  try {
    const projectRequire = createRequire(path.join(process.cwd(), 'noop.js'));
    const playwright = await import(pathToFileURL(projectRequire.resolve('playwright')).href);
    return playwright.default ?? playwright;
  } catch {
    try {
      const playwright = await import('playwright');
      return playwright.default ?? playwright;
    } catch {
      const error = new Error(
        'motion-lab: playwright not found. Run: npm i -D playwright '
          + '&& npx playwright install chromium'
      );
      error.exitCode = 2;
      throw error;
    }
  }
}

/** Open Chromium and await the render contract's readiness signals. */
export async function openPage(file, {width = 1080, height = 1080, scale = 1, gpu = false} = {}) {
  const {chromium} = await loadPlaywright();
  const args = gpu
    ? ['--headless=new', '--use-angle=default', '--enable-gpu', '--ignore-gpu-blocklist']
    : ['--use-angle=swiftshader', '--disable-gpu'];
  const browser = await chromium.launch({headless: true, args});
  try {
    const page = await browser.newPage({viewport: {width, height}, deviceScaleFactor: scale});
    // Open with ?t=0 so scenes take their frozen branch and never start a live preview loop that would
    // redraw between freeze() and the screenshot.
    const url = pathToFileURL(path.resolve(file));
    url.searchParams.set('t', '0');
    await page.goto(url.href, {waitUntil: 'load', timeout: 30000});
    await waitForReadiness(page);
    return {browser, page, close: () => browser.close()};
  } catch (error) {
    await browser.close();
    throw error;
  }
}

/** Draw at the requested time, seek animations, and wait two animation ticks. */
export async function freeze(page, time) {
  await page.evaluate(async renderTime => {
    if (typeof window.renderAt === 'function') await window.renderAt(renderTime);
    for (const animation of document.getAnimations()) {
      animation.pause();
      animation.currentTime = renderTime * 1000;
    }
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }, time);
}

/** Run a callback with a ready page and always close its browser afterward. */
export async function withPage(file, options, callback) {
  const opened = await openPage(file, options);
  try {
    return await callback(opened.page);
  } finally {
    await opened.close();
  }
}

/** Average sRGB byte buffers through the IEC 61966-2-1 transfer function. */
export function linearAverage(samples) {
  if (!samples.length || samples.some(sample => sample.length !== samples[0].length)) {
    throw new Error('Subframe buffers must have matching lengths');
  }
  const result = Buffer.alloc(samples[0].length);
  for (let index = 0; index < result.length; index++) {
    let sum = 0;
    for (const sample of samples) {
      const value = sample[index] / 255;
      sum += value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    }
    const mean = sum / samples.length;
    result[index] = Math.round(
      255 * (mean <= 0.0031308 ? mean * 12.92 : 1.055 * mean ** (1 / 2.4) - 0.055)
    );
  }
  return result;
}
