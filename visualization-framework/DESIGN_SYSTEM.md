# Design System — Drug Checking Visualization Framework

Shared visual language for all 25 standalone visualizations. Every file in `viz/` follows these rules so the set reads as one coherent product.

## Principles

1. **Two-layer reading.** Every visualization must work at two altitudes: a 5-second plain-language takeaway for someone who just got their sample result, and a technically faithful layer for chemists and epidemiologists. The plain-language layer is never a dumbed-down replacement — it's an annotation layer on top of real data.
2. **Honest uncertainty.** Peak height ≠ purity. Trace ≠ harmless. Every spectral visualization carries a "How to read this" disclosure stating what the method can and cannot say.
3. **Harm reduction first.** Color and emphasis encode actionability (what should a person do differently), not moral judgment. No skull icons, no "danger drug" framing — the supply is the hazard, not the person.
4. **Real data.** Aggregate views are driven by real aggregates from this repository (`data/aggregates.json`, derived from 6,580 samples across 11 US states). Spectra are clearly labeled "illustrative" (`data/spectra.json`): peak positions reflect characteristic fragments/bands, intensities are approximate.
5. **Standalone.** Each HTML file is self-contained: inline data, CDN libraries only, opens from the filesystem with no build step.

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

- **Type:** `font-family: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif` for prose; `ui-monospace, "SF Mono", "Cascadia Mono", monospace` for m/z values, retention times, wavenumbers, sample IDs. Load Inter from Google Fonts with system fallback (must degrade gracefully offline).
- **Numbers are mono, units are muted:** `10.59 <span class="muted">min</span>`, `245 <span class="muted">m/z</span>`, `1645 <span class="muted">cm⁻¹</span>`.

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
