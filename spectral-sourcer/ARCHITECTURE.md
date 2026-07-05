# Architecture: Pipeline + Sample Librarian

This is the technical reference for the two components under
[`spectral-sourcer/`](README.md). It describes how they work today and how
they're meant to be extended. For the broader multi-track plan this is
carved out of, see [`docs/ROADMAP.md`](../docs/ROADMAP.md) Tracks B and D.

---

## Part 1 — The Pipeline (`pipeline/`)

### Goal

Produce one artifact, `pipeline/drugchecking.sqlite`, that fully describes:
samples and their detections (real drug-checking results), and spectra —
both `role='sample'` (tied to a real sample) and `role='reference'`
(authoritative library spectra used for comparison/identification).

### Stages

```
fetch   → parse   → normalize        → validate           → load               → export
(cache   (format-  (substance-name    (schema + sanity:    (drugchecking       (aggregates /
 raw      specific   resolution        monotonic x,          .sqlite, idempotent  spectra JSON
 files)   parsers)   against            peak-count            upserts keyed by     for viz apps —
                     chemdictionary;    bounds, license       source+external_id)  future work, not
                     peaks normalized   present)                                  required for the
                     0-1 where                                                    Librarian, which
                     applicable)                                                  reads SQLite
                                                                                   directly)
```

Every adapter is a self-contained unit implementing one contract
(`pipeline/adapters/base.py`): it knows how to fetch its own raw input (from
a local cache directory, or bundled fixtures for sources that aren't wired
to a live network endpoint yet) and how to parse that input into plain
records — substances, samples, detections, spectra — keyed the same way
`schema.sql` expects. The orchestrator (`pipeline/build_db.py`) loads the
schema once, then runs each registered adapter in turn, then populates FTS.

This mirrors the existing repo convention (`build_db.py` was already
written this way for the one demo source) rather than introducing a new
framework — adapters are small, readable Python modules, stdlib only.

### Canonical open formats

| Data | Format | Why |
|---|---|---|
| Raw MS / GC–MS runs | mzML (HUPO-PSI) | Vendor-neutral; convertible from Xcalibur/other vendor formats via `msconvert`. Not yet ingested (Track B3 — needs real lab raw-file access). |
| Reference EI/MS spectra | MSP (NIST text) | The lingua franca of GC–MS reference libraries (SWGDRUG ships MSP). Simple line-oriented text — hand-rollable parser, no dependency. |
| FTIR reference spectra | JCAMP-DX | The open, ASTM/IUPAC-documented IR exchange format; NIST WebBook exports in it. Hand-rollable parser for the common plain-XY and `(X++(Y..Y))` ASDF-compressed forms. |
| Tabular results | CSV (existing) + SQLite | SQLite is the queryable aggregate of everything else; CSV stays the existing public distribution format for `datasets/`. |

### What's real vs. what's a documented stub, today

- **Real, tested, running today:** the demo source (`chemdictionary` →
  `substances`, `datasets/analysis_dataset.csv` → `samples`,
  `datasets/lab_detail.csv` → `detections`), and MSP / JCAMP-DX **parsers**
  that are exercised against small, hand-authored fixture files
  (`pipeline/fixtures/reference/`) — clearly labeled as synthetic
  fixtures for parser validation, not redistributed SWGDRUG/NIST content.
- **Documented, not yet wired to a live network fetch:** pulling real
  SWGDRUG MSP exports, NIST WebBook JCAMP-DX pages, DrugsData/Toronto
  DCS/WEDINOS community results. The adapter contract is exactly the shape
  a future `fetch()` implementation needs to fill in — swap the fixture
  read for an HTTP call plus a cache write, the `parse()` side doesn't
  change. This is intentional: scraping external, sometimes-licensed data
  sources is a separate decision (network reliability, terms-of-service,
  attribution) from having a correct, tested parser for the format they
  publish in.

### Provenance

