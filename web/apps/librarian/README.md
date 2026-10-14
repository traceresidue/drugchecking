# Sample Librarian

A standalone React + SQLite (sql.js/WASM) app for browsing, comparing, and
curating GC–MS / MS / FTIR sample and reference data from
`pipeline/drugchecking.sqlite`. Implements ROADMAP.md **Track D**, phases
D0–D2 (D3 -- hand-off links into the visualization framework -- is a
documented hook, not built here; see "Open in visualization" in the Viewer).

**Independence:** this app does not import from `packages/dcf-core` or
`packages/dcf-charts`. Those are a separate, earlier-stage track. Everything
here -- the SQLite query layer, the SVG spectrum renderer, styling -- is
self-contained so the Librarian can be developed, built, and shipped on its
own timeline.

## Running it

From the repo root:

```sh
python3 pipeline/build_db.py        # generates pipeline/drugchecking.sqlite
cd web
npm install                         # installs all workspaces, including this one
npm run dev --workspace=@dcf/librarian
```

Or from this directory directly (still a workspace member, so `npm install`
at the repo's `web/` root is what actually resolves dependencies):

```sh
npm run dev          # after `npm install` has been run from web/
npm run build
npm run test
npm run typecheck
```

Then open the printed local URL. If `pipeline/drugchecking.sqlite` existed at
`predev`/`prebuild` time, it's already loaded; otherwise use the **"Open
database file…"** picker in the app (works with any `.sqlite` file, no setup
required).

## Data flow

The browser cannot fetch anything outside the app's own served root, so
`pipeline/drugchecking.sqlite` can't be read directly via a relative path.
Two paths get bytes into the app instead:

1. **Auto-copy (dev/build nicety).** `scripts/copy-db.mjs` runs as
   `predev`/`prebuild` and copies `../../../pipeline/drugchecking.sqlite` into
   `public/drugchecking.sqlite` if it exists. `src/db/loadDatabase.ts`'s
   `tryLoadDefaultDatabase()` then does a `HEAD` request for
   `/drugchecking.sqlite` at startup and loads it if present. If the pipeline
   hasn't been run yet, the copy step logs a note and exits 0 -- it never
   fails `npm install`/`npm run build`.
2. **File picker (always works).** `loadDatabaseFromFile()` reads any
   user-chosen `.sqlite`/`.db` file via `<input type="file">` and
   `File#arrayBuffer()`. This is the reliable path: it needs no build step, no
   copied asset, and works for any database the user has locally (including
   one they built themselves, or a subset extracted elsewhere).

Both paths end up in `loadDatabaseFromBytes()`, which hands the bytes to
`sql.js`'s `new SQL.Database(bytes)`. The wasm binary itself is loaded via
Vite's `?url` asset import (`sql.js/dist/sql-wasm.wasm?url`) -- no manual
copying into `public/`.

**The loaded database is always read-only.** The app never calls anything
that mutates the sql.js `Database` instance, and never writes back to the
`.sqlite` file (the browser couldn't do the latter for a fetched copy in any
case, but this holds even for a locally-opened file). All user state lives in
the local overlay described below.

## Architecture

```
src/
  main.tsx                 React root
  App.tsx                  top-level state: db handle, filters, selection,
                            pinned spectra, saved libraries; wires components
  db/
    loadDatabase.ts         sql.js init + the two loading paths above
    queries.ts              typed query helpers over the sql.js Database;
                             parses JSON columns (classes/peaks/meta) once
                             here so nothing downstream touches raw JSON text
  lib/
    types.ts                TS types mirroring pipeline/schema.sql, plus the
                             dcf-library@1 export contract and overlay types
    dates.ts                parses samples.date_collected ("DDMonYYYY", e.g.
                             "20Oct2022" -- not ISO-8601, not sortable as text)
    cosine.ts                cosine similarity between two peak lists (compare
                             tray similarity readout)
    overlay.ts               OverlayStore: local-only persistence (see below)
    exportLibrary.ts         builds the dcf-library@1 JSON from a saved
                             library, re-reading live from the DB
  components/
    Filters.tsx / SearchBox.tsx    facet filters + FTS search box
    IndexTable.tsx                 samples / spectra table, paginated
    Viewer.tsx                     sample or spectrum detail + provenance
    SpectrumChart.tsx              self-contained SVG chart (line/stick,
                                   overlay/mirror) -- no charting library
    CompareTray.tsx                pinned-spectra overlay/mirror + cosine table
    LibraryPanel.tsx               name/save/export/delete saved libraries
test/
  fixtures/makeTestDb.ts    builds a tiny in-memory DB against the *real*
                            pipeline/schema.sql, seeded with a couple of
                            samples/detections/sample+reference spectra
  *.test.ts                vitest smoke tests over queries/, lib/overlay,
                            lib/dates, lib/exportLibrary
```

