# Progress Log

Status tracking for the spectral-sourcer build (pipeline + Sample
Librarian). Updated as work lands, not just at the end.

## 2026-07-05

- Branch `claude/spectral-sourcer-6zvao0` confirmed as the working branch.
- Surveyed existing state: `pipeline/` already had a working B0 loader
  (`build_db.py` + `schema.sql`, demo source only); `web/` already had an
  npm workspace root with `packages/dcf-core` (Track A, in progress,
  unrelated to this effort). `docs/ROADMAP.md` already specified Tracks B
  and D in detail — this effort implements a focused subset of both.
- Wrote planning artifacts: `README.md`, `ARCHITECTURE.md`, `BUILD_PLAN.md`,
  `AGENT_DELEGATION.md` (this directory).
- Delegated two background subagents in parallel:
  - **Pipeline builder** — adapter architecture + real MSP/JCAMP-DX parsers
    against synthetic fixtures. Status: _in progress_.
  - **Librarian builder** — Vite+React+TS+sql.js app at
    `web/apps/librarian/`. Status: _in progress_.
- **Pipeline builder agent completed.** Refactored `pipeline/build_db.py`
  into an adapter-based orchestrator (`pipeline/adapters/base.py` contract:
  `fetch(cache_dir) -> list[Path]`, `parse(raw_paths) -> ParsedBatch`).
  Added `adapters/unc_demo.py` (refactor of the original B0 loader, no
  behavior change), `adapters/msp_library.py` and `adapters/jcamp_ftir.py`
  (B1: hand-rolled, stdlib-only parsers for NIST/SWGDRUG-style MSP text and
  JCAMP-DX, including SQZ/DIF/DUP ASDF-compressed XY decoding), tested
  against small synthetic fixtures (`pipeline/fixtures/reference/`,
  explicitly labeled as parser-validation fixtures, not real licensed
  library data). 43/43 unit tests. Independently re-verified: re-ran
  `python3 pipeline/build_db.py` (158 substances, 20 samples, 115
  detections, 5 reference spectra — no regression from baseline) and
  `python3 -m unittest discover -s pipeline/test` myself. Committed as
  `1bb5f34`.
- **Librarian builder agent completed.** Built `web/apps/librarian/`: Vite +
  React + TypeScript + sql.js, fully standalone (no dependency on
  `packages/dcf-core`/`dcf-charts`). Index/filter/FTS-search, Viewer with a
  hand-rolled SVG spectrum renderer, Compare tray with cosine similarity,
  named-library save (localStorage overlay) and `dcf-library@1` JSON
  export. Notable finding surfaced during the build: the published `sql.js`
  wasm binary has no FTS5 module compiled in, so `MATCH` queries throw at
  runtime even though the schema's FTS5 tables load and query fine
  everywhere else — handled with a substring-search fallback
  (`substanceIdsMatchingText`) that keeps search fully functional. 15/15
  vitest tests; clean `tsc --noEmit`; clean `vite build`.
- **Independent verification (this session, not just the agent's
  self-report):** re-ran typecheck/test/build myself; rebuilt
  `pipeline/drugchecking.sqlite` from scratch and served the librarian
  build with `vite preview`; drove it with Playwright (Chromium) against
  the real database:
  - Index loads 20 real samples with real detections and a real,
    chemdictionary-derived substance/class filter list — zero console/page
    errors.
  - Clicking a sample opens the Viewer: detections table, provenance panel
    (source/license/fetched_at from `sources`), chromatogram PNG link,
    streetsafe.supply link, honest empty-state copy for samples with no
    stored spectrum yet.
  - Switching to the Spectra tab and opening one of the 5 real MSP/JCAMP-DX
    reference spectra renders an actual stick plot (MS) from parsed peak
    data, with the fixture's synthetic-data disclaimer visible in the
    metadata panel.
  - Pinned two MS reference spectra to the Compare tray → overlay chart
    with a legend and a cosine-similarity matrix rendered correctly (0.00
    for two non-overlapping compounds, as expected).
  - Selected both spectra, named and saved a library → confirmed the
    record actually landed in `localStorage`
    (`dcf-librarian:libraries:v1`) and that "Export JSON" produced a file
    matching the `dcf-library@1` contract byte-for-shape, with
    `references[].source` correctly resolved from `spectra.meta` (`"MSP"`
    fallback, per the documented deviation).
  - No security anti-patterns found (`dangerouslySetInnerHTML`, `eval`,
    manual `innerHTML` assignment): none present.
