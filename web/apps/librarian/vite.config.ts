import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Standalone Vite app -- deliberately does not touch packages/dcf-core or
// packages/dcf-charts (see README.md "Independence" section).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5183,
    fs: {
      // sql.js's wasm asset is resolved via `?url` from node_modules; keep the
      // default (workspace-root-relative) allow list rather than narrowing it.
      strict: true,
    },
  },
  build: {
    target: 'es2020',
  },
});
