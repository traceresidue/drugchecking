import * as esbuild from 'esbuild';

const shared = {
  bundle: true,
  format: 'esm',
  target: 'es2020',
  minify: false,
  outdir: 'dist',
};

// Public typed API for TS/React consumers (packages/dcf-charts, apps/*).
await esbuild.build({
  ...shared,
  entryPoints: { index: 'src/index.ts' },
});

// Flat ESM artifact for build.py: kept as top-level `export {...}` (no bundling
// of a runtime, no minify) so its regex-based globalize() step can strip the
// exports and expose window.DCF unchanged.
await esbuild.build({
  ...shared,
  entryPoints: { shared: 'src/shared-entry.ts' },
  bundle: true,
  minify: false,
});

console.log('dcf-core build complete');
