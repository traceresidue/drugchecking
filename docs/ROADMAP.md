# Expansion Roadmap: JS/React, Spectral Data Pipeline, and the Sample Librarian

This roadmap expands the repository from a static-data, Python-built visualization framework into a system that (a) treats JavaScript and React as first-class frameworks, (b) automatically sources real GC–MS / MS / FTIR data and authoritative reference spectra into open formats, and (c) lets users explore, select, name, and load sample sets into the visualizations through a lightweight SQLite-backed React viewer.

Companion documents: [ARCHITECTURE.md](ARCHITECTURE.md) (current state). A rendered artifact series with full detail accompanies this plan.

**Core project goal served throughout:** deliver timely, honest, actionable drug-checking results to the people and programs that need them — with visualizations populated by *real* sample results compared against *authoritative* references, not illustrative stand-ins.

---

## Track A — JS + React enablement

**Principle: additive, not destructive.** Standalone single-file HTML remains a supported distribution format (harm-reduction orgs open these offline). React is added for stateful apps; the existing 33 visualizations keep working throughout.

### Target layout

```
web/                          # new npm-workspaces monorepo root
  package.json                # workspaces: packages/*, apps/*
  packages/
    dcf-core/                 # port of viz/_shared.js: TOKENS, classify(), fmt,
                              # spectral synthesis; pure ESM, zero deps
    dcf-data/                 # data contracts: TS types for samples/detections/spectra,
                              # SQLite (sql.js) + JSON loaders, library import/export
    dcf-charts/               # React wrappers over D3/Plotly: <Chromatogram/>,
                              # <MirrorMatch/>, <FtirOverlay/>, hooks (useSpectrum, useTooltip)
  apps/
    librarian/                # Track D: React + SQLite index/viewer
    studio/                   # Track C: new linked-view exploratory app
  pipeline/                   # Track B: ingestion (Python + Node)
visualization-framework/      # unchanged during migration; build target of the new core
```

### Phases

| Phase | Work | Exit criterion |
|-------|------|----------------|
| A0 | Scaffold `web/` workspace: Vite, TypeScript (strict for new code), Vitest, ESLint/Prettier, Playwright reused from `visualization-framework/test` | `npm test` green in CI |
| A1 | Extract `_shared.js` → `packages/dcf-core` as typed ESM with unit tests; `build.py` consumes the built artifact so existing 33 viz keep byte-identical behavior | `python3 build.py && node test/check.js` still 0 failures |
| A2 | `packages/dcf-data`: canonical schema + loaders (JSON slices today, SQLite tomorrow); generate substance-class types from `chemdictionary.csv` | Existing `aggregates.json` round-trips through typed loaders |
| A3 | `packages/dcf-charts`: React components wrapping the highest-reuse D3 idioms (chromatogram trace, stick spectrum, FTIR curve, mirror plot); Storybook-style gallery page | 6+ chart components rendering real data |
| A4 | Node build path: replace `build.py` with `build.mjs` (esbuild + single-file inlining) emitting the same standalone HTML; keep `build.py` until output parity is verified by the Playwright suite | Parity: 33/33 pages pass; `build.py` retired |
| A5 | CI/CD: GitHub Actions (typecheck, unit, Playwright, build); Vercel deploys `apps/*` alongside the static `viz/` | One-command release |

**Why Vite + npm workspaces (and not Next.js):** the deliverables are static, offline-capable pages and small client-side apps reading SQLite in the browser — no server rendering, no backend. `vite-plugin-singlefile` preserves the single-file HTML distribution for any new visualization that wants it.

---

## Track B — Automated spectral data sourcing & storage pipeline

**Goal:** a repeatable pipeline that fetches diverse GC–MS, MS, and FTIR data plus authoritative reference spectra, converts disparate origin formats into open formats, and stores everything in SQLite for the viewer and visualizations to draw from.

### Canonical open formats

| Data | Canonical format | Notes |
|------|------------------|-------|
| Raw MS / GC–MS runs | **mzML** (HUPO-PSI) | convert vendor formats via ProteoWizard `msconvert`; legacy ANDI/netCDF accepted |
| Reference EI/MS spectra & libraries | **MSP** (NIST text) | the lingua franca of GC–MS libraries (SWGDRUG ships MSP); MGF for peak lists |
| FTIR / IR spectra | **JCAMP-DX** | the open IR standard; parse with `jcamp` (Python) |
| Tabular results | **CSV** (existing) + **SQLite** | SQLite is the queryable aggregate of everything below |
| Structures | **SMILES / InChIKey** | resolved via PubChem CID already present in `lab_detail` |

