# no-viz Branch: Data Core & Library

**Purpose:** A focused branch for building the data acquisition, transformation, storage, and exploration layers of the drugchecking system — without the visualization framework.

**In scope:**
- **`web/`** — JS/React workspace (Track A): TypeScript core (`dcf-core`), data contracts (`dcf-data`), React components (`dcf-charts`), and the **Sample Librarian** (`apps/librarian`): a lightweight SQLite-backed index and browser for samples, detections, and spectra.
- **`pipeline/`** — Spectral data sourcing & storage (Track B): adapters for fetching diverse drug-checking data (local CSVs, authoritative reference libraries, community sources), parsing into open formats, and loading into SQLite. Currently: local CSV adapters for NC/selfservice datasets + unc_gcms labservice data; SMILES resolution from PubChem; structure for SWGDRUG MSP / NIST JCAMP / MoNA adapters.
- **`datasets/`**, **`chemdictionary/`**, **`spectra/`** — Raw data and metadata.
- **`docs/`** — ARCHITECTURE.md, ROADMAP.md (overall system context).

**Out of scope:**
- **`visualization-framework/`** — removed from this branch. The 33+ standalone HTML visualization pages live on other branches (e.g., `claude/wave2-hardening`). This branch does not build or maintain them.

**Key deliverable:** A SQLite database (`pipeline/drugchecking.sqlite`) populated with real samples, detections, and reference spectra, browsable and queryable through a React index interface (the Librarian), ready to hand off to visualization apps that read the schema.

---

## Quick starts

**Set up the pipeline:**
```bash
cd pipeline
pip install -r requirements.txt  # if a requirements.txt exists; otherwise pip install pytest
python3 -m pytest test -q       # run tests
python3 build_db.py             # build drugchecking.sqlite from datasets/ + adapters
```

**Start the Librarian (React + SQLite browser):**
```bash
cd web
npm install
npm run dev       # Vite dev server; Librarian app at apps/librarian
```

**Resolve SMILES (one-time, requires network):**
```bash
cd pipeline
python3 resolve_smiles.py       # fetches PubChem CIDs → SMILES, caches to pipeline/cache/smiles/
python3 build_db.py             # rebuilds with SMILES column populated
```

---

## What's been built (Stage 0 + P1 on this branch)

- **C-5 (Data coverage expansion):** Pipeline adapters load 6,580+ samples from NC, selfservice programs, and labservice GC–MS data (was N=20 demo set). Each source gets distinct provenance tracking.
- **P1 (SMILES resolution):** Schema migration (substances.smiles column) + PubChem CID resolver script. Caches to `pipeline/cache/smiles/`; gracefully handles network unavailability.
- **C-7 (CI bootstrap):** GitHub Actions workflow (`.github/workflows/ci.yml`) runs web, pipeline, and visualization-framework test suites (though viz-framework is out of scope on this branch).
- **C-2 (Auth honesty):** `build_index.py` password gate documented as a client-side visibility deterrent, not access control.

---

## Future work (Track B+, handled elsewhere)

- **Real reference libraries:** SWGDRUG MSP, NIST JCAMP-DX, Cayman, MoNA adapters → `spectra(role='reference')`.
- **Community sources:** DrugsData, Toronto DCS, WEDINOS adapters with provenance/license enforcement.
- **Real sample spectra:** mzML ingestion (msconvert + pyteomics) for raw instrument data; retention-time alignment.
- **Librarian completeness:** compare tray, library selection, hand-off contract (dcf-library@1) for passing libraries to viz apps.

---

## Branch relationships

- **`reviz2`** — Original implementation base; contains web/ and pipeline/ but with minimal data coverage.
- **`claude/wave2-hardening`** — Full Wave-2 expansion including 43+ visualizations, accessibility hardening, variant cleanup (excludes this branch's view).
- **`no-viz`** (this branch) — Data and library focus only; visualization framework removed to keep scope tight.

All three branches can coexist; `no-viz` is the narrowest scope.