### Query strategy

`pipeline/schema.sql`'s dataset is capped at "a few thousand rows"
(ROADMAP.md), so `querySamples`/`querySpectra` load the small base tables in
full (one or two `SELECT`s) and do filtering/joining in JS rather than
building dynamic SQL. Two things made this the simpler and more robust
choice over SQL-side filtering:

- `substances.classes` is a JSON array column. Whether the sql.js build in
  use has JSON1 compiled in isn't guaranteed, so class-membership filtering
  is done against the already-parsed in-memory `Map<substance_id,
  SubstanceRow>` instead of `json_each`/`json_extract`.
- `samples.date_collected` is `"DDMonYYYY"` (e.g. `"20Oct2022"`), not
  ISO-8601 -- it can't be compared as SQL text or parsed by SQLite's date
  functions. `lib/dates.ts` parses it in JS for range filtering and display.

Full-text search hits `samples_fts`/`substances_fts` (FTS5, exactly as
ROADMAP.md specifies) wrapped as a quoted phrase query so punctuation in free
text can't break MATCH syntax, and falls back to a plain substring scan over
`expected`/`program`/`external_id`/`color`/`texture` -- `samples_fts` only
indexes `notes`, which is sparse in the demo data, so the fallback keeps
search useful in practice.

**Deviation found during implementation:** the officially published `sql.js`
wasm binary (`dist/sql-wasm.wasm`, 1.14.x) is compiled **without the FTS5
module** -- `MATCH` queries against `samples_fts`/`substances_fts` throw `no
such module: fts5` at runtime, even though it happily *opens* a real
`.sqlite` file that already contains those (Python-created, populated) fts5
tables and can query every ordinary table in it fine. `searchSamplesFts` /
`searchSubstancesFts` catch that error and return an empty match set rather
than crashing, and `substanceIdsMatchingText()` provides a plain
substring-search fallback so substance-name search keeps working regardless.
Net effect: search is fully functional in this build, but via substring
matching rather than genuine FTS5 ranking/stemming for substance names (notes
search already had a substring fallback for other reasons, see above). If a
future sql.js release (or a fork) ships FTS5 support, the `MATCH` queries
above will simply start working and be used first, no code changes needed.
`test/fixtures/makeTestDb.ts` documents this in detail and strips the two
`CREATE VIRTUAL TABLE ... USING fts5(...)` statements before running
`pipeline/schema.sql` in-memory for the same reason (creating an fts5 table
from scratch needs the module too, not just querying one).

### Spectrum rendering

`components/SpectrumChart.tsx` is a small SVG renderer, built from scratch
for this app (not shared with `packages/dcf-charts`, which is a separate,
unfinished track). It renders GC–MS/FTIR peak lists as a line trace and MS
peak lists as a stick spectrum, each series independently normalized to its
own base peak (100%) the way library-search mirror plots conventionally do.
`mode="mirror"` draws exactly two series above/below a shared axis; anything
else overlays all series on one baseline. FTIR series reverse the x-axis
(4000 → 400 cm⁻¹) per the usual IR convention.

## Local overlay persistence: why localStorage, not IndexedDB

Saved libraries (`src/lib/overlay.ts`, `OverlayStore`) only ever store **ID
references** -- `sample_id[]` and `spectrum_id[]` plus a name and timestamp --
never full spectra payloads or the SQLite bytes. Even a few hundred saved
libraries stay at a few hundred KB total, nowhere near localStorage's ~5MB
per-origin quota. That makes the synchronous `localStorage` API a better fit
here than IndexedDB: no async loading states in the UI, no
transaction/versioned-upgrade boilerplate, and it's trivial to unit test by
injecting an in-memory `OverlayStorage` (see `test/overlay.test.ts`) instead
of a real `localStorage`.

If a future phase wants the overlay to cache full spectra/raw blobs (rather
than re-reading them from the loaded DB on export, as it does now), swap
`OverlayStore`'s storage backend for an IndexedDB-backed implementation
behind the same two-method `OverlayStorage` interface -- nothing else in the
app would need to change.

