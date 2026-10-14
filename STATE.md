# STATE

Source of truth for where this repo is. Newest section first. See TASKS.md for what to do next
and GuideToProgress.md for a plain-language overview and run instructions.

## 2026-10-14

**Branch:** `claude/drug-checking-viz-expansion-9uwjyh` (local only, not pushed)

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
| 43 of 45 built pages load with no console or page errors | `node test/check.js` (Playwright) | software |
| viz-lab JSON equals exporter output (byte-identical) | JSON compare vs `visualization-framework/data` | software |
| Page 02 looks right (smaller apex-snapped peak dots, RT labels) | not checked | NOT verified, needs a manual look |

### Build
`python build.py` (no flags) builds 43 pages and leaves 0 tracked diffs. The encoding bug seen pre-merge was already fixed on the spectral-sourcer branch.

### Known failures (pre-existing on the spectral-sourcer branch, not caused by the merge)
- `viz/06b-ridgeline-3d.html`: `d3 is not defined` (page loads plotly only).
- `viz/index.html`: fails to load a resource.

### Safety nets still present
- `stash@{0}` (everything in it is committed except the two scratch files)
- branch `backup/staged-pre-merge-2026-10-14`

### Next action
Triage the two failing pages (`06b-ridgeline-3d`, `viz/index.html`). `docs/REORG_PLAN.md` was dropped (see DECISIONS.md). Full list in TASKS.md.
