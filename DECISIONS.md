# DECISIONS

Decisions made, and ideas parked on purpose. Newest first. Do not build parked items without moving them to TASKS.md.

## 2026-10-14 — Drop `docs/REORG_PLAN.md`
**Decision:** removed (still in git history at `0ecca9852`).
**Why:** it was written 2026-07-05 for branches that no longer matter (`cl/visualization-react`,
`claude/spectral-sourcer-6zvao0` as the working branch). The merge `60e6b8237` settled the branch
question it addressed, and it never mentioned viz-lab.
**Parked, not planned:**
- Move `spectral-sourcer/` docs under `docs/spectral-sourcer/` (product docs vs `process/` log), fixing relative links.
- Delete the retired branch `cl/visualization-react` (pure ancestor, nothing unique) locally and on origin.
- Redraw the ROADMAP target-layout diagram with `pipeline/` at repo root (it has no JS dependencies).
Only the third overlaps with the open ROADMAP refresh task in TASKS.md.

## 2026-10-14 — viz-lab data: real over simulated, newer if equal
**Decision:** where viz-lab data and framework data differ, prefer real cohort data over illustrative
archetypes; if both are equally real, prefer the more recently updated.
**Result:** after the merge `public/data/*.json` is byte-identical to the exporter output, so no
action is needed. `copy-assets.mjs` copying framework data over it is a no-op.