- Committed the librarian app and updated planning docs; pushed to
  `claude/spectral-sourcer-6zvao0`.

## Status: both components working end-to-end

- Pipeline: `python3 pipeline/build_db.py` → `pipeline/drugchecking.sqlite`
  (real demo data + real, tested reference-spectrum parsers over synthetic
  fixtures).
- Librarian: `cd web && npm install && npm run dev --workspace=@dcf/librarian`
  → full D0-D2 loop (index, filter, search, view, compare, save, export)
  verified working against that database in an actual browser.
- Deferred, by design, and tracked in `docs/ROADMAP.md`: Track B2/B3 (live
  external source fetching, real mzML ingestion), Track D3 (visualization
  hand-off links — the Viewer has a disabled button and a pointer to this
  doc), Track C (wiring `dcf-library@1` into the 33 existing
  visualizations).

## 2026-07-05 (session 2)

- Surveyed a set of manually-unpacked reference libraries at
  `/spectra_library` (SWGDRUG 3.14, Cayman Spectral Library, NPS Discovery,
  NIST 2017/DART-MS, ENFSI, MoNA GC-MS export) against the pipeline's
  documented capacity gap (`pipeline/README.md`'s "documented, not yet
  wired to a live network fetch" row).
- Most of the library is proprietary Agilent ChemStation/NIST MS Search
  binary format (`.L` directories: `NAME.INU`, `PEAK.DBU`, etc.) or a Windows
  installer (`NIST17Demo.exe`) -- not parseable without vendor tooling or
  reverse-engineering a closed binary format, and licensing would block
  redistribution even if parsed.
- `MoNA-export-GC-MS_Spectra-json/MoNA-export-GC-MS_Spectra.json` (141MB,
  19,171 GC-MS records) stood out as the one source that is (a) plain JSON,
  no vendor format to reverse-engineer, (b) explicitly, individually
  Creative-Commons-licensed per record (CC BY / CC BY-SA / CC BY-NC-SA --
  confirmed by sampling), so genuinely redistributable unlike SWGDRUG/NIST,
  and (c) has real overlap with drug-checking-relevant substances: 38 of its
  ~20k unique compound names exactly match `chemdictionary.csv` rows,
  including cocaine, methamphetamine, morphine, codeine, and common cuts
  (caffeine, lactose, mannitol).
- Wrote `pipeline/adapters/mona_json.py` (stdlib-only, matches the existing
  adapter contract) and a real 7-record fixture
  (`pipeline/fixtures/reference/mona_sample.json`, ~62KB) covering caffeine,
  mannitol, diazepam, codeine, morphine, cocaine, acetaminophen -- each
  entry keeping its original per-record CC license in `meta.license` for
  attribution. Unlike the MSP/JCAMP fixtures, this one is real MoNA data,
  not synthetic parser-validation data.
- Added `pipeline/test/test_mona_adapter.py` (13 tests: spectrum-string
  parsing, fetch/parse shape, per-record license carried through,
  `only_names`/`limit` filtering, and an end-to-end test confirming all 7
  substances link to their existing `chemdictionary`-seeded rows with no
  duplicate substances created). Registered `MoNAJSONAdapter()` in
  `build_db.py`'s `ADAPTERS` list.
- Ran `python3 -m unittest discover -s pipeline/test` (56/56 passing,
  up from 43) and `python3 pipeline/build_db.py` end-to-end: 158
  substances, 20 samples, 115 detections, **12 reference spectra** (up
  from 5) -- confirmed by querying the built `.sqlite` directly that all 7
  MoNA rows have correct `technique='MS'`, `role='reference'`,
  `format_origin='MoNA-JSON'`, real peak lists (3-255 points depending on
  the compound), and their genuine per-record license in `meta.license`.
- Adapter accepts `mona_path=`/`only_names=`/`limit=` so a future session
  can point it at the full 19k-record export (kept out of the repo/fixture
  for size, not committed) to widen coverage past this 7-substance sample --
  `fetch()`/`parse()` don't change, same extension pattern as MSP/JCAMP.

<!-- Append further dated entries below as work lands. -->
