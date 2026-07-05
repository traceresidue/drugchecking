# Agent Delegation

How this build used subagents, and the pattern to reuse for future work on
this tool. Written for both humans and future agent sessions.

## Why delegate at all

The pipeline (`pipeline/`, Python, stdlib-only) and the Librarian
(`web/apps/librarian/`, Vite/React/TS/sql.js) touch disjoint file trees,
disjoint toolchains, and require no coordination between their internals
beyond the already-frozen contract (`pipeline/schema.sql`). That makes them
a clean split: two subagents can build both in parallel with zero risk of
stepping on each other's files, instead of one context serially context-
switching between Python and TypeScript.

## Delegation structure used

```
Orchestrator (this session)
 ├─ writes spectral-sourcer/{README,ARCHITECTURE,BUILD_PLAN}.md up front
 │  (shared context both builder agents can be pointed at, and the record
 │  of decisions the orchestrator already made so builders don't re-litigate them)
 │
 ├─ Agent 1 — "pipeline builder" (background, general-purpose)
 │    Owns: pipeline/** only
 │    Given: full schema.sql, current build_db.py contents, the exact
 │      target adapter architecture, exact fixture/test requirements,
 │      explicit "don't touch files outside pipeline/" boundary, explicit
 │      "no git commit" boundary, explicit verification steps to run
 │      itself before reporting done (re-run build_db.py, diff row counts,
 │      run the test suite).
 │
 ├─ Agent 2 — "librarian builder" (background, general-purpose)
 │    Owns: web/apps/librarian/** only
 │    Given: full schema.sql, the dcf-library@1 contract, the exact
 │      feature list mapped to ROADMAP Track D phases D0-D2, the explicit
 │      "do not depend on packages/dcf-core or dcf-charts" boundary, the
 │      explicit DB-loading strategy (copy-to-public + file-picker
 │      fallback) so it doesn't invent a fragile approach, explicit
 │      verification steps (install, build, test, dev-server smoke check).
 │
 ├─ (after both report back) orchestrator reviews the actual diff of both
 │    (not just the agents' self-reports) — reads key files, re-runs the
 │    verification commands itself, and runs a code-review pass
 │
 ├─ orchestrator performs the one step neither agent could: end-to-end
 │    integration (build the real sqlite, point the real Librarian at it,
 │    drive it in an actual browser) — this is the seam between the two
 │    agents' work and is exactly where a bug neither agent could see
 │    (schema field mismatch, query assuming a column that isn't there,
 │    wrong relative path from app to database) would show up
 │
 └─ orchestrator updates this file + PROGRESS.md with what actually
      happened, and commits/pushes
```

## Why this split and not another one

- **Not split by "frontend vs backend" generically** — split by actual file-
  tree ownership (`pipeline/` vs `web/apps/librarian/`), which is what
  makes running them concurrently safe without a worktree.
- **Not one agent for "everything sourcing-related"** — the pipeline and
  the Librarian have almost no shared vocabulary in the actual code (one
  is SQL/Python, one is SQL-via-WASM/TypeScript); splitting let each
  prompt stay dense with only the context that agent needed, rather than
  a single prompt trying to hold both toolchains' worth of detail.
- **The orchestrator kept integration and review for itself** — a
  subagent grading its own work, or a subagent that only ever saw one
  side of the schema contract, is the weakest reviewer of exactly the
  bug most likely to exist (a mismatch at the boundary). Cross-checking
  both halves against the one frozen contract (`schema.sql`) was kept in
  the orchestrating session.

## Reuse checklist for next time

1. Identify the actual file-tree seam (not a topical one) before deciding
   how many agents to spawn.
2. Freeze the shared contract in writing (here: `schema.sql` +
   `dcf-library@1`) and paste it into *every* agent's prompt verbatim —
   don't rely on agents reading the same file and agreeing on an
   interpretation.
3. Give each agent an explicit "don't touch" boundary (file paths) and an
   explicit "don't commit" boundary — both matter more in parallel runs
   than in serial ones.
4. Require each agent to self-verify (build/test/run) before reporting
   done, but do not trust that as the final word — re-run verification
   yourself and read the actual diff.
5. Reserve integration testing and cross-cutting review for the
   orchestrating session, since it's the only participant that has seen
   both sides of the seam.

## This run's outcomes

See [`PROGRESS.md`](PROGRESS.md) for what the two agents actually produced,
what the review pass found, and what integration testing verified.
