# Spectral Sourcer

**An independent tool: source spectral drug-checking data into open formats, then browse it.**

This directory is the entry point for two components that live elsewhere in
this repo but are designed to be built, run, and reasoned about as a single
standalone unit, decoupled from the rest of the visualization framework
(Track A/C in [`docs/ROADMAP.md`](../docs/ROADMAP.md)):

| Component | Location | What it does |
|---|---|---|
| **Pipeline** | [`pipeline/`](../pipeline/) | Fetches/parses/normalizes/validates/loads GC–MS results, reference MS libraries, and FTIR reference spectra into one queryable SQLite database (`pipeline/drugchecking.sqlite`). |
| **Sample Librarian** | [`web/apps/librarian/`](../web/apps/librarian/) | A standalone React app (sql.js, runs entirely in the browser) that indexes, filters, searches, previews, compares, and lets you save/export named subsets ("libraries") of whatever the pipeline produced. |

Neither component depends on the unfinished parts of Track A
(`packages/dcf-core`, `packages/dcf-charts`) or on the visualization
framework's build system. You can build the database and run the Librarian
with nothing else in this repo working.

## Quickstart

```bash
# 1. Build the database from checked-in demo data + reference fixtures
python3 pipeline/build_db.py

# 2. Run the Librarian against it
cd web
npm install
npm run dev --workspace=@dcf/librarian
# open the printed localhost URL; the app auto-loads pipeline/drugchecking.sqlite,
# or use "Open database file..." to point at any drugchecking.sqlite
```

## Why these two things are "one tool"

The pipeline's only job is to produce a single artifact — a versioned
`drugchecking.sqlite` — that fully describes samples, detections, and
spectra (real and reference) with provenance. The Librarian's only job is to
read that one artifact and let a human explore it. Neither has any other
required integration point. That's the seam that makes this independent:
swap the pipeline's sources, or swap the Librarian's UI, and the other side
doesn't need to change as long as `pipeline/schema.sql` holds.

## Documents in this directory

- [`ARCHITECTURE.md`](ARCHITECTURE.md) — how the pipeline and Librarian actually work, data flow, format decisions, and why.
- [`BUILD_PLAN.md`](BUILD_PLAN.md) — phased build plan for this effort specifically (a focused subset of ROADMAP.md Tracks B and D), decisions made and why, what's deferred.
- [`AGENT_DELEGATION.md`](AGENT_DELEGATION.md) — how subagents were delegated to build this, what each one owned, and how the results were reviewed. Written so a future session can reuse the same delegation pattern.
- [`PROGRESS.md`](PROGRESS.md) — running log of what's been built, verified, and what's left.

For the full multi-track expansion plan this sits inside, see
[`docs/ROADMAP.md`](../docs/ROADMAP.md) (Track B, Track D) and
[`docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md) (current-state overview).
