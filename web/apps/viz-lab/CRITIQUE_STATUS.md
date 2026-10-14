# Critique Re-assessment — Visualization Lab (React)

Re-assessment of original Design Lab weaknesses (`visualization-framework/src/design/critiques.json`) against the shipped React pages in `web/apps/viz-lab/`. Pages excluded from this app (04, 06b/c, 08, 10, 12c, 17b/c, 20, 23, 25, 26–28, 33) are not listed.

**Global resolutions (all 20 pages)**

| Original weakness pattern | Resolution in viz-lab |
|---------------------------|----------------------|
| Hardcoded TOKENS / palette toggles | Single dark token system in `theme.css`; chart colors via `--c-*` CSS variables and `classColor()` |
| 10-palette / light theme toolbar | Removed — production app ships one coherent dark chrome |
| Label density toggles (low/default/high) | Simplified: top-N peak labels, collapsible legends, mobile rail collapse |
| Design Lab critique live notes | Static `DesignNotes` panel records thesis + resolved weaknesses per page |

---

## 01 — Spectral Mirror Match

| Weakness | Status | Notes |
|----------|--------|-------|
| Score below chart | **Resolved** | `viz-mirror-layout` left rail |
| Peak label crowding | **Resolved** | Top 5 peaks; mobile horizontal score strip |
| Hardcoded TOKENS | **Resolved** | CSS variables throughout |
| No reduced label mode | **Partial** | Capped labels; no explicit low/high toggle |

## 02 — Chromatogram Explorer

| Weakness | Status | Notes |
|----------|--------|-------|
| Detail below chart | **Resolved** | Grid: chart left, inspector right |
| Minor peak labels | **Resolved** | Labels on tap selection; top peaks only on trace |
| Fixed TOKENS.info trace | **Resolved** | `var(--info)` |
| Full redraw on select | **Open** | D3 redraw on selection (acceptable for page size) |

## 03 — FTIR Overlay

| Weakness | Status | Notes |
|----------|--------|-------|
| Vertical control competition | **Partial** | Controls in `viz-controls` bar; spectrum full-width |
| Wavenumber tick density | **Open** | Standard axis ticks retained |
| Residual color hardcoded | **Resolved** | `var(--c-fent)` for residual |
| Chip stacking mobile | **Partial** | Flex-wrap controls |

## 05 — Chromatogram 3D

| Weakness | Status | Notes |
|----------|--------|-------|
| Fixed Night colorscale | **Resolved** | Plotly layout uses CSS-var-derived colorscale |
| Axis always visible | **Open** | Plotly defaults |
| No palette integration | **Resolved** | Single palette; no toggle needed |
| Light scene | **N/A** | Dark-only app |

## 06 — Spectral Ridgeline (+ class fills)

| Weakness | Status | Notes |
|----------|--------|-------|
| No label density tiers | **Partial** | Row labels on hover; outline vs fill toggle merged |
| Hardcoded grid | **Resolved** | `var(--line)` |
| 06a fill obscures peaks | **Mitigated** | Toggle between outline and class-fill modes |
| 06b/c variants | **N/A** | Excluded from final set |

## 07 — FTIR Waterfall

| Weakness | Status | Notes |
|----------|--------|-------|
| Fixed violet colorscale | **Resolved** | Palette-aware Plotly colorscale helper |
| No classify integration | **Open** | Time-series stack, not per-substance |
| Axis density | **Open** | Plotly defaults |

## 09 — Sonification

| Weakness | Status | Notes |
|----------|--------|-------|
| Stick labels during playback | **Partial** | Labels static; transport bar separated |
| Playhead not palette-aware | **Resolved** | `var(--ink)` playhead |
| No reduced-motion alt | **Resolved** | Audio requires explicit user click; respects `prefers-reduced-motion` in CSS |
| Audio a11y limited | **Open** | Experimental; disclosed in footer |

## 11 — Supply Streamgraph

| Weakness | Status | Notes |
|----------|--------|-------|
| Legend always visible | **Resolved** | Legend in collapsible `<details>` |
| Sparse quarterly labels | **Open** | Quarterly ticks + hover tooltips |
| Hardcoded band colors | **Resolved** | `--c-*` via `CLASS_COLORS` |
| Wiggle confusion | **Mitigated** | Stacked % toggle retained |

## 12 — Co-occurrence (chord / nested / sankey)

| Weakness | Status | Notes |
|----------|--------|-------|
| Arc label truncation | **Partial** | Top-N filter; layout toggle reduces clutter |
| No focal ring | **Resolved** | Hover emphasis on active arc |
| Fixed ribbon opacity | **Partial** | Opacity scales with co-occurrence weight |
| 12a/12b merged | **Resolved** | Single page with layout toggle |
| 12c undirected | **N/A** | Excluded |

