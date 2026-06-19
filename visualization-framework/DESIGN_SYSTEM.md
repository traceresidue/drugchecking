# Design System — Drug Checking Visualization Framework

Shared visual language for all 25 standalone visualizations. Every file in `viz/` follows these rules so the set reads as one coherent product.

## Principles

1. **Two-layer reading.** Every visualization must work at two altitudes: a 5-second plain-language takeaway for someone who just got their sample result, and a technically faithful layer for chemists and epidemiologists. The plain-language layer is never a dumbed-down replacement — it's an annotation layer on top of real data.
2. **Honest uncertainty.** Peak height ≠ purity. Trace ≠ harmless. Every spectral visualization carries a "How to read this" disclosure stating what the method can and cannot say.
3. **Harm reduction first.** Color and emphasis encode actionability (what should a person do differently), not moral judgment. No skull icons, no "danger drug" framing — the supply is the hazard, not the person. Do not use enforcement or punishment terms like seized, samples are submitted
4. **Real data.** Aggregate views are driven by real aggregates from this repository (`data/aggregates.json`, derived from 6,580 samples across 11 US states). Spectra are clearly labeled "illustrative" (`data/spectra.json`): peak positions reflect characteristic fragments/bands, intensities are approximate.
5. **Standalone.** Each HTML file is self-contained: inline data, CDN libraries only, opens from the filesystem with no build step.

## Design Lab (`viz2/`)

A design-oriented sibling to `viz/` for experimenting with palettes, label density, and layout without forking all viz logic. Built pages live at `viz2/d-{id}.html` (e.g. `d-01-mirror-match.html`).

**Build:** from `visualization-framework/`, run `python build-design.py` (builds all pages with critique entries; use `--pilot-only` for the 5 Phase 1 pilots only).

**Libraries:** reuse `viz/lib/*.min.js` via relative paths — no duplicate vendoring.

### Design toolbar

Inserted below the page header by `DCFDesign.designScaffold()` (via patched `DCF.scaffold` in Design Lab builds):

```
[ Theme: Dark | Light ]  [ Palette ▾ (Recommended + Custom optgroups) + swatch strip ]  [ Labels: Low · Default · High ]
```

State persists in `localStorage` key `dcf-design:{pageId}`. On change: CSS tokens update → `window.__vizRedraw?.()` → critique live note refreshes.

### Palettes (10)

Applied via `data-palette` on `<html>`; substance semantics preserved across palettes.

| ID | Name | Group |
|----|------|-------|
| `default` | DCF Default | Recommended |
| `clinical` | Clinical | Recommended |
| `paper` | Paper | Recommended |
| `contrast` | High Contrast | Recommended |
| `colorblind` | Colorblind Safe | Recommended |
| `amethyst` | Amethyst | Custom |
| `lagoon` | Lagoon | Custom |
| `spectral` | Spectral | Custom |
| `inferno` | Inferno | Custom |
| `sage` | Sage | Custom |

Chrome tokens (`--bg`, `--panel`, `--ink`, …) follow `data-theme="dark|light"`. Chart class colors use `--c-fent`, `--c-opioid`, etc., set by `DCFDesign.applyPalette()`. Plotly pages (Phase 2+) should use `DCFDesign.getPlotlyLayout()` and `DCFDesign.getColorscale()`.

### Label density

Set via `data-labels="low|default|high"` on `<html>`.

| API | Purpose |
|-----|---------|
| `DCFDesign.peakLabelCount(n)` | low → min(2,n); default → n; high → all above threshold |
| `DCFDesign.showTier('axis'\|'legend'\|'peak'\|'inline'\|'annotation')` | tier visibility |
| `DCFDesign.mzLabelThreshold()` | high → 5% rel. intensity; default/low → no extra filter |

SVG labels use `class="dcf-lbl" data-tier="…"`; low mode hides peak/inline/annotation tiers via CSS.

Per-viz tier definitions: `src/design/label-tiers.json`.

### Critique panel

Between `#stage` and `<details class="dcf-how">`: thesis, strengths, weaknesses, visualization note (from `src/design/critiques.json`), plus a live note that updates with toolbar settings.

### Source layout

| Path | Role |
|------|------|
| `viz2/_design-shared.js` | Theme engine + toolbar + `DCFDesign` API |
| `src/design/critiques.json` | Per-page design assessment copy |
| `src/design/label-tiers.json` | Declarative label tier maps |
| `src/design/{id}.design.js` | Optional DOM/layout overrides (pilots) |
| `src/{id}.js` | Shared viz logic; guarded `DCFDesign` hooks |

Guards (`window.DCFDesign ? … : fallback`) keep `viz/` rebuilds unchanged when only `src/*.js` is edited.

## Tokens

