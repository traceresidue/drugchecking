#!/usr/bin/env node
/**
 * Capture review previews for all viz-lab routes.
 * Usage: npm run build && node scripts/capture-previews.mjs
 * Requires: playwright (devDependency), vite preview on port 4173
 */
import { spawn } from 'node:child_process';
import { mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROUTES = [
  '01-mirror-match',
  '02-chromatogram-explorer',
  '03-ftir-overlay',
  '05-chromatogram-3d',
  '06-spectral-ridgeline',
  '07-ftir-waterfall',
  '09-sonification',
  '11-supply-streamgraph',
  '12-cooccurrence-chord',
  '13-expected-detected-sankey',
  '14-horizon-wall',
  '15-emergence-beeswarm',
  '16-supply-terrain-3d',
  '17-adulterant-network',
  '18-result-card',
  '19-expected-reality-gap',
  '21-geo-tilegrid',
  '22-xylazine-spread',
  '24-anatomy-scrolly',
  'chromatogram-sample-3d',
];

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, '..');
const outDir = path.join(appRoot, 'review-previews');
const PORT = Number(process.env.VIZ_PREVIEW_PORT) || 4175;
const BASE = `http://localhost:${PORT}`;

mkdirSync(outDir, { recursive: true });

function startPreview() {
  return new Promise((resolve, reject) => {
    const viteBin = resolveViteBin();
    if (!viteBin) {
      reject(new Error('vite not found — run npm install from web/'));
      return;
    }

    const child = spawn(process.execPath, [viteBin, 'preview', '--port', String(PORT), '--strictPort'], {
      cwd: appRoot,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const onData = (chunk) => {
      const text = chunk.toString();
      process.stderr.write(text);
      if (text.includes('Local:')) resolve(child);
    };

    child.stdout?.on('data', onData);
    child.stderr?.on('data', onData);
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code && code !== 0) reject(new Error(`preview exited ${code}`));
    });

    setTimeout(() => reject(new Error('preview server timeout')), 45000);
  });
}

function resolveViteBin() {
  const candidates = [
    path.join(appRoot, 'node_modules', 'vite', 'bin', 'vite.js'),
    path.join(appRoot, '..', '..', 'node_modules', 'vite', 'bin', 'vite.js'),
  ];
  return candidates.find((p) => existsSync(p)) ?? null;
}

const preview = await startPreview();
await new Promise((r) => setTimeout(r, 800));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1180, height: 900 } });

  for (const id of ROUTES) {
    const url = `${BASE}/viz/${id}`;
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(1500);
    const stage = page.locator('.viz-stage');
    const out = path.join(outDir, `${id}.png`);
    if (await stage.count()) {
      await stage.screenshot({ path: out });
    } else {
      await page.screenshot({ path: out, fullPage: true });
    }
    console.log('ok', path.basename(out));
  }

  await browser.close();
  console.log(`Wrote ${ROUTES.length} previews to ${outDir}`);
  preview.kill('SIGTERM');
