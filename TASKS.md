# TASKS

One active task at a time. Park new ideas at the bottom instead of building them.

## Active
- [ ] **Decide the deployed site's visibility** (gate-off change is committed locally, not pushed): keep public, or enable Vercel's own password protection, then push.
- [ ] **Look at page 02 (TIC) in a browser** and confirm the rework reads well: peak dots, RT labels, tooltip TIC %. Done when you've seen it and noted anything to change here.

## Next (in order)
- [ ] Decide whether this branch goes to `main` (and how: PR vs merge). Pushing the branch itself is done.

## Done
- [x] `build.py` encoding: already fixed on the spectral-sourcer branch, arrived via the merge; plain `python build.py` builds 43 pages, 0 tracked diffs (2026-10-14).
- [x] `docs/REORG_PLAN.md` dropped; ideas parked in DECISIONS.md (2026-10-14).

- [x] 06b `d3 is not defined` and `viz/index.html` missing image fixed; `check.js` 0 of 45 failed (2026-10-14).

- [x] Housekeeping: scratch files handled, stash and backup branch dropped after verifying everything was committed (2026-10-14).
- [x] ROADMAP status table added and layout diagram corrected; viz-lab README "20 pages" is correct (19 numbered + sample-3d; 21st file is HomePage) (2026-10-14).

- [x] Branch pushed to origin, fast-forward, no secrets in the range (2026-10-14). Note: origin had already received commits up to `0ecca9852` from something other than this session; source unidentified.

## Parked (do not start)
- Real, server-side access control for the deployed site (see DECISIONS.md, 2026-10-14). Until then the gate is off by default.
- Track B2/B3: live external source fetching, real mzML ingestion.
- Track D3: hand-off links from the Librarian into the visualizations.
- Track C: wiring `dcf-library@1` into the existing visualizations.
- Open design items in `web/apps/viz-lab/CRITIQUE_STATUS.md` (label-density tiers, axis density, collapsible groups).
