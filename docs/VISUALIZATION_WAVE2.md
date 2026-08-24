# Critical Assessment & Wave-2 Visualization Plan

**Date:** 2026-08-22 · **Branches examined:** `cl/visualization-react`, `reviz2`, `claude/spectral-sourcer-6zvao0`, `claude/drug-checking-viz-expansion-9uwjyh`

This document is (I) a critical assessment of the repository as it actually stands — everything below was verified by running it, not read off commit messages — and (II) a plan for ten new visualizations built on a set of libraries the project has not used so far.

---

## Method

What I actually executed, so the claims below are checkable:

| Command | Result |
|---|---|
| `npm run build / typecheck / test` (`web/`) | ✅ dcf-core 18 tests, librarian 15 tests, all pass |
| `python3 -m pytest pipeline/test` | ✅ 56 passed in 0.76s |
| `python3 pipeline/build_db.py` | ✅ 235 substances, 20 samples, 115 detections, 112 spectra |
| `python3 build.py` + `node test/check.js` | Builds 44 pages; see finding **C-1** on the test result |
| SQL over `pipeline/drugchecking.sqlite` | Verified spectra provenance, per-record licensing, FTS |
| Column/row audits of `datasets/**`, `chemdictionary/` | Feasibility matrix in Part III |

---

# Part I — Where the project actually is

## Branch topology

Work is spread across four branches that have diverged, and the leading edge is **not** the branch most recently under discussion:

```
main
 └─ claude/drug-checking-viz-framework-yxiy3u   33→42 viz, nav, password gate
     └─ claude/drug-checking-viz-expansion-9uwjyh   docs only (README/ARCHITECTURE/ROADMAP)
     └─ cl/visualization-react                      + dcf-core (A0/A1), pipeline schema (B0)
         └─ claude/spectral-sourcer-6zvao0          + adapters, Librarian
             └─ reviz2                              + MoNA adapter   ← furthest ahead
```

## What genuinely works (verified)

**Track A — JS/React foundation.** `web/` is a real npm-workspaces monorepo. `@dcf/core` is a clean typed ESM port of `viz/_shared.js`, split into `tokens/classify/format/spectral/dom`, with 18 passing unit tests. Crucially, `build.py` prefers `web/packages/dcf-core/dist/shared.js` when built and **falls back to the legacy file when not** — exactly the non-destructive migration the roadmap specified. The `shared-entry.ts` header documents why its export shape must match `build.py`'s regex globalize step. This is careful work.

**Track B — Pipeline.** `pipeline/` has a proper adapter architecture (`base.py` + `unc_demo`, `msp_library`, `jcamp_ftir`, `mona_json`) with real MSP and JCAMP-DX parsers and 56 tests. Provenance discipline is genuinely good — the MoNA source row carries per-record CC licence terms and instructs downstream users to check `meta.license`/`meta.accession` before redistribution. That is the correct instinct for this project.

**Track D — Librarian.** `web/apps/librarian` is a real Vite+React+sql.js app: index table, filters, FTS search, viewer, compare tray, library panel, cosine similarity, and an export that emits the **`dcf-library@1`** schema — the exact contract specified in the plan. Continuity between planning and code is strong.

---

# Part II — Critical assessment

Ranked by severity. Each finding is evidence-backed.

## C-1 · The "fully offline, no CDN" claim is false — and it is a privacy leak

**Every one of the 44 built pages requests a stylesheet from Google.**

```
visualization-framework/viz/_shared.js:150
web/packages/dcf-core/src/dom.ts:52
  link.href='https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
```

`grep -l fonts.googleapis viz/*.html | wc -l` → **44**.

The README states "Offline-capable — Libraries are vendored locally; no CDN or internet required" and "no external CDN or font loads." Both are untrue as built. Worse, the port to `dcf-core` faithfully carried the bug forward, so the modernised path inherits it.

This is not pedantry. The stated audience includes people who use drugs and harm-reduction workers. Every page load hands Google a request carrying the viewer's IP and a referer identifying a drug-checking tool. For a project whose datasets carry an explicit anti-law-enforcement warning, silently phoning a third party on every page view is a real threat-model failure, not a lint error.

