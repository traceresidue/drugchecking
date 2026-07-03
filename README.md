# drugchecking

**Analytical chemistry and epidemiology of street drugs.**

Open data, analysis code, and visualization tools from the UNC Street Drug Analysis Lab's mail-in drug checking program ([streetsafe.supply](https://www.streetsafe.supply)). Community samples are analyzed by GC–MS (Thermo Q Exactive Orbitrap), results are standardized against a curated chemical dictionary, and everything is published here for harm-reduction programs, public-health analysts, and researchers.

> **Warning**
> These data are intended for public health use, to save lives. They are anonymous, do not conform to chain-of-custody requirements, and are explicitly prohibited from use in criminal prosecution or drug scheduling. See [`datasets/README.md`](datasets/README.md) for community standards.

---

## What's in this repository

| Path | What it is |
|------|------------|
| [`datasets/`](datasets/) | The core open datasets, each published in CSV, Stata `.dta`, Excel `.xlsx`, and SAS `.v8xpt`. See the layout below. |
| [`chemdictionary/`](chemdictionary/) | Canonical dictionary of every substance the lab has detected: standardized name, PubChem CID, CAS, UNII, and 1/0 drug-class flags. The source of truth for substance naming and classification. |
| [`spectra/`](spectra/) | GC–MS chromatogram images (~800 PNGs), named `<sampleid>.PNG`. Peak-labeled human-readable records live at [streetsafe.supply/results](https://www.streetsafe.supply/results). |
| [`druglists/`](druglists/) | Short list of common substances identified in community drug checking, with generation code. |
| [`docs/`](docs/) | Lab methods (citable), confirmatory-testing guidance, toxicology exposure assessment, data-flow graphics, and example analysis notebooks. |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | **Start here for a technical overview** — how the pieces fit together, the data model, and the build/publish flow. |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Expansion plan: JS/React enablement, spectral data pipeline, SQLite sample librarian. |
| [`visualization-framework/`](visualization-framework/) | 33 standalone, offline-capable HTML visualizations (MS, GC–MS, FTIR, supply trends, geographic, experimental) built from the datasets. Has its own [README](visualization-framework/README.md). |
| [`datasets/code/`](datasets/code/) | Production pipeline (Stata `.do` files), Streamlit dashboards, Altair notebooks, and NC county geodata. |
| [`textexport/`](textexport/) | Stata code that auto-generates plain-language result narratives. |
| [`status/`](status/) | `pending.csv` — samples received by the lab, awaiting results. |
| `build_index.py`, `vercel.json` | Password-gated landing page + Vercel deployment for the visualization framework. |

## The data model in one minute

Everything links on **`sampleid`**.

- **`datasets/analysis_dataset.*`** — WIDE, one row per sample: card metadata (date, location, expected substance), geocoded geography (county FIPS, state), and ~100 derived 1/0 flags (`lab_fentanyl`, `lab_xylazine_any`, …). `_any` means detected in primary *or* trace abundance.
- **`datasets/lab_detail.*`** — LONG, one row per substance detected per sample: standardized `substance` name, method, abundance, and PubChem CID / CAS / UNII cross-references.
- **`datasets/labservice/unc_gcms.*`** — public confirmatory/complementary GC–MS results (~22k rows), updated regularly.
- **`datasets/selfservice/<PROGRAM>/`** — the same two-file pattern (`analysis_dataset` + `lab_detail`) cut per participating program/state (NC, NV, OR, TN, WA, NY, …).
- **`spectra/<sampleid>.PNG`** — the chromatogram for that sample.
- **`chemdictionary/chemdictionary.csv`** — classifies each `substance` into drug classes; these flags are carried into both datasets for full traceability.

Details, codebook, and naming conventions: [`datasets/technical_details.md`](datasets/technical_details.md) and [`datasets/unc_druchecking_codebook.txt`](datasets/unc_druchecking_codebook.txt).

## Quick starts

**Analyst — grab the data directly:**

```
https://raw.githubusercontent.com/opioiddatalab/drugchecking/main/datasets/analysis_dataset.csv
https://raw.githubusercontent.com/opioiddatalab/drugchecking/main/datasets/lab_detail.csv
https://raw.githubusercontent.com/opioiddatalab/drugchecking/main/chemdictionary/chemdictionary.csv
```

**Visualizations — no build needed:**

```bash
open visualization-framework/viz/01-mirror-match.html   # any file in viz/ works offline
```

**Rebuild the visualizations after editing:**

```bash
cd visualization-framework
python3 build.py        # src/*.js + data/*.json → viz/*.html (standalone)
node test/check.js      # Playwright smoke test: all pages load without errors
```

**Streamlit dashboards:**

```bash
pip install -r datasets/code/Streamlit/requirements.txt
streamlit run datasets/code/Streamlit/Home.py
```

## Citing & methods

Lab methods text suitable for grants/papers: [`docs/lab_methods.md`](docs/lab_methods.md). Attribution is expected for any use of these data; publications should be open access with plain-language summaries returned to the communities the samples came from.

## License

See [LICENSE](LICENSE).
