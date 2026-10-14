#!/usr/bin/env node
// predev/prebuild step: copy the pipeline-built SQLite database into public/
// so Vite can serve it as a static asset (fetch('/drugchecking.sqlite')).
//
// The browser can't reach outside its served root, so we can't fetch
// ../../../pipeline/drugchecking.sqlite directly -- this copy is the bridge.
// If the file doesn't exist yet, we skip quietly: the app always falls back
// to the "Open database file..." picker, which works with zero setup.
import { existsSync, mkdirSync, copyFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, '..');
const repoRoot = path.resolve(appRoot, '..', '..', '..');
const src = path.join(repoRoot, 'pipeline', 'drugchecking.sqlite');
const destDir = path.join(appRoot, 'public');
const dest = path.join(destDir, 'drugchecking.sqlite');

if (!existsSync(src)) {
  console.log(
    '[librarian] pipeline/drugchecking.sqlite not found.\n' +
      '  Run `python3 pipeline/build_db.py` from the repo root to generate it, then\n' +
      '  re-run `npm run dev`/`npm run build`. Until then, use the in-app\n' +
      '  "Open database file..." picker -- it works with no setup.'
  );
  process.exit(0);
}

mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);
const { size } = statSync(dest);
console.log(`[librarian] copied ${src} -> ${dest} (${(size / 1024).toFixed(1)} KiB)`);