It also breaks the test suite: in a network-restricted environment the blocked request surfaces as a console error, and `check.js` fails **every page** on it. The "43/44 pass" figure in commit `68a5708` is only reproducible on a machine with open internet access.

**Fix:** self-host the two font files as base64 `@font-face` in `dom.ts`, or drop to the existing system-font stack (which `DESIGN_SYSTEM.md` already claims is in use). Half a day, removes a lie from the docs and a beacon from the product.

## C-2 · The password gate protects nothing

`build_index.py:67` inlines the secret into client-side source:

```js
if(v==='{pwd}'){ localStorage.setItem('dcf_auth', Date.now()); … }
```

The password ships in plaintext in `index.html`; the per-page guard is `localStorage.getItem('dcf_auth')`, settable from any console in one line. This is a doormat, not a lock.

That may be acceptable — if the intent is only "don't index this publicly yet." But nothing says so, and `ASSESSMENT.md` lists "no authentication/privacy — no way to show private/embargo results" as a gap this supposedly addresses. **Either document it honestly as a speed bump, or move it to real edge auth** (Vercel password protection / an access-controlled deployment). The dangerous state is the current one, where a reader could reasonably believe embargoed data is protected.

## C-3 · The reference library is mostly synthetic fixtures

The DB reports 112 spectra. Broken down:

| Source | Count | Reality |
|---|---|---|
| MoNA GC–MS | 107 | ✅ real, licence-tracked |
| MSP fixture | 3 | ⚠️ *"synthetic fixture for parser validation"* |
| JCAMP-DX FTIR | 2 | ⚠️ *"synthetic fixture for parser validation"* |

The parsers are real and tested; the **authoritative libraries the plan named (SWGDRUG, NIST WebBook, Cayman) are not ingested.** The roadmap's headline promise — compare a real unknown against an authoritative reference — is not yet met. The adapters make it a data-acquisition task rather than an engineering one, which is good, but the gap should not be understated in status reporting.

## C-4 · Zero sample-role spectra: the founding gap is still open

Every ingested spectrum is `role='reference'`. **`role='sample'` count is 0.** The ~800 chromatograms in `spectra/` remain PNG images, and `data/spectra.json` remains synthesized. The single most valuable change identified in planning — real sample spectra — has not started (Track B3). Everything built so far is scaffolding around a hole that is still empty.

## C-5 · The database contains 20 samples while the repo ships thousands

`build_db.py` loads only the N=20 demo CSVs. Meanwhile the repo contains, unused:

- `datasets/labservice/unc_gcms.csv` — **22,652 rows** with per-detection retention times
- `datasets/nc/nc_analysis_dataset.csv` — **1,362 samples**
- `datasets/selfservice/{WA,nys,OR,TN,…}/` — several thousand more

The Librarian is therefore a well-built UI over a 20-row toy. Pointing the existing `unc_demo` adapter at the full self-service directories is a small change with a very large payoff, and should precede any new feature work.

## C-6 · Variant sprawl without curation

The registry grew 33 → 42, largely via `06a/06b/06c`, `12a/12b/12c`, `17a/17b/17c` — variants of existing charts. Meanwhile `06b-ridgeline-3d.html` throws **`d3 is not defined`** (its registry entry omits the `d3` lib), and has shipped broken across at least two branches. Exploring variants is healthy; promoting all of them into the shipped registry is not. Nine near-duplicates dilute the index, trip the "which one do I open?" problem the PREVIEW doc was written to solve, and each one is another page to maintain.

**Recommendation:** demote variants to a `variants/` section excluded from the main index, keep one canonical per concept, and fix or delete `06b`.

## C-7 · No CI

`.github/workflows` does not exist on any branch. Phase A0's exit criterion was "`npm test` green in CI." Everything — 74 JS tests, 56 Python tests, the Playwright suite — runs only when someone remembers. Given the branch fragmentation in Part I, this is how the `06b` regression survived. **One workflow file is the highest value-per-line change available.**

## C-8 · Duplicate source of truth for the design system