Every row that didn't originate in this repo's own `datasets/` traces back
to a `sources` row: name, url, license, terms, fetch timestamp. This is
non-negotiable per the repo's harm-reduction data ethics (see root
`README.md`'s law-enforcement-use prohibition) — nothing downstream should
ever be unable to answer "where did this come from and under what terms."

---

## Part 2 — The Sample Librarian (`web/apps/librarian/`)

### Goal

A standalone, static, offline-capable React app that is the index and
staging area between the pipeline's SQLite output and the visualization
framework (or any other consumer). No server; no backend; no required
network access once loaded.

### Stack

Vite + React + TypeScript + `sql.js` (SQLite compiled to WASM, runs the
actual `.sqlite` file's bytes in-browser). This matches
`docs/ROADMAP.md` Track D's stack choice exactly, and matches the rest of
this repo's offline-first bias (the 33 standalone visualizations in
`visualization-framework/viz/` open via `file://`).

**Deliberately not built on `packages/dcf-core` / `packages/dcf-charts`.**
Those are Track A's in-progress port of the visualization framework's
shared design-system code, and depending on them here would make the
Librarian's completion contingent on an unrelated, still-moving piece of
work. The Librarian owns its own small spectrum-rendering code. If Track A
finishes `dcf-charts` later, swapping the Librarian's internal chart
components for the shared ones is a self-contained follow-up, not a
prerequisite.

### Data flow

```
pipeline/drugchecking.sqlite
        │
        │  (dev: copied into web/apps/librarian/public/ by a pre-dev/pre-build
        │   script if present; always: "Open database file…" <input type=file>
        │   works with any .sqlite the user points at — this is the reliable path)
        ▼
sql.js (WASM) running in the browser tab
        │
        │  SQL queries: facet filters, FTS5 search, sample/spectrum detail lookups
        ▼
React UI: Index table → Viewer → Compare tray → named Library
        │
        │  (local overlay only — never mutates the loaded DB)
        ▼
Browser storage (IndexedDB/localStorage) for named libraries
        │
        │  export
        ▼
dcf-library@1 JSON (the hand-off contract consumed by visualization-framework
pages in a future Track C phase, and importable back into the Librarian)
```

### The `dcf-library@1` hand-off contract

```json
{
  "schema": "dcf-library@1",
  "name": "…", "created": "ISO-8601",
  "samples":    [{ "sample_id": "…", "detections": [...], "spectra": ["spectrum_id"] }],
  "references": [{ "substance": "…", "spectrum_id": "…", "source": "SWGDRUG" }],
  "spectra":    [{ "spectrum_id": "…", "technique": "GCMS", "peaks": [[x, y]], "meta": {} }]
}
```

This is a data contract, not an API — any tool that can read/write this
JSON shape can hand libraries to or from the Librarian. It's what lets
"select → name → save" in the Librarian eventually become "open in
Mirror Match / Chromatogram Explorer" in the visualization framework
(Track C, deferred — out of scope for this build).

### Local overlay, never the source DB

The loaded `.sqlite` is treated as read-only — it's a published,
versioned artifact. All user state (selections, named libraries, compare
tray) lives in a separate browser-local overlay. This means: opening the
same released database twice on two machines never conflicts, and
regenerating the pipeline's database never destroys a user's saved
libraries.

---

## Extending this

- **New pipeline source:** implement the `Adapter` contract in
  `pipeline/adapters/`, register it in `build_db.py`. See
  `pipeline/README.md` for the exact interface.
- **New Librarian facet/view:** add a query in `src/db/queries.ts` and a
  component in `src/components/`; the schema and the local-overlay
  boundary are the only two things that shouldn't move.
- **Wiring a real network source (B2/B3):** replace an adapter's `fetch()`
  fixture-read with a real HTTP call plus a `cache/raw/<source_id>/` write;
  `parse()` and everything downstream is unaffected.
