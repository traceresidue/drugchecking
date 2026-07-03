# pipeline/

Track B of [`docs/ROADMAP.md`](../docs/ROADMAP.md): builds `drugchecking.sqlite`,
the queryable aggregate behind the Sample Librarian and the viz framework's
`data/*.json` exports.

```
python pipeline/build_db.py
```

Rebuilds `pipeline/drugchecking.sqlite` (gitignored) from scratch:

- `schema.sql` — the v1 schema (`sources`, `substances`, `samples`,
  `detections`, `spectra`, `libraries`, `library_members`, plus FTS5 search
  over substance names and sample notes).
- `substances` is seeded from [`chemdictionary/chemdictionary.csv`](../chemdictionary/chemdictionary.csv)
  (name, PubChem CID, CAS, UNII, common role, and a `classes` JSON array
  derived from chemdictionary's per-class indicator columns).
- `samples` and `detections` are loaded from the demo CSVs in
  [`datasets/`](../datasets/) (`analysis_dataset.csv`, `lab_detail.csv`,
  N=20) as the first `source` (`unc-demo-datasets`).

Every row in `samples`/`spectra` traces back to a `sources` row with a
license/terms note and a fetch timestamp — required for any data pulled in by
later phases (B1: SWGDRUG/NIST reference libraries; B2: DrugsData/Toronto
DCS/WEDINOS community results; B3: real GC–MS mzML ingestion).

Substance name matching between `chemdictionary` and `lab_detail.csv` is
case-insensitive exact match; anything in `lab_detail.csv` not already in
chemdictionary gets inserted with an empty `classes` array rather than
dropped, so no detection is silently lost.
