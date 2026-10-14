# Tasks

One active task at a time. Park new ideas under Later instead of building them.

## Now

- [ ] **Decide the production site's visibility** (`aptrealisticsimulation.vercel.app` is public; see the DECISIONS.md correction). Options: accept public (the repo is public on GitHub), remove the domain, or raise Vercel protection. Needs the owner; no agent change to Vercel without approval.

## Next

- [ ] Decide whether to untrack and gitignore `web/apps/viz-lab/dist/` (42 tracked build-artifact files). Keep `web/packages/dcf-core/dist/`, which `build.py` consumes. Done when `git ls-files web/apps/viz-lab/dist` is empty (if yes) and `npm run build` in viz-lab still works.
- [ ] Run the shortened cross-agent smoke test from `VALIDATION.md` once (Codex to Claude and back).

## Later

(parked, do not start without a decision)

- Real, server-side access control for the deployed site (see DECISIONS.md, 2026-10-14). Until then the gate is off by default.
- Track B2/B3: live external source fetching, real mzML ingestion.
- Track D3: hand-off links from the Librarian into the visualizations.
- Track C: wiring `dcf-library@1` into the existing visualizations.
- Open design items in `web/apps/viz-lab/CRITIQUE_STATUS.md` (label-density tiers, axis density, collapsible groups).

## Waiting

- [ ] Notion record and URL for `drugchecking` (deferred by owner 2026-10-14). When it exists: fill the URL in `PROJECT.md`, compare, then set sync state to `Synced`.
- [ ] Owner to supply `PROJECT.md` unknowns: parent outcome, Notion URL, created date.
- [ ] Identify what pushed commits to `origin` on 2026-10-14 without a session push (GitHub Desktop auto-sync?).
- [ ] Owner to confirm the Vercel project `drugchecking` is linked to this repository, and whether `aptrealisticsimulation.vercel.app` was intentional.

## Completed

- [x] `main` fast-forwarded from `4bca8ce06` to `62b111c70` (43 commits, no force, no merge commit); range scanned for secrets first (2026-10-14).
- [x] `build.py` encoding: already fixed on the spectral-sourcer branch, arrived via the merge; plain `python build.py` builds 43 pages, 0 tracked diffs (2026-10-14).
- [x] `docs/REORG_PLAN.md` dropped; ideas parked in DECISIONS.md (2026-10-14).
- [x] 06b `d3 is not defined` and `viz/index.html` missing image fixed; `check.js` 0 of 45 failed (2026-10-14).
- [x] Housekeeping: scratch files handled, stash and backup branch dropped after verifying everything was committed (2026-10-14).
- [x] ROADMAP status table added and layout diagram corrected; viz-lab README "20 pages" is correct (19 numbered + sample-3d; 21st file is HomePage) (2026-10-14).
- [x] Branch pushed to origin, fast-forward, no secrets in the range (2026-10-14). Note: origin had already received commits up to `0ecca9852` from something other than this session; source unidentified.
- [x] Gate off by default (`DCF_GATE`); deployed site stays private via Vercel Authentication (checked, no change needed); pushed (2026-10-14). **Superseded 13:50:** `aptrealisticsimulation.vercel.app` is public; see the DECISIONS.md correction.
- [x] Page 02 TIC rework checked by eye by the owner: passes (2026-10-14).
- [x] Agent-project scaffold adopted: `.agent/`, `CLAUDE.md`, `PROJECT.md`, validation script added; `AGENTS.md` merged; `STATE.md` and `TASKS.md` reshaped (2026-10-14).
