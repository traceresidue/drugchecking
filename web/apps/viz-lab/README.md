# Visualization Lab

React + Vite app curating 20 Design Lab visualizations with unified dark tokens and live pipeline data.

## Quick start

```bash
# From repo root — build sqlite if needed
python pipeline/build_db.py
python pipeline/export_viz_data.py

cd web/apps/viz-lab
npm run dev    # http://localhost:5184
```

## Data

- `public/drugchecking.sqlite` — copied from `pipeline/` at predev/prebuild (sql.js)
- `public/data/aggregates.json` — 6,580-sample supply/geo aggregates
- `public/data/spectra.json` — chromatogram archetypes + real cohort exports

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Dev server with asset copy |
| `npm run build` | Production build |
| `npm run capture` | Playwright screenshots → `review-previews/` |
| `npm run typecheck` | TypeScript check |

## Architecture

- `@dcf/core` — classify, spectral synthesis, formatting
- `src/theme.css` — single dark design system (no palette toggles)
- `src/pages/*` — lazy-loaded visualization routes
- `CRITIQUE_STATUS.md` — design weakness re-assessment

## Curated set (20)

MS · GC–MS · FTIR · SUPPLY · RESULT · GEO · EXPERIMENTAL — see home grid or sidebar.

**Excluded from migration:** 04, 06b, 06c, 08, 10, 12c, 17b, 17c, 20, 23, 25, 26–28, 33.