### Sources (adapters, one module each)

| Source | Technique | Access | Adapter output |
|--------|-----------|--------|----------------|
| This repo (`datasets/`, `spectra/`) | GC–MS results + chromatogram PNGs | local | samples, detections; PNG provenance link |
| UNC lab exports (when available) | GC–MS raw | internal drop | mzML via msconvert |
| SWGDRUG MS Library | reference EI-MS | free MSP download | reference spectra (authoritative) |
| Cayman Chemical spectral library | reference MS | free downloads | reference spectra |
| MassBank / MoNA | reference MS/MS + EI | open (MSP/JSON export, REST) | reference spectra |
| NIST WebBook | reference IR | JCAMP-DX per compound | FTIR references |
| DrugsData.org | community GC–MS results | public HTML tables | samples + detections (scrape, cached, rate-limited) |
| Toronto Drug Checking Service | community results | open data / API | samples + detections |
| WEDINOS | community results | published PDF/CSV | samples + detections |
| NPS Discovery (CFSRE) | monographs w/ GC–MS + FTIR | public PDFs | reference spectra + alerts metadata |

Every record carries `source_id`, license/terms, retrieval timestamp, and original-format blob for reproducibility. Respect each source's terms; the repo's law-enforcement prohibition and attribution norms apply to redistributed data.

### SQLite schema (v1)

```sql
sources(source_id PK, name, url, license, terms, fetched_at)
substances(substance_id PK, name, pubchem_cid, cas, unii, smiles, classes JSON)  -- seeded from chemdictionary
samples(sample_id PK, source_id FK, external_id, program, state, county_fips,
        date_collected, expected, color, texture, notes)
detections(detection_id PK, sample_id FK, substance_id FK, method, abundance, rt, confidence)
spectra(spectrum_id PK, sample_id FK NULL, substance_id FK NULL, technique,   -- 'GCMS'|'MS'|'FTIR'
        role,                                                                 -- 'sample'|'reference'
        format_origin, peaks JSON,      -- [[x,y],...] normalized
        meta JSON, raw BLOB)            -- original mzML/MSP/JCAMP chunk
libraries(library_id PK, name, description, created_at, kind)                 -- named sets
library_members(library_id FK, spectrum_id FK NULL, sample_id FK NULL, position)
-- plus FTS5 virtual tables over substances.name and samples.notes
```

### Pipeline stages

```
fetch (per-source adapter, cached ./cache/raw/) 
  → parse (mzML: pyteomics|matchms; MSP/MGF: matchms; JCAMP: jcamp; HTML/CSV: bespoke)
  → normalize (substance-name resolution against chemdictionary + PubChem CID; peak arrays
     normalized 0–1; RT alignment metadata kept, never destructive)
  → validate (schema + sanity: monotonic x, peak count bounds, license present)
  → load (drugchecking.sqlite; idempotent upserts keyed by source+external_id)
  → export (data/aggregates.json refreshed from SQL; data/spectra.json now REAL where
     available; per-library JSON for the viz apps)
  → rebuild + test (build.mjs, Playwright)
```

Scheduling: GitHub Actions cron (weekly per external source, on-push for local data). The published artifact is a versioned `drugchecking.sqlite` (plus JSON exports) attached to releases — small enough to load in-browser via sql.js.

### Phases

| Phase | Work |
|-------|------|
| B0 | Schema + `pipeline/` scaffold; seed `substances` from chemdictionary; load existing CSVs (samples/detections) |
| B1 | Reference libraries: SWGDRUG MSP + NIST WebBook JCAMP adapters → `spectra(role='reference')` |
| B2 | Community sources: DrugsData, Toronto DCS adapters; provenance + license tables enforced |
| B3 | Real sample spectra: mzML ingestion path (msconvert + pyteomics) for lab exports; retention-time ↔ `unc_gcms.gcms_peak` linkage |
| B4 | Exports wired into the viz build; `spectra.json` illustrative entries replaced by real/reference data with provenance labels |