## 13 — Expected vs Detected Sankey

| Weakness | Status | Notes |
|----------|--------|-------|
| Node label crowding | **Partial** | Tooltips; top flows only |
| Link colors not synced | **Resolved** | Target class via `substanceColor()` |
| No label tiers | **Open** | Sankey node labels always on |

## 14 — Horizon Wall

| Weakness | Status | Notes |
|----------|--------|-------|
| 22 rows on mobile | **Partial** | Scrollable panel; sticky labels |
| Fixed opacity tiers | **Open** | 25/55/85% retained for layer grammar |
| No collapsible groups | **Open** | Future enhancement |

## 15 — Emergence Beeswarm

| Weakness | Status | Notes |
|----------|--------|-------|
| Large-dot labels always on | **Partial** | Labels on dots >250 detections only |
| Grid noise | **Resolved** | Minimal grid in dark theme |
| Slow collision on resize | **Open** | Force simulation restarts on resize |

## 16 — Supply Terrain 3D

| Weakness | Status | Notes |
|----------|--------|-------|
| Fixed fent colorscale | **Resolved** | CSS-var Plotly colorscale |
| No class semantics on Z | **Open** | Count surface, not class-colored |
| Z-axis labels | **Open** | Plotly defaults |

## 17 — Adulterant Network

| Weakness | Status | Notes |
|----------|--------|-------|
| Redundant legend | **Partial** | Class legend compact |
| No label density | **Open** | Node labels on hover |
| Resize re-simulates | **Open** | Expected for force layout |
| Uniform link color | **Resolved** | Link width encodes strength; `var(--line)` base |

## 18 — Result Card

| Weakness | Status | Notes |
|----------|--------|-------|
| Generic panel | **Resolved** | Document sheet layout with accent structure |
| Fixed peak label threshold | **Partial** | Major peaks labeled on chromatogram |
| Inline HTML color strings | **Resolved** | CSS variables + `substanceColor()` |
| Print/light optimization | **N/A** | Dark-only app |

## 19 — Expected-Reality Gap

| Weakness | Status | Notes |
|----------|--------|-------|
| Labels without density tiers | **Partial** | Labels only in reality mode |
| Grid always visible | **Open** | Minimal RT grid |
| Morph colors | **Resolved** | `substanceColor()` interpolation |
| Single toggle | **Open** | Binary expected/reality (by design) |

## 21 — Tile-Grid Cartogram

| Weakness | Status | Notes |
|----------|--------|-------|
| State labels always on | **Open** | Required for cartogram reading |
| Hardcoded inferno/fent scales | **Resolved** | `var(--c-fent)` / `var(--c-xyl)` scales |
| Legend always visible | **Partial** | Metric tabs replace separate legend |

## 22 — Xylazine Spread

| Weakness | Status | Notes |
|----------|--------|-------|
| County labels dense | **Partial** | Top 10 counties only |
| Play controls | **Resolved** | Sticky month readout + play/pause |
| Hardcoded xyl colors | **Resolved** | `var(--c-xyl)` |
| Panel competition | **Partial** | Stacked layout: map → area → counties |

## 24 — Anatomy Scrolly

| Weakness | Status | Notes |
|----------|--------|-------|
| Peak labels without density | **Partial** | Labels appear as peaks are added |
| Step copy always on | **Open** | Scrolly requires visible copy |
| Final panel border | **Resolved** | `var(--ok)` accent |
| Resize rebuild | **Open** | IntersectionObserver + D3 redraw |

## chromatogram-sample-3d — Sample TIC Time Stack

| Weakness | Status | Notes |
|----------|--------|-------|
| Cohort ID ordering | **Open** | Documented in provenance |
| Overlap wash obscures labels | **Partial** | Foreground trace ink stroke |
| No back-layer legend | **Open** | Time slider identifies foreground |
| Light theme blend | **N/A** | Dark-only app |

---

## Verification summary

| Check | Result |
|-------|--------|
| `npm run typecheck` | Pass |
| `npm run build` | Pass (Plotly chunk ~4.7MB lazy-loaded) |
| Preview capture | `npm run capture` → `review-previews/*.png` |
| A11y baseline | Sans-only typography; 40px tap targets on controls; `prefers-reduced-motion` in theme; keyboard nav on sidebar links |
| Data wiring | `drugchecking.sqlite` via sql.js + `aggregates.json` / `spectra.json` copied at prebuild |

## Remaining cross-cutting gaps (acceptable for v1)

1. No explicit label-density toggle (replaced by simpler defaults)
2. Plotly-heavy pages (05, 07, 16) retain vendor axis chrome
3. Force/chord pages re-layout on window resize
4. Light/print theme not in scope (dark-only production app)
