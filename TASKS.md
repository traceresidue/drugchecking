# TASKS

One active task at a time. Park new ideas at the bottom instead of building them.

## Active
- [ ] **Look at page 02 (TIC) in a browser** and confirm the rework reads well: peak dots, RT labels, tooltip TIC %. Done when you've seen it and noted anything to change here.

## Next (in order)
- [ ] Housekeeping: `scratch_matched.json` and `cid-hash.md` (untracked) -> ignore, delete or move to DECISIONS.md;
  drop `stash@{0}` and `backup/staged-pre-merge-2026-10-14` once happy.
- [ ] Reconcile viz-lab README ("20 pages") with `src/pages/` (21 files).
- [ ] Update `docs/ROADMAP.md` (predates the pipeline adapters and viz-lab).
- [ ] Decide when to push this branch and whether it goes to `main`.

## Done
- [x] `build.py` encoding: already fixed on the spectral-sourcer branch, arrived via the merge; plain `python build.py` builds 43 pages, 0 tracked diffs (2026-10-14).
- [x] `docs/REORG_PLAN.md` dropped; ideas parked in DECISIONS.md (2026-10-14).

- [x] 06b `d3 is not defined` and `viz/index.html` missing image fixed; `check.js` 0 of 45 failed (2026-10-14).

## Parked (do not start)
- Track B2/B3: live external source fetching, real mzML ingestion.
- Track D3: hand-off links from the Librarian into the visualizations.
- Track C: wiring `dcf-library@1` into the existing visualizations.
- Open design items in `web/apps/viz-lab/CRITIQUE_STATUS.md` (label-density tiers, axis density, collapsible groups).
