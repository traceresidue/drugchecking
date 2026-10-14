# DECISIONS

Decisions made, and ideas parked on purpose. Newest first. Do not build parked items without moving them to TASKS.md.

## 2026-10-14 — RESOLVED: public domain removed by the owner; site is private again
**Action (owner):** removed `aptrealisticsimulation.vercel.app` from the Vercel project `drugchecking`.
**Verified after (unauthenticated requests, agent, 2026-10-14T13:54:47-05:00):** that host returns 404 `DEPLOYMENT_NOT_FOUND`, including
`/` and `/pipeline/drugchecking.sqlite`; `list_project_domains` returns no domains; the two `drugchecking-*aaron-bair-s-projects`
URLs still return 302 to Vercel SSO. `get_project` still lists the host under `domains`, which appears to be a stale alias list.
**Status:** supersedes the "publicly reachable" correction above. Visibility is again team-only via Vercel Authentication
(`ssoProtection: all_except_custom_domains`).
**Still true:** the GitHub repository is public and contains the same sqlite and data; "private" applies to the deployment only.
**Watch out:** any domain added to the project later is public under this scope. Re-check protection before adding one.
**Not known:** who added `aptrealisticsimulation.vercel.app`. [NEEDS VERIFICATION]

## 2026-10-14 — CORRECTION: the production site is publicly reachable (supersedes the "private" finding)
**Finding (checked ~13:50, unauthenticated requests):** `https://aptrealisticsimulation.vercel.app/` returns HTTP 200 and
serves this project's gallery, pages, `pipeline/drugchecking.sqlite` (4.1 MB) and `visualization-framework/data/*.json`.
The three `drugchecking-*aaron-bair-s-projects.vercel.app` URLs return 302 to Vercel SSO (protected).
**Why the earlier entry is superseded:** it recorded Vercel Authentication `all_except_custom_domains` with no custom
domains and concluded the site was private. A project domain `aptrealisticsimulation.vercel.app` now exists (it was not
in the earlier list, which had `drugchecking.vercel.app`, now 404) and is not covered by that scope. It went live with the
production deployment built from `main` at 13:46:37 after the fast-forward. Who added or renamed the domain is unknown.
**Context that bounds the exposure:** the GitHub repository `traceresidue/drugchecking` is PUBLIC (fork of `ectracy/drugchecking`)
and already contains the sqlite and data files. The client-side gate never protected data files in any case.
**Not changed:** no Vercel setting was altered by the agent (domains are an approval boundary in `AGENTS.md`).
**Owner decision needed:** (a) accept public, since the data is already public on GitHub; (b) remove the domain from the
project; (c) raise protection to cover all deployments or enable password protection (platform-level).
**Open:** whether `aptrealisticsimulation.vercel.app` was intentional. [NEEDS VERIFICATION]

## 2026-10-14 — `main` updated by fast-forward from the feature branch
**Decision:** `main` was moved from `4bca8ce06` to `62b111c70` by fast-forward (no PR, no merge commit, no force).
**Why:** `main` had no commits the branch lacked, so a fast-forward kept history linear and reversible; the owner
asked to go to `main` directly. The 43-commit range was scanned for secrets and large blobs first.
**Operational note:** SQLiteStudio had `pipeline/drugchecking.sqlite` open, which stopped Windows from removing the
file on branch switch (`main` does not track it). Close database tools before switching branches; the push itself
was done ref-to-ref and did not depend on the working tree.
**Approved by:** repository owner, in session, 2026-10-14.

## 2026-10-14 — Defer Notion; sync state is `Local ahead`
**Decision:** skip creating or confirming the Notion record for now. Because the repository is committed and
pushed and no Notion record exists, the sync state is `Local ahead` (not `Synced`, not `Needs review`).
**Why:** `Needs review` means conflicting or uncertain state; here there is no conflict, just no second copy.
`Synced` would claim agreement with a record that doesn't exist.
**Revisit:** when a Notion record is created: fill `PROJECT.md` Notion URL, compare, set `Synced`.
**Approved by:** repository owner, in session, 2026-10-14.

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
