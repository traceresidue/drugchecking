#!/usr/bin/env node
import { existsSync, mkdirSync, copyFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, '..');
const repoRoot = path.resolve(appRoot, '..', '..', '..');
const publicDir = path.join(appRoot, 'public');
const dataDir = path.join(publicDir, 'data');

mkdirSync(dataDir, { recursive: true });

const dbSrc = path.join(repoRoot, 'pipeline', 'drugchecking.sqlite');
const dbDest = path.join(publicDir, 'drugchecking.sqlite');
if (existsSync(dbSrc)) {
  copyFileSync(dbSrc, dbDest);
  const { size } = statSync(dbDest);
  console.log(`[viz-lab] copied sqlite (${(size / 1024).toFixed(1)} KiB)`);
} else {
  console.log('[viz-lab] pipeline/drugchecking.sqlite not found — run python pipeline/build_db.py');
}

for (const name of ['aggregates.json', 'spectra.json']) {
  const src = path.join(repoRoot, 'visualization-framework', 'data', name);
  const dest = path.join(dataDir, name);
  if (existsSync(src)) {
    copyFileSync(src, dest);
    console.log(`[viz-lab] copied ${name}`);
  }
}
