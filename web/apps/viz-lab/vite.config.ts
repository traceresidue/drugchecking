import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..', '..');

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@critiques': path.join(repoRoot, 'visualization-framework', 'src', 'design', 'critiques.json'),
      '@dcf/core': path.join(repoRoot, 'web', 'packages', 'dcf-core', 'dist', 'index.js'),
    },
  },
  server: {
    port: 5184,
    fs: { allow: [repoRoot], strict: true },
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          d3: ['d3'],
          plotly: ['plotly.js-dist-min'],
          three: ['three'],
        },
      },
    },
  },
});
