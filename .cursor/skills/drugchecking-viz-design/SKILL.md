---
name: drugchecking-viz-design
description: >-
  Design guidance for drugchecking visualization HTML (D3, Plotly, Three.js) and
  Streamlit dashboards. Use when creating or editing files under
  visualization-framework/, viz HTML pages, or datasets/code/Streamlit/. Covers
  tokens, page anatomy, harm-reduction UX, creative layout variation, and
  verification. Read alongside visualization-framework/DESIGN_SYSTEM.md.
---

# Drug Checking Viz Design

Bridge global design skills to this repo's stacks: standalone D3 HTML, Plotly/Three.js CDN pages, and Streamlit dashboards.

## When to use

- Editing or creating any file in `visualization-framework/viz/`
- Changing shared viz styling or `DESIGN_SYSTEM.md`
- Building or updating Streamlit apps under `datasets/code/Streamlit/`
- Reviewing UI coherence across the 25-viz series

**Always read** [visualization-framework/DESIGN_SYSTEM.md](../../visualization-framework/DESIGN_SYSTEM.md) first.

## Complementary global skills

| Task | Skill |
|------|-------|
| New visual surface, distinctive layout | `frontend-design` |
| Pre-ship critique | `design-critique` |
| Labels, tooltips, disclosures | `ux-writing` |
| WCAG, keyboard, ARIA | `accessibility-expert`, `accessibility-auditing` |
| React/Next UI (if added later) | `web-design-guidelines`, `react-best-practices`, shadcn |
| `.canvas.tsx` artifacts | Canvas skill (built-in) |
| Browser verification | `control-ui`, `visual-qa-testing`, `verify-this` |

## Token discipline

Copy the full `:root` block from DESIGN_SYSTEM.md into every standalone HTML file (or reference inline consistently). Never invent ad-hoc hex in chart code — use `var(--c-fent)` etc.

**Extend the palette only when:**
- A new substance class is documented in aggregates data
- The addition is recorded in DESIGN_SYSTEM.md with contrast rationale

**Typography:**
- Prose & controls: `var(--font-sans)` — Inter + ui-sans-serif + system UI; **never serif**
- Numeric IDs, m/z, retention times, wavenumbers: `var(--font-mono)`
- In-chart `<select>`: class `dcf-ctl-select`
- Units in `.muted` class: `10.59 <span class="muted">min</span>`

## Page anatomy (HTML viz)

```
<header>  Nº XX · CATEGORY · title · one-sentence dek
<main>    chart(s) + controls
<details> How to read this
<footer>  provenance + harm reduction
```

Categories: GC–MS, MS, FTIR, SUPPLY, GEO, RESULT, EXPERIMENTAL.

## Streamlit mapping

When theming Streamlit apps to match the viz framework:

```python
# Approximate token mapping for st.markdown custom CSS
BG = "#0b0e14"
PANEL = "#121826"
INK = "#e8ecf4"
MUTED = "#8b94a8"
# Substance colors: --c-opioid #ff8a5c, --c-fent #ff5c7a, etc.
```

- Use `st.markdown(..., unsafe_allow_html=True)` for token CSS in a single `:root`-equivalent block
- Mono font for sample IDs and numeric columns
- Same substance-class colors for charts (Plotly/Altair color maps keyed to DESIGN_SYSTEM palette)
- Same harm-reduction tone in titles and help text — no fear iconography

## Creative variation policy

**Coherence (fixed across all 25 pages):**
- Color tokens and substance semantics
- Typography families
- Footer/provenance patterns
- Interaction grammar and a11y minimums

**Variation (rotate per page — avoid template sameness):**

| Dimension | Options |
|-----------|---------|
| Layout | asymmetric split, bento grid, single-focus hero chart, sidebar inspector, full-bleed map |
| Emphasis | one primary chart; secondary metrics de-emphasized (smaller, muted, or collapsible) |
| Motion | category-specific intro (spectral vs geo vs supply); state transitions 200–400ms; honor `prefers-reduced-motion` |
| Annotations | callout lines, inline badges, or deeper `details` content |

Before implementing, skim adjacent viz files in the series — pick an archetype not already overused.

## Spectral & data conventions

Follow DESIGN_SYSTEM.md for chromatograms, mass spectra, mirror plots, FTIR axis direction, CDN library pins, and illustrative vs aggregate data labeling.

## Verification

After UI changes:

| Surface | Steps |
|---------|-------|
| Standalone HTML viz | Open file in browser; DevTools → verify colors come from CSS variables; check keyboard/tap on controls |
| Interactive behavior | Use `control-ui` skill for a11y snapshot + screenshot when available |
| Accessibility claims | Use `verify-this` — baseline vs treatment with evidence |
| React/Next (future) | `web-design-guidelines` + `react-best-practices` |
| shadcn components (future) | shadcn MCP `get_audit_checklist` |

**Pre-delivery checklist:**
1. Squint test — one focal point
2. Token audit — no stray hex
3. Variation — not a card-wall clone
4. Coherence — fits the Nº series
5. A11y — contrast, keyboard, reduced motion
6. Honest uncertainty — "How to read this" where required

## Anti-slop

No gradients, emoji icons, box-shadow decoration, rainbow series colors, or uniform card grids without hierarchy. Match Canvas skill slop rules for analytical deliverables.
