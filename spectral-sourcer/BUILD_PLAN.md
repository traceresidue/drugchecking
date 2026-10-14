# Build Plan

Scope for this effort: make the pipeline (`pipeline/`) and the Sample
Librarian (`web/apps/librarian/`) work end-to-end as an independent tool,
per [`docs/ROADMAP.md`](../docs/ROADMAP.md) Tracks B and D. This is a
focused subset of that larger roadmap — not a replacement for it.

## Scope decisions

| Decision | Rationale |
|---|---|
| Pipeline gets an adapter architecture (B0 hardened + B1 reference parsers real), but B2 (DrugsData/Toronto DCS/WEDINOS live scraping) and B3 (real mzML ingestion from lab raw files) stay documented stubs. | B2/B3 need either lab-internal file access we don't have in this environment, or scraping decisions (terms of service, rate limits, attribution) that deserve their own explicit review rather than being bundled into an infra build. The adapter contract is built so slotting these in later is a `fetch()`-only change. |
| MSP and JCAMP-DX parsers are hand-rolled against small synthetic fixtures, not live SWGDRUG/NIST downloads. | Correctness of the parser (a format-spec problem) is separable from reliably fetching real licensed/rate-limited external data (a networking + ToS problem) — solving the first for real and being honest that the second is still open beats a demo that only works if a scrape happens to succeed during the build. |
| Librarian is Vite+React+TS+sql.js, standalone — no dependency on `packages/dcf-core`/`dcf-charts`. | Those packages are mid-flight Track A work; making the Librarian depend on them would block this effort on unrelated, unfinished work. The Librarian owns a small self-contained spectrum renderer instead. |
| Librarian's D3 (hand-off links into visualization-framework pages) is out of scope. | Depends on Track C work (framework pages learning to read `dcf-library@1`) that hasn't started. D0-D2 (index, viewer, compare, save/export) is the complete, useful, standalone slice. |
| No new third-party Python dependencies in `pipeline/`; minimal JS dependency set in the Librarian (react, react-dom, sql.js, vite, typescript). | Matches the existing repo's zero/low-dependency bias (`build_db.py` is stdlib-only today; the visualization framework vendors its own JS libs rather than pulling a big toolchain). |

## Phases (this effort)

1. **Pipeline: adapter architecture.** Refactor `build_db.py`'s inline demo-source
   loading into `adapters/unc_demo.py` behind a shared `adapters/base.py`
   contract, with no regression in output. Entry point (`python3
   pipeline/build_db.py`) stays stable.
2. **Pipeline: real B1 reference parsers.** `adapters/msp_library.py` and
   `adapters/jcamp_ftir.py`, each tested against a small synthetic fixture,
   each writing a properly attributed `sources` row.
3. **Librarian: index + viewer (D0-D1).** Facet filters + FTS search over
   samples/spectra; click-through detail view with a self-contained
   spectrum/chromatogram renderer and a provenance panel.
4. **Librarian: compare tray + libraries (D2).** Pin-and-overlay comparison;
   save a named selection to a local overlay; export/import as
   `dcf-library@1` JSON.
5. **Integration verification.** Build the database from the checked-in
   demo data + fixtures, point the Librarian at it, drive it in a real
   browser, confirm the full loop (filter → view → pin → compare → save →
   export) actually works — not just that the build/tests pass.
6. **Documentation.** This directory (`spectral-sourcer/`) plus updated
   `pipeline/README.md` and `web/apps/librarian/README.md` describe the
   result accurately, including what's deferred and why.

## Explicitly deferred (tracked in docs/ROADMAP.md, not here)

- Track B2/B3: live community-source scraping, real lab mzML ingestion.
- Track A3/A4: `dcf-charts`, Node build pipeline for the visualization framework.
- Track C: wiring `dcf-library@1` hand-off into the 33 existing visualizations.
- Track D3: "Open in visualization →" launch links (needs Track C).