Either way, **the overlay is a one-way street**: the app reads the loaded
SQLite database but only ever *writes* to the overlay. Nothing is ever
written back into the sql.js `Database` instance or the on-disk `.sqlite`
file.

## Export contract

"Save as library" (`LibraryPanel`) writes an `OverlayLibrary` (id, name,
createdAt, sampleIds, spectrumIds) to the overlay. "Export JSON" then calls
`buildLibraryExport()` (`src/lib/exportLibrary.ts`), which re-reads the
referenced samples/spectra live from the loaded DB and produces exactly the
ROADMAP.md "Library hand-off contract (v1)":

```json
{
  "schema": "dcf-library@1",
  "name": "…", "created": "ISO-8601",
  "samples":    [{ "sample_id": "…", "detections": [...], "spectra": ["spectrum_id"] }],
  "references": [{ "substance": "…", "spectrum_id": "…", "source": "SWGDRUG" }],
  "spectra":    [{ "spectrum_id": "…", "technique": "GCMS", "peaks": [[x, y]], "meta": {} }]
}
```

One deviation worth flagging: `spectra.source_id` doesn't exist in the v1
schema (`pipeline/schema.sql`) -- reference spectra aren't linked to a
`sources` row the way samples are. The real reference-library adapters
(SWGDRUG MSP, NIST WebBook JCAMP-DX -- ROADMAP.md Track B, phase B1) are a
separate, parallel effort; at the time this app was built they had only just
started landing (the generated demo DB now has a handful of synthetic-fixture
`role='reference'` rows, explicitly labeled as fixtures in their own `meta`,
rather than real SWGDRUG/NIST data -- see "Known gaps" below). Their `meta`
JSON carries `cas`/`db_num`/`comment`/`source_file`, not a `source`/`library`
key, so the `source` field in each `references[]` entry is read from
`spectra.meta` (trying `meta.source`, then `meta.library`, then falling back
to `format_origin`, e.g. `"MSP"`/`"JCAMP-DX"`) rather than a join.
`test/exportLibrary.test.ts` exercises the `meta.source` case directly;
revisit the fallback order once the real B1 adapters settle on their actual
`meta` shape.

## D3 hook (out of scope here)

The Viewer includes a disabled **"Open in visualization →"** button with a
short note pointing at ROADMAP.md Track D phase D3 (the primary
visualization framework learning to read `dcf-library@1` payloads via a
`?library=` param / `window.DCF_LIBRARY` / file-open). Wiring that up is
explicitly out of scope for this build; export a library as JSON and hand it
to the framework by hand in the meantime.

## Known gaps / notes

- `pipeline/drugchecking.sqlite` as generated by `python3 pipeline/build_db.py`
  is a moving target: the MSP/JCAMP-DX reference-spectra adapters (Track B,
  phase B1) are a separate, parallel effort. At various points while building
  this app `spectra` had 0 rows; by the end it had a handful of `role`:
  `'reference'` rows explicitly marked in their own `meta.comment` as
  "synthetic fixture peak list for parser validation only -- not real
  SWGDRUG/NIST data". Either way, the Index's "Spectra" tab, the Viewer's
  spectrum preview, and the Compare tray all handle a sparse/empty `spectra`
  table gracefully (clear empty-state copy) rather than assuming data is
  present; `test/fixtures/makeTestDb.ts` independently seeds sample-role and
  reference-role spectra across all three techniques so the rendering/query
  code is exercised by tests regardless of what the real demo DB currently
  contains.
- The officially published `sql.js` wasm binary has no FTS5 module compiled
  in -- see the "Query strategy" section above for the substring-search
  fallback this required.
- `vite` is pinned to `^7.0.0` here (not `^5`) and `@vitejs/plugin-react` to
  `^4.3.3`: the workspace root's `vitest@^3` pulls in `vite@7.x` as a regular
  dependency, and pinning this app to an incompatible major would have given
  npm two separate `vite` installs (`web/node_modules/vite` vs.
  `web/apps/librarian/node_modules/vite`) with structurally-identical but
  nominally-distinct TypeScript types, breaking `tsc` on `vite.config.ts`.
  Matching the hoisted major keeps a single install and a clean typecheck.
- No routing/URL state: filters, selection, and pins live in React state only
  and reset on reload (saved libraries persist via the overlay; the working
  selection does not). Adding `?` query-string sync would be a reasonable
  follow-up.
