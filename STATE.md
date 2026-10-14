# Current State

Status: `In progress`
Health: `On track`
Progress: `Not tracked`
Sync state: `Needs review`
Sync state values: `Synced | Local ahead | Notion ahead | Needs review`
Current phase: `Post-merge stabilization; scaffold adopted 2026-10-14`
Last verified: `2026-10-14` (see "What is verified" below)

## Repository

- Git: `Initialized`
- Branch: `claude/drug-checking-viz-expansion-9uwjyh`
- Remote: `origin` https://github.com/traceresidue/drugchecking.git (in sync at `f33c6d01b`; the scaffold-adoption commit is local until pushed)
- Working tree: `Clean after the scaffold-adoption commit`
- Baseline commit: `f33c6d01b`

## Current objective

Decide whether this branch goes to `main` (PR vs merge). Nothing else is open in `TASKS.md`.

## Blockers

- None for implementation.
- Notion record and URL not confirmed, so synchronization cannot be `Synced`. [NEEDS VERIFICATION]

## Risks or uncertainty

- `PROJECT.md` has three unverified fields (parent outcome, Notion URL, created date).
- Something other than the Claude sessions pushed commits to `origin` on 2026-10-14 (up to `0ecca9852`); source unidentified.
- Deployed-site privacy relies on Vercel Authentication staying on and no custom domain being added.
- That the Vercel project `drugchecking` is linked to this repo is not confirmed. [NEEDS VERIFICATION]

## Single next action

Decide whether this branch goes to `main`: open a PR or merge locally, then push `main` only with explicit approval.

---

# Session log (preserved)

## 2026-10-14

**Branch:** `claude/drug-checking-viz-expansion-9uwjyh` (pushed; in sync with origin at `f33c6d01b` before the scaffold-adoption commit)

### What changed
- Resolved leftover stash-pop conflict markers in `visualization-framework/src/02-chromatogram-explorer.js`
  and shipped the TIC rework (`14bafaa26`).
- Merged `claude/spectral-sourcer-6zvao0` into this branch (`60e6b8237`). It brought the pipeline
  adapters, `export_viz_data.py`, the Librarian app and the Design Lab layer. One conflict (page 02),
  resolved by rebuilding the HTML from source.
- Replayed the stashed work as three commits: MoNA adapter with a 351-record fixture (`a0db73c6f`),
  the React viz-lab app (`212e46d1a`), docs (`0ecca9852`).

### What is verified
| Claim | How | Kind |
|---|---|---|
| `pipeline/` unit tests pass (55) | `python -m unittest discover -s pipeline/test` | software |
| viz-lab type-checks | `tsc --noEmit` exit 0 | software |
| 45 of 45 built pages load with no console or page errors | `node test/check.js` (Playwright) | software |
| viz-lab JSON equals exporter output (byte-identical) | JSON compare vs `visualization-framework/data` | software |
| Page 02 looks right (smaller apex-snapped peak dots, RT labels) | owner opened it in a browser | manual, passes |

### Build
`python build.py` (no flags) builds 43 pages and leaves 0 tracked diffs. The encoding bug seen pre-merge was already fixed on the spectral-sourcer branch.

### Fixed this session (were pre-existing)
- `06b-ridgeline-3d`: registry declared only plotly but its shared include needs d3 (`registry.json`).
- `viz/index.html`: `review-previews/chromatogram-sample-3d.png` was missing; captured it.

### Housekeeping
- Stash and backup branch dropped after confirming every file was identical in HEAD (only the deliberately dropped REORG_PLAN differed).
- `cid-hash.md` idea parked in DECISIONS.md; `scratch_*.json` is now gitignored.
- `docs/ROADMAP.md` has a dated status table.

### Scaffold adoption (agent-project)
- Added `.agent/`, `CLAUDE.md`, `scripts/Test-AgentProject.ps1`, `PROJECT.md`; merged scaffold rules into `AGENTS.md` (original guide preserved verbatim as Part 2).
- Reshaped this file and `TASKS.md` to the scaffold fields. Pre-reshape content is preserved in the sections below and in git history.
- Handoff: `.agent/sessions/2026-10-14-1338-claude-code-sol-drugchecking.md`.