---

## Track C — Visualization expansion (building on the 33)

1. **Real-data upgrades to existing viz** (once B1/B4 land): Mirror Match compares a *real* sample spectrum against SWGDRUG references with cosine score; Chromatogram Explorer loads real peak tables (`unc_gcms.gcms_peak`); FTIR Overlay draws NIST WebBook JCAMP curves. Provenance labels switch from "illustrative" to sourced.
2. **Library-driven mode:** every spectral viz accepts a library payload (`?library=` param / `window.DCF_LIBRARY` / File open) exported by the Librarian — the hand-off contract in Track D.
3. **Interaction debt from ASSESSMENT.md:** search/filter on Emergence (15) and Network (17), county drill-down on Choropleth (21), class toggles on Streamgraph/Horizon (11/14), cosine score on Mirror Match (01), ridgeline SVG diet (06).
4. **New exploratory apps (React, `apps/studio`):** linked-view crossfilter dashboard (time × geography × class × substance); spectral similarity explorer (cosine matrix + 2-D embedding of real spectra); reference comparator (drop an unknown, rank matches); batch drift monitor (QC over time); animated supply time-lapse; WebGL point-cloud upgrades of viz 31–33.
5. **Creative/experimental continuations:** generative glyphs seeded by real sample fingerprints; sonification of real spectra; "supply weather" fed by live aggregates.

---

## Track D — The Sample Librarian (standalone React + SQLite index/viewer)

A lightweight, standalone React app (`web/apps/librarian`) — the index and staging area between the data pipeline and the visualization framework.

**Stack:** Vite + React + sql.js (SQLite compiled to WASM); loads the released `drugchecking.sqlite` over HTTP or a user-chosen local file; user state (selections, named libraries) persisted in a local overlay (OPFS/IndexedDB), never mutating the published DB. No server.

**Features:**

- **Index:** virtualized sample/spectrum table with facet filters (technique GC–MS/MS/FTIR, substance, drug class, program/state, date range, role sample/reference) + FTS search.
- **Viewer:** click a row → spectrum/chromatogram preview rendered with `dcf-charts`, detections list, chemdictionary classification, provenance panel (source, license, original format), link to the `spectra/` PNG and streetsafe record when applicable.
- **Compare tray:** pin up to N spectra; overlay/mirror preview; cosine similarity readout.
- **Select → name → save:** any selection can be saved as a named **library** (e.g. "NC fentanyl Q2-2026 vs SWGDRUG refs") stored in the local overlay DB.
- **Port to the primary app:** export a library as (a) `library.json` (the viz hand-off contract), (b) a subset `.sqlite`, or (c) direct "Open in visualization →" links that launch a framework page with the library payload.

**Library hand-off contract (v1):**

```json
{
  "schema": "dcf-library@1",
  "name": "…", "created": "ISO-8601",
  "samples":    [{ "sample_id": "…", "detections": [...], "spectra": ["spectrum_id"] }],
  "references": [{ "substance": "…", "spectrum_id": "…", "source": "SWGDRUG" }],
  "spectra":    [{ "spectrum_id": "…", "technique": "GCMS", "peaks": [[x, y]], "meta": {} }]
}
```

**Phases:** D0 static index over released SQLite → D1 viewer + compare tray → D2 libraries + export → D3 hand-off links wired into the framework pages (which learn to read `dcf-library@1`).

---

## Sequencing & dependencies

```
A0 ─ A1 ─ A2 ─┬─ A3 ─ A4 ─ A5
              │
B0 ─ B1 ──────┼── B2 ─ B3 ─ B4
              │        │
              └─ D0 ─ D1 ─ D2 ─ D3
                       │
C1 (real-data upgrades) ← B1/B4     C2 (library mode) ← D2     C3 (interaction debt): anytime
C4/C5 (studio, creative) ← A3
```

Milestone 1 (foundation): A0–A2, B0–B1 — typed core + SQLite with real references.
Milestone 2 (explore): D0–D2, C3 — browse and bundle real samples.
Milestone 3 (integrate): B4, C1–C2, D3 — visualizations draw real data; libraries flow end-to-end.
Milestone 4 (extend): A4–A5, B2–B3, C4–C5 — Node build, external sources, new exploratory apps.