`viz/_shared.js` (9,405 bytes) and `web/packages/dcf-core/src/*` now both define tokens, `classify()`, and spectral synthesis. The fallback in `build.py` is a sensible migration aid, but it means a contributor editing the legacy file gets silently ignored on machines where `dist/` exists, and silently honoured where it doesn't. Set a deprecation header on `_shared.js` and a CI check that the two produce identical output, or delete it once A4 lands.

## C-9 · Tests verify absence of errors, not presence of meaning

`check.js` asserts "no console error and `#stage` is non-empty." A chart that renders axes and no data, or plots the wrong series, passes. Combined with C-1 (any network hiccup fails everything) the suite is simultaneously too strict and too weak. Worth adding a handful of assertions on expected mark counts for the highest-traffic pages.

## C-10 · Accessibility is claimed, not measured

README asserts WCAG 2.1 AA. There is no automated check (`axe-core` in the Playwright run is ~20 lines) and no keyboard-traversal test. Several charts are hover-only, which is a genuine AA failure mode. Claiming a conformance level without measuring it is a liability for a public-health tool.

## Summary

| # | Finding | Severity | Fix cost |
|---|---|---|---|
| C-1 | Google Fonts on all 44 pages breaks offline claim + leaks viewer IP | **High** | ~4 h |
| C-2 | Password gate is client-side theatre | **High** | ~4 h or doc change |
| C-4 | No real sample spectra ingested (founding gap) | **High** | Track B3 |
| C-5 | DB holds 20 of the thousands of available samples | **High** | ~1 d |
| C-3 | Reference libraries are synthetic fixtures | Medium | data acquisition |
| C-7 | No CI | Medium | ~2 h |
| C-6 | Nine uncurated variants; `06b` broken | Medium | ~1 d |
| C-8 | Two copies of the design system | Medium | ~2 h |
| C-9 | Smoke tests only | Low | ~1 d |
| C-10 | Unverified accessibility claims | Low | ~1 d |

**Overall:** the engineering is careful, honest in its commit messages, and faithful to the plan — genuinely above average. The risk is not sloppiness; it is **building outward while the centre is empty**. Four tracks of scaffolding now surround a database of 20 samples and zero real spectra. C-5 and C-4 should outrank any new feature, including the ten below.

---

# Part III — Library selection

## Currently used

`d3` (38 pages) · `plotly` (5) · `smiles-drawer` (4) · `d3-sankey` (2) · `topojson-client` (2). Total vendored weight is dominated by `plotly.min.js` at **3.6 MB**.

Two structural consequences: nearly everything is bespoke SVG (hence the multi-megabyte DOM in the ridgelines), and there is **no cheminformatics capability at all** — `smiles-drawer` only draws a molecule, it cannot compute anything about it.

## Proposed set

Chosen for: permissive licence, vendorable offline (non-negotiable given C-1), canvas/WebGL rendering where SVG has failed, and — most importantly — each one enabling analysis that is *impossible* today rather than merely restyling it.

| Library | Licence | Size | Why it earns its place |
|---|---|---|---|
| **Apache ECharts** | Apache-2.0 | ~1 MB | Canvas renderer handling 10k+ marks; brings sunburst, parallel-coordinates, calendar, and clustered heatmap as first-class types. Directly answers the SVG-bloat problem. |
| **RDKit.js** | BSD-3 | ~8 MB WASM | The big one. Real cheminformatics in-browser: Murcko scaffolds, Morgan fingerprints, Tanimoto, SMARTS substructure matching, descriptors. Turns substance *names* into queryable *structures*. |
| **uPlot** | MIT | 45 KB | Fastest time-series canvas plotter available; renders hundreds of dense traces at 60 fps in a fraction of Plotly's weight. |
| **Cytoscape.js** | MIT | ~400 KB | Graph *analysis*, not just graph drawing: Louvain communities, betweenness centrality, k-core. d3-force gives physics; this gives answers. |
| **MapLibre GL JS** | BSD-3 | ~800 KB | True vector maps with zoom/pan and no API key or tile-server dependency. Unlocks the county data that already exists. |
| **Arquero** | BSD-3 | ~120 KB | In-browser dataframe verbs (groupby/rollup/join/pivot). The data layer under the cross-filtering charts, so filters recompute instead of being precomputed at build time. |

