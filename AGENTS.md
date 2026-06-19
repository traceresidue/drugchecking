# Agent Guide — drugchecking

Index for AI agents working in this repository. Read this when starting UI, visualization, or dashboard work.

## Design system (primary)

| Resource | Path | When |
|----------|------|------|
| **Design tokens & conventions** | [visualization-framework/DESIGN_SYSTEM.md](visualization-framework/DESIGN_SYSTEM.md) | Any viz HTML, styling, or Streamlit UI |
| **Project rule** | [.cursor/rules/design-system.mdc](.cursor/rules/design-system.mdc) | Auto-applies to `visualization-framework/**` and `datasets/code/Streamlit/**` |
| **Project skill** | [.cursor/skills/drugchecking-viz-design/SKILL.md](.cursor/skills/drugchecking-viz-design/SKILL.md) | Creating/editing viz pages or Streamlit dashboards |

## Skill routing by task

| Task | Use |
|------|-----|
| D3 / Plotly / Three.js HTML in `viz/` | `drugchecking-viz-design` + DESIGN_SYSTEM.md |
| **Design Lab HTML in `viz2/`** | `drugchecking-viz-design` + DESIGN_SYSTEM.md (Design Lab section) |
| Streamlit dashboards | `drugchecking-viz-design` + design-system rule |
| New distinctive layouts | `frontend-design` (global) |
| Pre-ship UI review | `design-critique` (global) |
| Accessibility | `accessibility-expert` (global) |
| React / Next.js (if added) | `web-design-guidelines`, `react-best-practices`, shadcn plugin |
| `.canvas.tsx` analytical artifacts | Canvas skill (built-in) |
| Browser verification | `control-ui`, `verify-this` (cursor-team-kit plugin) |

Global skills installed via CLI live under [`.agents/skills/`](.agents/skills/).

## Data & provenance

- Aggregate views: real data from `visualization-framework/data/aggregates.json` (6,580 samples, 11 US states).
- Spectra: illustrative — label clearly in footer and "How to read this".
- Never commit secrets (`.env`, credentials, API keys).

## Post-change verification

Run the appropriate checks after UI changes — do not claim "polished" or "accessible" without evidence.

| Surface | Verification steps |
|---------|-------------------|
| **Standalone HTML viz** (`visualization-framework/viz/*.html`) | Open file in browser. DevTools: confirm colors use CSS variables from `:root`, not stray hex. Test keyboard focus and tap targets on controls. Check `prefers-reduced-motion`. Confirm header/main/details/footer anatomy and "How to read this" where required. |
| **Design Lab viz** (`visualization-framework/viz2/d-*.html`) | Rebuild with `python build-design.py` from `visualization-framework/`. Open via local server (`python -m http.server` in `viz2/` or parent). Toggle theme (dark/light), cycle all 10 palettes, switch label density (low/default/high). Confirm critique panel renders and live note updates. Verify chart colors follow palette via `DCFDesign.getClassColor` / CSS vars. |
| **Interactive behavior** | Use `control-ui` skill: a11y snapshot + screenshot after meaningful interaction changes. |
| **Accessibility claims** | Use `verify-this` skill: baseline vs treatment with captured evidence. |
| **Streamlit apps** | Run app locally; verify dark tokens, substance palette, mono numerics match DESIGN_SYSTEM.md. |
| **React / Next subproject** (future) | `web-design-guidelines` audit + `react-best-practices`. |
| **shadcn components** (future) | shadcn MCP `get_audit_checklist` (requires `components.json`). |

### Pre-delivery checklist (viz series)

1. Squint test — one clear focal point
2. Token audit — colors only via CSS variables
3. Variation — layout differs from generic card-wall template
4. Coherence — fits Nº series alongside sibling pages
5. A11y — contrast ≥ 4.5:1, keyboard, reduced motion
6. Honest uncertainty — methods/limits disclosure present

## Maintenance

- Update skills: `npx skills update` (from repo root)
- Review new design plugins: [Cursor Marketplace](https://cursor.com/marketplace)
