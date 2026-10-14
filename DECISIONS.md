# DECISIONS

Decisions made, and ideas parked on purpose. Newest first. Do not build parked items without moving them to TASKS.md.

## 2026-10-14 — Adopt the agent-project scaffold; canonical key `drugchecking`
**Decision:** adopt `B:\ClaudeHub\templates\agent-project` for operational memory and closeout.
Canonical key is `drugchecking`. Machine for handoffs: Desktop (Sol).
**How:** copied only the missing files (no clobber); `AGENTS.md` merged as Part 1 (scaffold rules, verbatim) plus
Part 2 (original design guide, verbatim, 63 of 63 lines preserved); scaffold `README.md`, `STATE.md`, `TASKS.md`,
`DECISIONS.md` not copied; `STATE.md` and `TASKS.md` reshaped to scaffold fields with content preserved.
**Why:** one state, explicit sync status, and a closeout every session instead of relying on chat history.
**Not done:** Notion record and URL unconfirmed, so sync state stays `Needs review`.
**Approved by:** repository owner, in session, 2026-10-14.

## 2026-10-14 — Password gate switched off by default (`DCF_GATE`)
**Decision:** the gate is off unless `DCF_GATE=1` is set at build time. With it off, `index.html` redirects to
the gallery and the 44 built pages carry no guard.
**Why:** it was client-side only. `build_index.py` wrote the password into the page source, and each page only
checked that `localStorage.dcf_auth` existed (any value passes). It gave friction, not security, and locked out
local use when `MAIN_PASSWORD` wasn't set at build time. No password literal was ever committed to git.
**Gate-on mode is unchanged:** a `DCF_GATE=1` build is byte-identical to the previously committed pages.
**Parked: real access control (do not build yet).** It must be server-side, not client JS. Candidates to
evaluate when needed: (1) Vercel Deployment Protection / password protection, platform-level, no code;
(2) Vercel edge middleware with a signed session cookie; (3) an auth provider in front of the deployment.
When one lands, delete `DCF_GATE`, `AUTH_GUARD` and the gate branch of `build_index.py`.
**Deployment visibility (checked 2026-10-14 via Vercel API, read-only):** project `drugchecking` has Vercel
Authentication on (`ssoProtection: all_except_custom_domains`), password protection off, no custom domains.
So its `*.vercel.app` URLs require a Vercel login: the site is private. Chosen: stay private.
**Watch out:** adding a custom domain makes that domain public (`all_except_custom_domains`). Re-check protection
before adding one. That the Vercel project is linked to this GitHub repo was not confirmed. [NEEDS VERIFICATION]

## 2026-10-14 — Parked idea: composable compound fingerprint string (from `cid-hash.md`)
**Status:** idea only, nothing built. File removed from the repo root; content kept verbatim here.
Format: `<CID>#<BasePeak>-<RI>[ROLE]` — PubChem CID, GC-MS base peak (m/z) and retention index (or RT), role tag.
```
2519#194-1830[I] | 5462327#327-2600[R] | 5463990#327-2510[B]

## The Abundance-Sorted Composable String:
10836#58-4.50[ACT] | 3345#245-12.50[BAS] | 122177#146-11.20[BYP]d
```
Open questions if revived: RI vs RT in the second example (4.50, 12.50 look like minutes); role vocabulary (I, R, B, ACT, BAS, BYP); the trailing `d`.

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