**Deliberately rejected:**

- **three.js / deck.gl** — Plotly already covers the project's 3D needs, and adding a second 3D stack for marginal gain is exactly the sprawl C-6 warns about.
- **Vega-Lite** — substantially overlaps ECharts; picking both would be indecision, not capability.
- **Observable Plot** — elegant, but d3 is already vendored and fluent here; it would add weight without adding a capability.
- **Tone.js** — tempting, but three sonic visualizations already exist (09, 29, 30). Adding a fourth audio approach duplicates coverage instead of extending it.

Total added weight ≈ 2.4 MB JS + 8 MB WASM. The WASM loads only on the three RDKit pages; keeping the standalone-HTML build honest means `registry.json` gains these as `libs` entries exactly like the existing ones.

---

# Part IV — Ten new visualizations

Numbered 34–43, continuing the registry. Each states its analytical claim, the library doing the work, its data source, and — critically — **whether it can be built with data in the repo today.**

---

### 34 · Molecular Scaffold Sunburst
**Library:** ECharts (sunburst) + RDKit.js (Bemis–Murcko decomposition)

Hierarchical decomposition of the supply by **computed molecular scaffold** rather than by hand-assigned drug class: ring system → scaffold → substituted analog → detected substance, with arc area = sample count.

**Why it is new:** every existing taxonomy view relies on `chemdictionary`'s human-assigned 1/0 class flags. This derives structure from the molecule itself, so it can show what the class flags cannot — that a "novel" NPS is frequently a known scaffold wearing a new tail. When a nitazene appears with an unfamiliar name, the sunburst places it next to its structural siblings automatically, before anyone updates the dictionary.

**Data:** `chemdictionary` PubChemCID → SMILES (see prerequisite **P1**). **Feasibility: ⚠️ after P1.**

---

### 35 · Substructure Alert Search
**Library:** RDKit.js (SMARTS matching) + ECharts (result timeline)

A query box that accepts a SMARTS pattern or a drawn fragment — the 4-anilidopiperidine fentanyl core, the benzimidazole nitazene core, a specific halogenation — and returns every substance in the corpus containing it, with a prevalence timeline and first-detection date.

**Why it is new:** the project has **no structural query capability whatsoever**. Today the only way to ask "has anything with this core appeared?" is to already know the names. This inverts that, which is precisely the analytical posture needed for emerging NPS: recognising a family member before it has a common name.

**Data:** SMILES (P1) + `monthly`/`emergence` aggregates. **Feasibility: ⚠️ after P1.**

---

### 36 · Tanimoto Similarity Matrix
**Library:** RDKit.js (Morgan fingerprints) + ECharts (heatmap)

Pairwise chemical similarity across the top ~120 detected substances, seriated by hierarchical clustering so structural families surface as blocks on the diagonal. Click a cell to open the pair in the existing Mirror Match.

**Why it is new:** viz 10 (Chemical-Space Drift) plots a 2-D *embedding of synthesized data*. This computes genuine pairwise structural similarity and preserves it exactly rather than projecting it. Nothing in the repo currently computes a chemical relationship.

**Data:** SMILES (P1) + `top_substances`. **Feasibility: ⚠️ after P1.**

---

### 37 · Parallel-Coordinates Sample Profiler
**Library:** ECharts (parallel, canvas renderer) + Arquero

One polyline per sample across axes: substance count · fentanyl present · xylazine present · cut count · benzo present · region · month. Brush any axis to filter all others; thousands of lines stay interactive on canvas.

**Why it is new:** every existing supply chart aggregates *before* display (streamgraph, chord, horizon). This is the first view where the **individual sample remains the unit of analysis** across many dimensions at once, which is how supply *archetypes* — "fentanyl + xylazine + BTMPS, no cuts" versus "fentanyl + caffeine + acetaminophen" — become visible as distinct bundles instead of averages.

**Data:** `datasets/selfservice/*/analysis_dataset.csv` (~5,000 samples, ~100 `lab_*` flags each). **Feasibility: ✅ today.**

