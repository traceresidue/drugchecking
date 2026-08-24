# Wave-2 Delegation Plan

Operational counterpart to [`VISUALIZATION_WAVE2.md`](VISUALIZATION_WAVE2.md). That document identified 10 findings (C-1..C-10), one prerequisite (P1), and 10 new visualizations (#34–43). This document breaks that work into discrete packages, assigns each to a subagent, and sequences them.

**Repo conventions checked before writing this:** no `.claude/agents/`, no `CLAUDE.md`, no `.github/workflows/`, no `CONTRIBUTING.md` exist anywhere in this repository's history — there is nothing to align with, this scheme is net new.

## Mechanics

This harness's `Agent` tool has no specialized subagent types — `subagent_type` choices are `claude`, `claude-code-guide`, `Explore`, `general-purpose`, `Plan`, `statusline-setup`. All implementation packages below use **`general-purpose`**; the "role" is carried entirely by the prompt (persona + scope + constraints), not by a different type. `Explore` is used only for pure investigation packages.

**Shared-file conflict rule:** `visualization-framework/src/registry.json` and `visualization-framework/data/aggregates.json` are single JSON files every new-visualization package touches. Two agents editing the same file concurrently in the same working tree will conflict. Mitigation: every visualization package runs with **`isolation: "worktree"`**, appends *only its own* registry entry, and does **not** rebuild `viz/*.html` for other pages. The primary session (not a subagent) merges each worktree branch, resolves the (rare, append-only) registry.json diff, runs the full build once, and runs the full test suite once. This merge/integration step is called out per stage below — it is deliberately not delegated.

---

## Work packages

| # | Package | Covers | Files | Isolation | Depends on |
|---|---|---|---|---|---|
| WP0.1 | Font & privacy hygiene | C-1 | `viz/_shared.js`, `dcf-core/src/dom.ts` | worktree | — |
| WP0.2 | Auth honesty pass | C-2 | `build_index.py`, README | worktree | — |
| WP0.3 | CI bootstrap | C-7 | `.github/workflows/ci.yml` | worktree | WP0.1 (so CI is green on first run, not red on a known issue) |
| WP0.4 | Data coverage expansion | C-5 | `pipeline/adapters/unc_demo.py` (+ sibling adapter) | worktree | — |
| WP0.5 | Registry & variant cleanup | C-6, C-8 | `registry.json`, `06b` fix, `_shared.js`/`dcf-core` parity | worktree | — |
| WP0.6 | Test hardening | C-9, C-10 | `test/check.js`, new axe-core pass | worktree | WP0.1 (fonts fix removes a false-failure source the new assertions would otherwise inherit) |
| WP1.0 | P1: SMILES resolution | P1 | `pipeline/schema.sql`, new resolver script | direct (small, sequential) | — |
| WP1.1 | Viz #43 Appearance vs. Reality | #43 | `src/43-*.js`, `viz/lib/arquero*`, `viz/lib/echarts*` | worktree | — |
| WP1.2 | Viz #42 County Supply Map | #42 | `src/42-*.js`, `viz/lib/maplibre*` | worktree | — |
| WP1.3 | Viz #41 Adulterant Community Graph | #41 | `src/41-*.js`, `viz/lib/cytoscape*` | worktree | — |
| WP1.4 | Viz #38 + #39 (ECharts calendar + uPlot control chart) | #38, #39 | `src/38-*.js`, `src/39-*.js`, `viz/lib/echarts*`, `viz/lib/uplot*` | worktree | WP0.4 (both read `unc_gcms.csv`; usable on the small set beforehand, worth re-running after) |
| WP1.5 | Viz #37 Parallel-Coordinates Profiler | #37 | `src/37-*.js` | worktree | WP0.4 (full value needs the expanded sample set; can start on N=20) |
| WP2.1 | Viz #36 Tanimoto Similarity Matrix | #36 | `src/36-*.js`, `viz/lib/rdkit*` | worktree | WP1.0 |
| WP2.2 | Viz #34 Scaffold Sunburst | #34 | `src/34-*.js` | worktree | WP1.0, WP2.1 (reuses its RDKit vendoring + fingerprint helper) |
| WP2.3 | Viz #35 Substructure Alert Search | #35 | `src/35-*.js` | worktree | WP1.0, WP2.1 |
| WP3.0 | C-4 feasibility investigation | C-4 | *(investigation only, no code)* | n/a (Explore agent) | — |
| WP3.1 | C-3 real reference library adapter | C-3 | `pipeline/adapters/swgdrug_msp.py` or `nist_webbook.py` | worktree | — |
| WP3.2 | Viz #40 Spectral Anomaly Scanner | #40 | `src/40-*.js`, `viz/lib/uplot*` | worktree | WP3.1 (partial value now on MoNA refs alone) |

19 packages total (down from 21 raw items — WP1.4 bundles #38+#39 since both consume the same `unc_gcms.csv` extension and are individually small).

---

## Sequencing

```
Stage 0 — hygiene & foundation (parallel, then one integration merge)
  WP0.1 ─┬─→ WP0.3
  WP0.2 ─┤
  WP0.4 ─┤        (WP0.4 also feeds Stage 1/2 visualizations)
  WP0.5 ─┤
  WP0.6 ─┴─→ [INTEGRATION: merge all 6 worktrees, one build.py run, one full test run]

Stage 1 — ready-now visualizations (parallel, after Stage 0 integration)
  WP1.0 (sequential, small) ─┐
  WP1.1 WP1.2 WP1.3 WP1.4 WP1.5 (parallel worktrees) ─→ [INTEGRATION]

Stage 2 — cheminformatics (sequential chain, after WP1.0)
  WP2.1 → WP2.2
        → WP2.3            ─→ [INTEGRATION]

Stage 3 — spectral-gated (can start anytime, low urgency)
  WP3.0 (investigation, no dependency) 
  WP3.1 → WP3.2            ─→ [INTEGRATION]
```

Stage 1 does not strictly block on WP0.4 finishing — WP1.4/WP1.5 can be dispatched against the current N=20 dataset and simply re-verified once WP0.4 lands; noted per-package above rather than treated as a hard gate, to avoid idling five agents behind one.

---

## Example dispatches

Four representative packages, chosen to cover the different patterns (small hygiene fix, data-pipeline extension, new-visualization build, cheminformatics prerequisite).

### WP0.1 — Font & privacy hygiene (small hygiene fix)

```
Agent({
  description: "Remove Google Fonts CDN call from viz pages",
  subagent_type: "general-purpose",
  isolation: "worktree",
  prompt: `The drugchecking repo's visualization framework claims to be fully
offline ("no CDN or internet required" — see README.md) but every one of its
44 built pages requests https://fonts.googleapis.com/css2?family=Inter:...
on load. This is both false advertising and a privacy leak: this tool is
used by people who use drugs and harm-reduction workers, and every page
view currently hands Google their IP plus a referer identifying a
drug-checking page.

Fix it in BOTH places (they must stay behaviorally identical):
  - visualization-framework/viz/_shared.js (~line 150)
  - web/packages/dcf-core/src/dom.ts (~line 52)

Preferred fix: delete the <link> injection entirely and rely on the system
font stack already declared as a fallback in DESIGN_SYSTEM.md — check that
doc first to confirm system fonts are already the intended baseline. Do NOT
replace it with a self-hosted base64 @font-face unless you determine the
Inter typeface is load-bearing for a specific design requirement (check
DESIGN_SYSTEM.md and README.md for such a claim) — the simpler fix is
preferred if nothing depends on Inter specifically.

Constraints: no new CDN/network reference of any kind may be introduced.
Do not touch registry.json or any other visualization's source file.

Verification (must run before reporting done):
  cd web && npm run build   # rebuilds dcf-core dist/shared.js
  cd ../visualization-framework && python3 build.py
  grep -rl "fonts.googleapis" viz/*.html   # must return nothing
  node test/check.js         # report pass count; note any pre-existing
                              # failures unrelated to your change (e.g. the
                              # known 06b "d3 is not defined" bug — do not
                              # fix that here, it's a separate package)

Report: what you changed, the grep result confirming zero remaining CDN
references, and the check.js pass count before/after your change.`
})
```

### WP0.4 — Data coverage expansion (data-pipeline extension)

```
Agent({
  description: "Load full sample datasets into pipeline DB",
  subagent_type: "general-purpose",
  isolation: "worktree",
  prompt: `pipeline/adapters/unc_demo.py currently loads only
datasets/analysis_dataset.csv + datasets/lab_detail.csv — the N=20 demo
set. Meanwhile these sit completely unused:
  - datasets/nc/nc_analysis_dataset.csv        (1,362 samples)
  - datasets/selfservice/{AC,DN,HC,NV,OR,TN,WA,hnc,nys}/analysis_dataset.csv
    (WA alone ~2,847; several thousand total across all state dirs)
  - datasets/labservice/unc_gcms.csv           (22,652 detection rows,
    includes a gcms_peak retention-time field detections.rt doesn't
    currently receive from anywhere)

Read pipeline/adapters/base.py and pipeline/adapters/unc_demo.py first to
understand the existing adapter contract (Source/Sample/Detection dataclasses,
how substances are matched against chemdictionary, how source_id/license/
fetched_at provenance is recorded — every sample must trace to a sources row).

Extend unc_demo.py (or add a sibling adapter reusing its CSV-parsing logic —
your call, but don't duplicate the substance-matching code) so that:
  1. Each datasets/selfservice/<PROGRAM>/ and datasets/nc/ directory becomes
     its own sources row (distinct source_id per program/state — do not
     merge them into one, the provenance distinction matters for this
     project, see datasets/README.md's community-standards section on
     per-program attribution).
  2. datasets/labservice/unc_gcms.csv rows are loaded into detections with
     their gcms_peak value populating detections.rt (note: some rows use
     "." to mean missing — treat as NULL, not 0).
  3. No detection is silently dropped: any substance name from these CSVs
     not already in chemdictionary must still be inserted (existing
     unc_demo.py behavior for the demo set does this — follow the same
     pattern, do not change it).

Constraints: do not modify pipeline/schema.sql. Do not touch any file
under web/ or visualization-framework/.

Verification (must run before reporting done):
  python3 -m pytest pipeline/test -q     # all existing tests must still pass
  python3 pipeline/build_db.py           # must complete without error
  sqlite3 pipeline/drugchecking.sqlite "select count(*) from samples"
  sqlite3 pipeline/drugchecking.sqlite "select source_id, count(*) from samples group by 1"
  sqlite3 pipeline/drugchecking.sqlite "select count(*) from detections where rt is not null"

Report: new pytest count (pass/total), the samples-per-source breakdown,
and the detections.rt-populated count.`
})
```

### WP1.1 — Viz #43 Appearance vs. Reality (new-visualization build)

```
Agent({
  description: "Build viz #43: appearance vs reality",
  subagent_type: "general-purpose",
  isolation: "worktree",
  prompt: `Build a new standalone visualization for the drugchecking
project's framework, following its EXISTING pattern exactly — read
visualization-framework/src/18-result-card.js and its registry.json entry
first as a template for structure, then visualization-framework/README.md
and DESIGN_SYSTEM.md for the house style (color tokens, "How to read this"
section, harm-reduction footer — every existing page has these, yours must
too).

Visualization: "Appearance vs. Reality" — cross-tabulate sample appearance
(color, texture fields) against what was actually detected. datasets/
analysis_dataset.csv and datasets/nc/nc_analysis_dataset.csv both have
color/texture populated in 85-95% of rows. Build a mosaic/heatmap (color ×
detected-substance-class) plus an explicit "predictive power" readout: given
only the appearance, how much better than chance could you guess the
contents? This is the single most actionable harm-reduction message
available in this dataset — the punchline is "you cannot tell by looking"
— make sure that reads clearly to a non-technical viewer, not just
data-literate ones.

Libraries: this needs Apache ECharts (for the mosaic/heatmap) and Arquero
(for the groupby/cross-tab computation) — NEITHER is currently vendored in
this repo. Vendor both as local files in visualization-framework/viz/lib/
(pin specific versions, no CDN reference — check how the existing libs
there, e.g. viz/lib/d3.min.js, are vendored and match that pattern exactly).

Add ONE new entry to visualization-framework/src/registry.json for id "43-
appearance-reality" (n: 43, cat: "RESULT" or a new category if none fits —
your judgment, check the existing cat values first). Do NOT edit any other
registry.json entry.

Write visualization-framework/src/43-appearance-reality.js with the page
logic, computing its data at build time from the CSVs above (follow how
existing pages source data — check build.py and an existing src/*.js file
for the data-injection pattern) or, if you judge it cleaner, precompute an
aggregate slice into visualization-framework/data/aggregates.json (ask
yourself which existing pages do which, and match the majority pattern).

Constraints: do not modify any other visualization's source file. Do not
rebuild the full viz/ directory for pages other than your own — build.py
runs for all pages, so after running it, only commit the diff for your new
page's output plus any files you intentionally vendored/changed.

Verification (must run before reporting done):
  cd visualization-framework && python3 build.py
  node test/check.js 2>&1 | grep "43-appearance"   # must show "ok", not FAIL
  open (or otherwise confirm rendered) viz/43-appearance-reality.html

Report: the registry entry you added, confirmation the page builds and
passes check.js, and a one-paragraph description of what the chart shows.`
})
```

### WP1.0 — P1: SMILES resolution (cheminformatics prerequisite)

```
Agent({
  description: "Resolve chemdictionary CIDs to SMILES",
  subagent_type: "general-purpose",
  isolation: "worktree",
  prompt: `chemdictionary/chemdictionary.csv has 150 PubChemCID values but
no SMILES column, and pipeline/schema.sql's substances table has no smiles
column either (confirmed absent — this needs a migration, not just a
loader change). Three downstream visualizations (#34 scaffold sunburst,
#35 substructure search, #36 similarity matrix) need real SMILES strings
via RDKit.js and are blocked on this.

1. Add "smiles TEXT" to the substances table in pipeline/schema.sql.
2. Write a one-time resolution script (pipeline/resolve_smiles.py or
   similar) that calls the PubChem PUG-REST API
   (https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/<CID>/property/
   CanonicalSMILES/TXT — confirm exact endpoint shape yourself, this is
   public and unauthenticated) for each of the ~150 CIDs in
   chemdictionary.csv, and caches the raw responses to pipeline/cache/
   (a directory that already exists and is gitignored per pipeline/README.md
   — check pipeline/.gitignore or the root .gitignore for the pattern to
   follow). Respect a reasonable rate limit (PubChem's public guidance is
   ~5 requests/sec, be conservative — 1/sec is fine for 150 one-time calls).
3. Wire the cached results into pipeline/build_db.py's substances loader
   so the smiles column gets populated on every rebuild from cache, without
   re-hitting the network unless the cache is missing an entry.
4. Handle CIDs PubChem doesn't resolve (log and continue — do not crash the
   whole build over one bad CID; leave that row's smiles NULL).

Constraints: do not modify any file under web/ or visualization-framework/
— this package is pipeline/-only. Do not attempt to build #34/#35/#36
themselves; that's separate follow-on work once this lands.

Verification (must run before reporting done):
  python3 -m pytest pipeline/test -q          # all existing tests pass;
                                                # add a test for your
                                                # resolver's cache behavior
  python3 pipeline/resolve_smiles.py           # first run: hits network,
                                                # populates cache
  python3 pipeline/resolve_smiles.py           # second run: must not
                                                # re-hit network (verify by
                                                # timing or by a printed
                                                # "N cache hits, 0 fetched")
  python3 pipeline/build_db.py
  sqlite3 pipeline/drugchecking.sqlite "select count(*) from substances where smiles is not null"

Report: how many of the 150 CIDs resolved successfully, how many failed
and why (if any), and confirm the second resolver run made zero network
calls.`
})
```

---

## WP3.0 — C-4 feasibility investigation (not an implementation package)

Zero spectra in the DB carry `role='sample'`. The ~800 real chromatograms in `spectra/*.PNG` are rendered images; nothing converts them to structured peak data. This is the single largest remaining gap and genuinely may not be solvable from what's in this repo — it depends on whether raw instrument files (mzML or vendor-native) exist anywhere outside the repo, or whether the only path forward is digitizing peak positions from the PNG images themselves (OCR/CV, a materially different and much larger effort than the MSP/JCAMP parsers already built).

This should **not** be dispatched as an implementation package. Dispatch as an `Explore`-type investigation first:

```
Agent({
  description: "Investigate feasibility of real sample spectra ingestion",
  subagent_type: "Explore",
  prompt: `Investigate options for getting real (not synthetic) sample-level
spectral data into pipeline/drugchecking.sqlite's spectra table with
role='sample'. Currently 0 rows have this. Report on, without writing any
code:
  1. What exactly is in spectra/*.PNG — are these rasterized plots only, or
     do any carry embedded metadata (EXIF, PDF-if-any-are-PDF, embedded
     text layers) that might contain peak coordinates?
  2. Whether any file anywhere in this repo (check datasets/, docs/,
     chemdictionary/) references or links to raw instrument output (mzML,
     .raw, .d, netCDF/ANDI) rather than rendered images.
  3. What datasets/labservice/unc_gcms.csv's gcms_peak field actually
     contains per-row, and whether retention time + substance name alone
     (without full spectral peak data) would satisfy a reasonable partial
     version of role='sample' — i.e., is a coarser "detection with RT" a
     useful stepping stone distinct from full spectral digitization?
  4. Rough effort estimate for image-based digitization (peak-picking from
     the PNGs via computer vision) vs. waiting for/requesting raw
     instrument exports, as two distinct paths forward.
Report findings only — do not modify any files.`
})
```

Its findings should determine whether WP3.1/WP3.2 proceed as scoped or need re-scoping.

---

## Integration protocol (primary session, not delegated)

After each stage's parallel packages report done:
1. Fetch each worktree branch, review the diff (registry.json entries should be pure additions — flag anything else for review).
2. Merge in package-number order (WP1.1 → WP1.2 → ... ) to keep registry.json conflicts trivial (each is one new array entry).
3. Run `cd web && npm run build && npm test`, `python3 -m pytest pipeline/test -q`, `cd visualization-framework && python3 build.py && node test/check.js` once, against the fully merged tree.
4. Commit the integration merge with a summary of what landed and the test counts.
5. Push `claude/wave2-hardening`.

This step is intentionally not a subagent package — it requires holding the full merged state in context, which is exactly what parallel worktree isolation was designed to avoid pushing onto a single agent mid-flight.
