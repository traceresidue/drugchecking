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
| 45 of 45 built pages load with no console or page errors | `node test/check.js` (Playwright) | software |
| viz-lab JSON equals exporter output (byte-identical) | JSON compare vs `visualization-framework/data` | software |
| Page 02 looks right (smaller apex-snapped peak dots, RT labels) | not checked | NOT verified, needs a manual look |

### Build
`python build.py` (no flags) builds 43 pages and leaves 0 tracked diffs. The encoding bug seen pre-merge was already fixed on the spectral-sourcer branch.

### Fixed this session (were pre-existing)
- `06b-ridgeline-3d`: registry declared only plotly but its shared include needs d3 (`registry.json`).
- `viz/index.html`: `review-previews/chromatogram-sample-3d.png` was missing; captured it.

### Housekeeping
- Stash and backup branch dropped after confirming every file was identical in HEAD (only the deliberately dropped REORG_PLAN differed).
- `cid-hash.md` idea parked in DECISIONS.md; `scratch_*.json` is now gitignored.
- `docs/ROADMAP.md` has a dated status table.

### Next action
Look at page 02 in a browser (the only open task), then push. `docs/REORG_PLAN.md` was dropped (see DECISIONS.md). Full list in TASKS.md.