---

### 38 · Detection Calendar Punchcard
**Library:** ECharts (calendar heatmap)

A true day-by-day calendar, cell colour = detection rate of a chosen substance, with weekday and seasonal margins.

**Why it is new:** the finest temporal grain anywhere in the project is *monthly* (`monthly`, `monthly_class`, horizon, streamgraph). Yet `unc_gcms.csv` carries `date_complete` on all 22,652 rows. Daily resolution exposes what monthly bins destroy: batch arrivals, supply interruptions, the multi-week gap after a seizure, day-of-week collection artefacts that analysts should know about before trusting a trend.

**Data:** `datasets/labservice/unc_gcms.csv` (`date_complete`). **Feasibility: ✅ today.**

---

### 39 · Retention-Time Drift Control Chart
**Library:** uPlot (+ computed control limits)

For a chosen substance, every individual `gcms_peak` retention time plotted against completion date, with mean and ±3σ control limits. Points outside the limits are flagged.

**Why it is new:** the first **laboratory-facing quality-control** view in the project — everything else is epidemiology. It answers two operational questions nothing currently addresses: is the instrument drifting (column ageing, method change), and is a specific identification suspect because its RT sits far off the substance's established band? `retention_times` in `aggregates.json` holds only a mean per substance; the per-detection values sit unused in the CSV.

**Data:** `unc_gcms.csv` (`gcms_peak`, `date_complete`) — note `"."` encodes missing. **Feasibility: ✅ today.**

---

### 40 · Spectral Anomaly Scanner
**Library:** uPlot

Overlay every spectrum in a selected set on one canvas, compute a median trace, and highlight the traces whose divergence exceeds a threshold — pulling the odd one out of a batch of visually similar spectra.

**Why it is new:** viz 06/07 stack spectra for *display*; this stacks them for *detection*, and does so at corpus scale. It is also the direct remedy for the ridgeline pathology — that page currently generates ~1.6 MB of SVG DOM, whereas uPlot draws the same data to a canvas in a few hundred KB.

**Data:** `spectra` table. 107 real MoNA reference spectra work today; sample-vs-batch anomaly detection needs **C-4** resolved. **Feasibility: ⚠️ partial now, full after Track B3.**

---

### 41 · Adulterant Community & Bridge Graph
**Library:** Cytoscape.js (Louvain clustering, betweenness centrality)

The co-occurrence network with real graph algorithms: nodes coloured by detected community, sized by betweenness centrality, and a ranked "bridge" table.

**Why it is new:** viz 17 is a d3-force layout — physics, where proximity is an emergent artefact of the simulation rather than a measured property. Running community detection and centrality asks a different and more useful question: **which substances bridge otherwise separate market clusters?** A high-betweenness cut appearing across two communities that never otherwise overlap is a signal of a shared upstream source — an epidemiological lead, not a picture.

**Data:** `cooccurrence` (120 weighted edges). **Feasibility: ✅ today.**

---

### 42 · County Supply Map
**Library:** MapLibre GL JS

Vector map with true zoom/pan, county polygons shaded by fentanyl or xylazine prevalence, per-capita toggle, and **explicit small-N suppression** (counties below a sample threshold are hatched, not coloured).

**Why it is new:** `aggregates.json.geo` already holds **127 county-level rows** (`state`, `county`, `n`, `fent`, `xyl`), yet viz 21 renders states only — flagged as a gap in `ASSESSMENT.md` and still unaddressed. The suppression rule matters as much as the map: a county with 3 samples at 100% fentanyl currently renders identically to one with 300, which is actively misleading.

**Data:** `geo` + a county GeoJSON/TopoJSON (vendored, ~1 MB). **Feasibility: ✅ today.**

---

### 43 · Appearance vs. Reality
**Library:** Arquero (cross-tabulation) + ECharts (mosaic / heatmap)

Sample colour and texture cross-tabulated against what was actually detected, with an explicit predictive-power readout: given the appearance, how much better than chance can you guess the contents?

