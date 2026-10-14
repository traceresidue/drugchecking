# Reorganize branches and docs to reflect standalone elements

*(Proposed plan, not yet executed — written 2026-07-05 for review.)*

## Context

Two feature branches exist: `cl/visualization-react` (Track A0/A1 web/
scaffold + minimal Track B0 pipeline, built in an earlier session) and
`claude/spectral-sourcer-6zvao0` (current branch). Investigation confirms
`cl/visualization-react` is a **pure git ancestor** of `spectral-sourcer`
(`git merge-base` = `cl/visualization-react`'s tip, `--is-ancestor` = true) —
spectral-sourcer contains every commit from visualization-react plus three
more: full pipeline adapter architecture with real MSP/JCAMP-DX parsers
(43/43 tests passing), a standalone Sample Librarian (Vite+React+sql.js), and
a `spectral-sourcer/` planning-doc directory. There is no divergence to
reconcile — just a branch to retire and documentation to bring in line with
what's actually been built, now that the repo contains four genuinely
separate standalone deliverables:

1. `visualization-framework/` — offline single-file HTML viz (Python-built,
   must stay independently `file://`-openable per ROADMAP's explicit
   "additive, not destructive" / harm-reduction-offline constraint)
2. `pipeline/` — stdlib-only Python data pipeline (zero third-party deps)
3. `web/packages/dcf-core` — typed TS core, Track A, tied to the eventual
   viz-framework migration
4. `web/apps/librarian` — standalone React+sql.js app, explicitly documented
   as *not* depending on `dcf-core`/`dcf-charts`

The goal of this change is to make the branch/doc state match that reality:
retire the subsumed branch, and consolidate the `spectral-sourcer/`
planning docs into `docs/` while keeping product docs and process/build-log
docs visibly separated by folder (per user direction: consolidate, but keep
scope/origin distinguishable).

## 1. Retire `cl/visualization-react`

- Confirm no uncommitted work is uniquely on that branch (it's a pure
  ancestor, so nothing to lose).
- Delete the local branch: `git branch -d cl/visualization-react` (safe
  delete; succeeds because it's fully merged into spectral-sourcer's
  history).
- If `origin/cl/visualization-react` exists, delete the remote branch too:
  `git push origin --delete cl/visualization-react`.
- No action needed on `claude/spectral-sourcer-6zvao0` itself — keep working
  on it as-is (user opted not to rename before eventual merge to main).

## 2. Consolidate `spectral-sourcer/` into `docs/spectral-sourcer/`

Move the directory under `docs/`, splitting product docs from process/build
docs so each retains its distinct scope:

```
docs/
  ROADMAP.md                    (updated, see §3)
  ARCHITECTURE.md               (updated, see §3)
  spectral-sourcer/
    README.md                   product front-door (from spectral-sourcer/README.md)
    ARCHITECTURE.md             durable design notes (from spectral-sourcer/ARCHITECTURE.md)
    process/
      BUILD_PLAN.md             from spectral-sourcer/BUILD_PLAN.md
      AGENT_DELEGATION.md        from spectral-sourcer/AGENT_DELEGATION.md
      PROGRESS.md                from spectral-sourcer/PROGRESS.md
```

Use `git mv` for each file (preserves history) rather than delete+recreate.

**Fix relative links** in the moved files — they currently assume the
directory sits at repo root (one `../` to reach `pipeline/`, `web/`,
`docs/`); after the move they need an extra `../`:
- `docs/spectral-sourcer/README.md`: `../pipeline/` → `../../pipeline/`,
  `../web/apps/librarian/` → `../../web/apps/librarian/`,
  `../docs/ROADMAP.md` → `../ROADMAP.md`, `../docs/ARCHITECTURE.md` →
  `../ARCHITECTURE.md`
- `docs/spectral-sourcer/ARCHITECTURE.md`: `../docs/ROADMAP.md` →
  `../ROADMAP.md`
- `docs/spectral-sourcer/process/BUILD_PLAN.md`: `../docs/ROADMAP.md` →
  `../../ROADMAP.md` (one extra level for the `process/` subfolder)

Confirmed no other file in the repo (`README.md`, `AGENTS.md`,
`docs/ROADMAP.md`, `docs/ARCHITECTURE.md`) currently references the
`spectral-sourcer/` path, so this move has no other inbound links to fix.

## 3. Bring `docs/ROADMAP.md` and `docs/ARCHITECTURE.md` up to date

`docs/ROADMAP.md` was last touched at commit `43272fd3a`, before the
pipeline adapters and Librarian were built — its phase table and target
layout are now stale:

- **Phase table**: mark B0 done, add a line noting B1 is done for the
  *parser* half only (real MSP/JCAMP-DX parsers, fixture-only data — no
  network fetch of real SWGDRUG/NIST libraries yet, per
  `pipeline/README.md`'s existing "what's real vs. documented" table). Mark
  Track D phases D0–D2 done (Librarian: index, viewer, compare tray,
  library export); D3 (hand-off links into the viz framework) remains
  undone.
- **Target layout diagram**: today's diagram nests `pipeline/` under `web/`.
  On disk it lives at repo root and has zero JS dependencies — nesting it
  under an npm-workspaces folder would misrepresent it as an npm package.
  Recommend updating the diagram to show `pipeline/` at repo root
  (matching reality) rather than moving the actual directory. Add a line
  to `web/apps/librarian/` in the diagram, referencing
  `docs/spectral-sourcer/README.md` for the combined pipeline+librarian
  product view.
- **Cross-link**: add a pointer from `docs/ROADMAP.md`'s Track B/Track D
  sections to `docs/spectral-sourcer/README.md` for implementation detail,
  so the two aren't discovered independently.
- `docs/ARCHITECTURE.md`: add a short section (or amend the existing
  "toolchain split" section) noting the pipeline/adapters and Librarian now
  exist, with a pointer to `docs/spectral-sourcer/`.

## 4. What's staying put (explicitly not moving)

- `pipeline/` stays at repo root — real, tested, stdlib-only; moving it
  under `web/` would suggest a false JS coupling it doesn't have.
- `web/apps/librarian/` stays where it is — it's already a correctly-scoped
  npm workspace member; its own README already states it's independent of
  `dcf-core`/`dcf-charts`.
- `visualization-framework/` is untouched (ROADMAP's explicit "unchanged
  during migration" principle).

## 5. Minor cleanup

- `web/package-lock.json` shows as modified in `git status` but `git diff`
  produces no content diff (line-ending artifact only) — discard with
  `git checkout -- web/package-lock.json` before committing, so the commit
  only contains the intended reorg.

## Verification

- `git log --oneline -3 -- docs/spectral-sourcer/README.md` shows history
  preserved through the `git mv`.
- Click through (or `grep -rn "\.\./"` on) the moved files to confirm no
  broken relative links remain — every `../pipeline`, `../web`, `../docs`
  reference should resolve to an existing path from its new location.
- `git branch -a` no longer lists `cl/visualization-react` (local or
  remote).
- `git status` is clean except for the intended reorg diff (no stray
  `package-lock.json` noise).
- Re-read `docs/ROADMAP.md` end-to-end once to confirm the phase table and
  diagram no longer contradict `pipeline/README.md` or
  `web/apps/librarian/README.md`.
