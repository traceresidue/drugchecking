# Guide to Progress

Snapshot as of 2026-10-14. Branch: `claude/drug-checking-viz-expansion-9uwjyh`. Everything here is local; nothing has been pushed.

## Summary

This repo has three working parts: offline visualizations, a data pipeline, and a React web app folder. The pipeline tests pass, the visualizations load in a browser check apart from two older failures, and the React apps type-check. The main open items are two stale docs, two older page failures, some scratch files to clean up, and a decision about when to push.

Plain meaning: the work is saved and runs, but it is not yet shared anywhere. Nothing is lost if you stop here.

Live task list: `TASKS.md`. Current status and what was verified: `STATE.md`. Decisions and parked ideas: `DECISIONS.md`.

## Current state

| Part | Folder | What it is | Status |
|---|---|---|---|
| Visualizations | `visualization-framework/` | About 33 single-file HTML charts in `viz/`. They open offline in a browser. | Browser check: 43 of 45 pages ok. |
| Pipeline | `pipeline/` | Python scripts that build a SQLite database and export JSON for the charts. Standard library only. | 55 tests pass. |
| Web apps | `web/` | npm workspaces: `viz-lab` (20 curated charts, React), `librarian` (sample and reference browser, React + sql.js), `packages/dcf-core`. | `viz-lab` typecheck passes. `librarian` 15 tests pass. |

Recent local commits (newest first):

| Commit | What changed |
|---|---|
| `0ecca9852` | Docs: reorg plan and spectral-sourcer session log |
| `212e46d1a` | `viz-lab` React app with 20 pages |
| `a0db73c6f` | Pipeline: MoNA adapter now reads a 351-record fixture |
| `60e6b8237` | Merge of `claude/spectral-sourcer-6zvao0` |
| `14bafaa26` | TIC chromatogram explorer axes and peak markers reworked |

## Known issues

Plain meaning first, technical detail in the last column.

| # | Issue | Technical detail |
|---|---|---|
| a | Chart `06b-ridgeline-3d` does not load. | `d3 is not defined`. Existed before this work. |
| b | `viz/index.html` does not load one of its resources. | Pre-existing. |
| c | `docs/ROADMAP.md` does not mention the pipeline or `viz-lab`. | Written before those existed. |
| d | `viz-lab` README says 20 pages, but the folder holds 21 page files. | `web/apps/viz-lab/src/pages`. |
| e | Chart 02 (TIC) was checked for errors, not checked by eye. | Manual visual review still needed. |
| f | Root `index.html` is a generated login page. It needs a `MAIN_PASSWORD` environment variable. | Gitignored. Do not commit it. |
| g | Two untracked scratch files are waiting for a keep-or-delete decision. | `scratch_matched.json`, `cid-hash.md`. |
| h | A git stash and a backup branch are kept as safety nets. | Branch: `backup/staged-pre-merge-2026-10-14`. Drop only after confirming the merge. |
| i | Nothing is pushed. | No remote work has been done. |

## Next tasks

Do these in order. Each one should end with something that works. The live list is `TASKS.md`.

1. Look at the failures in chart 06b and `viz/index.html` (issues a and b).
2. Look at chart 02 in a browser (issue e).
3. Clean up: decide on the two scratch files, the stash, and the backup branch (issues g and h).
4. Fix the viz-lab README page count and update `docs/ROADMAP.md` (issues c and d).
5. Decide when to push, and to which remote. Ask before creating a new remote or branch.

## How to run and view

All commands are for PowerShell, from the repo root `B:\ClaudeHub\ClaudeCode\drugchecking` unless a line says otherwise. Both `python` and `python3` work in this shell (Python 3.14.4).

### Open one visualization (no setup needed)

Double-click `visualization-framework\viz\01-mirror-match.html`. It works offline. Any file in `viz\` works the same way.

### Rebuild the visualizations

```powershell
cd visualization-framework
python build.py
```

Builds 43 pages into `viz\`. Verified: it leaves no changes to tracked files.

### Rebuild the database and the exported JSON

```powershell
cd pipeline
python build_db.py
python export_viz_data.py
cd ..\visualization-framework
python build.py
```

`build_db.py` recreates `pipeline\drugchecking.sqlite` every run. `export_viz_data.py` refreshes `visualization-framework\data\*.json` and copies the sqlite into `web\apps\librarian\public\`.

### Run the viz-lab app

One-time setup:

```powershell
cd web
npm install
```

Then:

```powershell
cd web\apps\viz-lab
npm run dev
```

Open `http://localhost:5184` (the port is set in `vite.config.ts`). Stop it with Ctrl+C. The `predev` step copies the SQLite file from `pipeline\` into `public\` if it exists, and the exported JSON from `visualization-framework\data\`.

### Run the Sample Librarian

From `web\` (after `npm install` above):

```powershell
cd web
npm run dev --workspace=@dcf/librarian
```

Open `http://localhost:5183` (set in `vite.config.ts`).

If `pipeline\drugchecking.sqlite` exists, the app loads it. Otherwise use the "Open database file" button in the app. Any `.sqlite` file works with that button.

### Run each test suite

| Suite | Command | What good looks like |
|---|---|---|
| Pipeline (Python) | `python -m unittest discover -s pipeline/test -v` (repo root) | Ends with `OK`, 55 tests. Verified. |
| Visualizations (browser) | `cd visualization-framework` then `node test/check.js` | Ends with `2 of 45 failed`. The two failures are `06b-ridgeline-3d` and `index.html` (issues a and b). Verified. |
| viz-lab types | `cd web\apps\viz-lab` then `npm run typecheck` | No error lines. Verified. |
| viz-lab unit tests | `cd web\apps\viz-lab` then `npm run test` | There are no test files yet, so this exits with an error. Not a regression. |
| Librarian unit tests | `cd web\apps\librarian` then `npm run test` | 4 files, 15 tests passed. Verified. |

A passing run shows the command output. "It looks fine" is not a test result. For the viz-lab pages, a visual check by eye is still a separate step (issue e).

### Doc conflicts to know about

| Doc says | Current reality |
|---|---|
| `visualization-framework/README.md`: 25 visualizations, "0 of 25 failed" | About 33 files; latest run 43 of 45 pages ok. The README is out of date. |
| `visualization-framework/README.md`: `open viz/...` | macOS only. Use double-click on Windows. |

Everything above was checked on 2026-10-14.