**Why it is new — and why it may be the most important of the ten:** the fields `color`, `bright_color`, `texture`, `texture_notes` exist in every `analysis_dataset`, are populated for **1,158 of 1,362 NC samples** alone, and are used by *nothing* in the project. The visualization delivers the single most actionable harm-reduction message available from this data: **you cannot tell by looking.** White powder is heroin, is fentanyl, is a benzo mix, is caffeine. Every other chart here informs an analyst; this one directly counters a belief that gets people killed, using data already sitting in the repository.

**Data:** `datasets/nc/` + `datasets/selfservice/*/analysis_dataset.csv` (~5,000 samples with appearance fields). **Feasibility: ✅ today.**

---

## Feasibility summary

| # | Visualization | Library | Buildable today? |
|---|---|---|---|
| 37 | Parallel-Coordinates Profiler | ECharts + Arquero | ✅ |
| 38 | Detection Calendar Punchcard | ECharts | ✅ |
| 39 | Retention-Time Drift Control | uPlot | ✅ |
| 41 | Adulterant Community & Bridge | Cytoscape.js | ✅ |
| 42 | County Supply Map | MapLibre GL | ✅ |
| 43 | Appearance vs. Reality | Arquero + ECharts | ✅ |
| 34 | Molecular Scaffold Sunburst | ECharts + RDKit.js | ⚠️ needs P1 |
| 35 | Substructure Alert Search | RDKit.js | ⚠️ needs P1 |
| 36 | Tanimoto Similarity Matrix | RDKit.js + ECharts | ⚠️ needs P1 |
| 40 | Spectral Anomaly Scanner | uPlot | ⚠️ partial; full needs B3 |

**Six of ten can be built with data already in the repository.** Three more are unlocked by a single small prerequisite. Only one depends on the long-running spectral track.

### P1 · The SMILES prerequisite (unlocks 34, 35, 36)

`chemdictionary.csv` carries **150 PubChem CIDs but no SMILES column**, and RDKit needs structures. The fix is one pipeline step: resolve CID → canonical SMILES via PubChem PUG-REST, cache to `pipeline/cache/`, and add a `smiles` column to the `substances` table (the column already exists in `schema.sql`). ~150 requests, run once, cached thereafter. **Roughly half a day, and it converts a third of this plan from blocked to ready.**

---

# Part V — Sequencing

**Do not start here.** Two findings outrank all ten visualizations:

**Stage 0 — fix the centre first (~2 days)**
1. **C-1** — remove the Google Fonts beacon (privacy + honesty + unblocks CI).
2. **C-5** — point `unc_demo` at the full self-service datasets: 20 → several thousand samples. Nine of the ten below get meaningfully better for free.
3. **C-7** — add one CI workflow running the three existing suites.
4. **C-2** — either real edge auth or an honest note in the README.

**Stage 1 — ready-now visualizations (~2 weeks)**
43 (Appearance vs. Reality) → 42 (County Map) → 41 (Community Graph) → 38 (Calendar) → 39 (RT Drift) → 37 (Parallel Coordinates).

Ordered by message value over effort. **43 first**: it is buildable today, uses data nothing touches, and carries the strongest harm-reduction payload in the plan.

**Stage 2 — cheminformatics (~2 weeks)**
P1 (SMILES resolution) → 36 (Tanimoto) → 34 (Scaffold Sunburst) → 35 (Substructure Search).

Build 36 first: it validates the fingerprint pipeline against a familiar answer before 34 and 35 depend on it.

**Stage 3 — gated on real spectra**
40 (Anomaly Scanner), alongside Track B3.

## Integration notes

- Each page registers in `registry.json` with its `libs` entry and builds through the **existing** `build.py`/`build.mjs` path — no new build system, standalone HTML preserved.
- Vendor all six libraries into `viz/lib/` as with the current five. **Do not introduce a CDN reference** — that is C-1 repeating itself.
- Load the RDKit WASM lazily and only on 34/35/36; keep the other seven pages under the current weight budget.
- Charts reading live filters (37, 43) should query `drugchecking.sqlite` through `@dcf/data` rather than baking aggregates at build time — this is the first real exercise of the Track A data layer, and a useful test of whether it holds up.