```css
:root{
  --bg:#0b0e14;        /* page */
  --panel:#121826;     /* cards, chart panels */
  --panel-2:#1a2234;   /* hover/raised */
  --line:#26304a;      /* hairlines, axes */
  --ink:#e8ecf4;       /* primary text */
  --muted:#8b94a8;     /* secondary text */
  --faint:#5b6478;     /* tertiary */

  /* Substance class palette (colorblind-checked, dark-bg tuned) */
  --c-opioid:#ff8a5c;      /* heroin & classic opioids — orange   */
  --c-fent:#ff5c7a;        /* fentanyl & analogs — red-pink       */
  --c-xyl:#b388ff;         /* xylazine & sedatives — violet       */
  --c-stim:#ffd166;        /* methamphetamine & stims — amber     */
  --c-coke:#4cc9f0;        /* cocaine — cyan                      */
  --c-benzo:#7aa2ff;       /* benzodiazepines — blue              */
  --c-cut:#6ee7a8;         /* cuts & diluents — green             */
  --c-other:#94a3b8;       /* everything else — slate             */

  /* Signal colors (action, not judgment) */
  --alert:#ff5c7a; --watch:#ffd166; --ok:#6ee7a8; --info:#4cc9f0;
}
```

- **Type:** sans-only stacks — no serif faces anywhere. Use CSS variables from `:root`:
  - `--font-sans` — UI prose, headings, controls, tooltips (`Inter` when the optional font link loads; otherwise `ui-sans-serif` / system UI). Always terminates with `sans-serif`.
  - `--font-mono` — m/z values, retention times, wavenumbers, sample IDs, series tags, chart axis ticks. Always terminates with `monospace`.
- **Load:** `injectCSS()` adds an optional Google Fonts link for Inter (`display=swap`); pages degrade to system sans when offline.
- **Numbers are mono, units are muted:** `10.59 <span class="muted">min</span>`, `245 <span class="muted">m/z</span>`, `1645 <span class="muted">cm⁻¹</span>`.
- **Controls:** `<select class="dcf-ctl-select">` for in-chart dropdowns (inherits `--font-sans`).

## Page anatomy (every file)

```
<header>  series tag (e.g. "Nº 07 · GC–MS") · title · one-sentence plain-language dek
<main>    the visualization (+ controls)
<details> "How to read this" — expandable methods & limits note
<footer>  data provenance line + harm reduction line
```

- Series tag format: `Nº 14 · SUPPLY` where category ∈ {GC–MS, MS, FTIR, SUPPLY, GEO, RESULT, EXPERIMENTAL}.
- Footer provenance: "Aggregates: UNC Street Drug Analysis Lab open data (6,580 samples, 2021–2025). Spectra: illustrative." adjusted per file.
- Footer harm reduction line where relevant: naloxone/never-use-alone/fentanyl-test-strip messaging tied to the content, not boilerplate fear.

## Interaction grammar

- Hover/tap = identify (tooltip with substance, class, value, plain-language note).
- Click = pin/drill (open detail, lock selection).
- Brushing/sliders for time. Toggles are real `<button aria-pressed>` elements.
- Animations: 200–400 ms ease for state changes; longer cinematic intros allowed but must respect `prefers-reduced-motion`.
- Touch targets ≥ 40px; tooltips must work on tap.

## Spectral conventions

- Chromatograms: x = retention time (min), y = relative abundance (%). Synthesized as sums of Gaussians (σ ≈ 0.035–0.06 min) at real median retention times from `aggregates.json → retention_times`.
- Mass spectra: vertical sticks, base peak = 100%; label top 4–6 fragments; molecular ion marked `M⁺•`.
- Mirror plots: sample up, library reference down, cosine similarity shown as score.
- FTIR: x = wavenumber 4000→400 cm⁻¹ **reversed** (convention), y = absorbance (or %T if labeled); fingerprint region (1500–400) shaded and named.

## Libraries (CDN, pinned)

| Library | Use | CDN |
|---|---|---|
| D3 v7 | most 2D | `https://cdn.jsdelivr.net/npm/d3@7` |
| d3-sankey 0.12 | alluvial | `https://cdn.jsdelivr.net/npm/d3-sankey@0.12.3` |
| Plotly 2.x | 3D surface/scatter fallback | `https://cdn.plot.ly/plotly-2.32.0.min.js` |
| Three.js r165 (ES modules + importmap) | 3D scenes | `https://cdn.jsdelivr.net/npm/three@0.165.0/...` |
| topojson-client 3 + us-atlas 3 | maps | jsdelivr |
| SmilesDrawer 2 | molecular structures | `https://cdn.jsdelivr.net/npm/smiles-drawer@2.1.7/...` |
| Web Audio API | sonification | native |

Rule: prefer zero-dependency (canvas/SVG by hand) when the library would only save 20 lines.

## Accessibility

- All text ≥ 4.5:1 contrast on `--bg`/`--panel`.
- Class palette is distinguishable under deuteranopia/protanopia (verified hues + lightness separation); never encode by hue alone — pair with position, label, or shape.
- Every chart has an `aria-label` summary sentence and a visible plain-language takeaway.
- `prefers-reduced-motion: reduce` disables ambient/looping animation.
