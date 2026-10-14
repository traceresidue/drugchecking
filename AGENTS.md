# Agent Operating Rules

## Purpose

These rules apply to every human or automated agent working in this project.

## Required reading order

Before substantive work:

1. Read `PROJECT.md`.
2. Read `STATE.md`.
3. Read `TASKS.md`.
4. Read relevant recent entries in `DECISIONS.md`.
5. Read the most recent relevant session handoff in `.agent/sessions/`.
6. Inspect Git status and the current branch when Git is present.

Do not rely on a chat summary when the project files are available.

## Session startup

Before editing:

- Confirm the canonical project key.
- Confirm the current objective and single next action.
- Identify the active run card or create one from `.agent/templates/RUN-CARD.md`.
- State the definition of done.
- Identify files or systems that may be changed.
- Identify prohibited areas and approval boundaries.
- Confirm required tests.
- Stop when project sources conflict and mark the state `Needs review`.

## Execution rules

- Stay within the active run card.
- Preserve unrelated user changes.
- Do not silently broaden scope.
- Prefer small, reviewable changes.
- Test the behavior actually changed.
- Record material uncertainty.
- Do not declare completion without verification evidence.
- Never treat newer information as automatically authoritative.
- Preserve contradictory statements until a human or documented decision resolves them.
- Do not rewrite append-only decision or session history.
- Use Git branches for substantive work when practical.

## Approval boundaries

Require explicit human approval before:

- deleting files or data;
- changing production systems;
- modifying authentication or authorization;
- rotating secrets;
- running destructive migrations;
- changing billing, domains, or deployment ownership;
- force-pushing or rewriting shared Git history;
- resolving a material conflict between authoritative sources.

## Security rules

- Never store passwords, API keys, cookies, recovery codes, private keys, or raw secrets in Markdown, Notion, prompts, or Git.
- Real `.env` files must remain untracked.
- `.env.example` may contain variable names and safe placeholders only.
- Review `.gitignore` before the first commit.
- Default to non-administrator execution.
- Do not print secrets into logs or session handoffs.

## Required closeout

At the end of every meaningful session:

1. Update `STATE.md`.
2. Update `TASKS.md`.
3. Append a new session handoff under `.agent/sessions/`.
4. Append to `DECISIONS.md` only when a durable decision occurred.
5. Record files and systems changed.
6. Record commands and tests performed.
7. Record verification results.
8. Record blockers and uncertainty.
9. Record the Git branch or commit when available.
10. Refresh the `STATE.md` repository section from live Git status.
11. Set the synchronization state.
12. Record one next action.

Use `.agent/templates/CLOSEOUT.md` and `.agent/templates/SESSION-HANDOFF.md`.

## Conflict handling

When two sources conflict:

1. Preserve both statements.
2. Mark the synchronization or project state `Needs review`.
3. Identify the sources and exact contradiction.
4. Do not choose silently.
5. Request or locate an authoritative resolution.
6. Record the final decision in `DECISIONS.md`.

## Definition of complete

Work is complete only when:

- the run-card definition of done is met;
- required tests pass or failures are documented;
- project memory reflects the result;
- unresolved conflicts are visible;
- one next action is recorded;
- the synchronization state is explicit.

## Project-specific notes (drugchecking)

- Canonical project key: `drugchecking`.
- Authoritative operational memory: this repository (`PROJECT.md`, `STATE.md`, `TASKS.md`, `DECISIONS.md`, `.agent/sessions/`).
- Plain-language overview and run instructions: `GuideToProgress.md`.
- This file has two parts. Part 1 (above) is the agent-project operating scaffold and was merged in on 2026-10-14.
  Part 2 (below the rule) is the repository's original design, data and verification guide, preserved verbatim.
  When they appear to conflict, preserve both, mark the state `Needs review`, and ask.
- Client-side password gate: off by default; real access control is parked in `DECISIONS.md`. Never rely on it for privacy.

---

# Part 2: Design, data and verification guide (original, unchanged)

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

- Aggregate views: real data from `visualization-framework/data/aggregates.json` (refresh via `python pipeline/export_viz_data.py` from merged CSVs, 6,580 samples).
- Real sample chromatograms: `spectra.json → samples` (40 cohort exports from SQLite).
- Reference spectra: `spectra.json → references` (10 from librarian/pipeline SQLite).
- Illustrative archetypes: remaining `spectra.json` MS/FTIR/chromatogram entries — label clearly in footer and "How to read this".
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
