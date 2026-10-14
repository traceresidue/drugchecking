# Project Identity

Canonical key: `drugchecking`
Project name: `drugchecking`
Parent outcome: `[NEEDS VERIFICATION]`
Project type: `Code project`
Primary owner: `Luka (GitHub: traceresidue)`
Repository URL: `https://github.com/traceresidue/drugchecking`
Notion URL: `[NEEDS VERIFICATION]`
Authoritative local path: `B:\ClaudeHub\ClaudeCode\drugchecking`
Execution surfaces: `Claude Code, Cursor, Codex (second-opinion reviewer), Terminal`
Created: `[NEEDS VERIFICATION]` (repository history starts 2022-03-01 from the upstream project; this fork's start date is not recorded)
Last reviewed: `2026-10-14`

## Purpose

Deliver timely, honest, actionable street-drug-checking results to the people and programs that need them,
with visualizations populated by real sample results compared against authoritative references rather than
illustrative stand-ins. Harm-reduction tone throughout; method limits are disclosed (peak height is not purity).

## Scope

- `visualization-framework/`: offline single-file HTML visualizations built by Python (`build.py`).
- `pipeline/`: stdlib-only Python data pipeline (adapters, SQLite build, JSON export for the visualizations).
- `web/`: npm workspaces: `apps/viz-lab` (React visualization lab), `apps/librarian` (sample and reference
  browser), `packages/dcf-core` (shared typed core).
- Project memory and operating files at the repo root (`STATE.md`, `TASKS.md`, `DECISIONS.md`, `.agent/`).

## Definition of done

Per major phase; the current phase is defined by `TASKS.md` Now and the run card. At the repo level:

- `node test/check.js` (in `visualization-framework/`) reports 0 pages failed.
- `python -m unittest discover -s pipeline/test` passes.
- `npm run typecheck` passes in `web/apps/viz-lab`.
- `STATE.md`, `TASKS.md` and the latest session handoff reflect the result.

## Out of scope

Parked in `TASKS.md` and `DECISIONS.md`; do not absorb without a recorded decision:

- Live external source fetching and real mzML ingestion (Track B2/B3).
- Librarian hand-off links into the visualizations (Track D3) and library mode in the existing pages (Track C).
- Server-side access control for the deployed site.
- Moving `spectral-sourcer/` docs under `docs/`.

## Authority

- This project folder or repository is the authoritative operational-memory location.
- `STATE.md` contains the current project snapshot.
- `TASKS.md` contains the actionable work queue.
- `DECISIONS.md` contains durable decisions (append, do not rewrite).
- `.agent/sessions/` contains chronological handoffs.
- Notion contains the human-readable project metaview: `[NEEDS VERIFICATION]` whether a record exists.
- Git provides implementation history, attribution, rollback, and conflict resolution.

## Constraints

- Harm-reduction tone; no fear framing. Spectral visualizations must disclose method limits.
- Standalone visualizations must stay openable offline (`file://`); no CDN at runtime.
- Never commit secrets or `.env`. The in-page password gate is client-side only and off by default. The GitHub repository is public; do not commit anything that must stay private.
- Windows 11, PowerShell; Python 3.14, Node 24.
- Data licensing: MoNA records carry per-record Creative Commons licenses; treat them as provenance.

## Dependencies

- Vercel project `drugchecking`: Vercel Authentication on for its team URLs, but the project domain `aptrealisticsimulation.vercel.app` is public (checked 2026-10-14). Visibility decision pending; see `DECISIONS.md`.
- GitHub remote `origin` (`traceresidue/drugchecking`); `upstream` is the original project.
- Local reference spectra at `B:\ClaudeHub\ClaudeCode\spectra_library` (not in the repo).

## Links

- Plain-language overview and run steps: `GuideToProgress.md`.
- Roadmap with phase status: `docs/ROADMAP.md`. Build log: `spectral-sourcer/PROGRESS.md`.
- Repository: https://github.com/traceresidue/drugchecking
- Notion: `[NEEDS VERIFICATION]`
