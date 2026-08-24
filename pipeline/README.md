# pipeline/

Track B of [`docs/ROADMAP.md`](../docs/ROADMAP.md): builds `drugchecking.sqlite`,
the queryable aggregate behind the Sample Librarian and the viz framework's
`data/*.json` exports.

```
python3 pipeline/build_db.py
```

works standalone from the repo root -- zero third-party dependencies (only
`csv`, `json`, `sqlite3`, `pathlib`, `datetime` from the standard library),
no dependency on the `web/` npm workspace.

Rebuilds `pipeline/drugchecking.sqlite` (gitignored) from scratch every run.

## Architecture: adapters

`build_db.py` is a thin orchestrator, not where the parsing logic lives:

```
pipeline/
  schema.sql            v1 schema: sources, substances, samples, detections,
                         spectra, libraries, library_members, + FTS5 tables
  build_db.py           loads schema.sql, runs each registered adapter,
                         populates FTS5, prints row counts
  adapters/
    base.py             the Adapter contract (BaseAdapter, ParsedBatch)
    unc_demo.py          B0 -- chemdictionary.csv + datasets/*.csv (real, tested)
    program_datasets.py   B0 extension -- every datasets/nc/ and
                          datasets/selfservice/<PROGRAM>/ analysis_dataset.csv,
                          one adapter/sources row per program/state (real,
                          tested); reuses unc_demo.parse_analysis_dataset_rows
                          rather than re-implementing the mapping
    unc_gcms.py            B0 extension -- datasets/labservice/unc_gcms.csv,
                          detections only, with gcms_peak -> detections.rt
                          (real, tested)
    msp_library.py        B1 -- NIST-format MSP reference MS spectra (real
                          parser, fixture-driven)
    jcamp_ftir.py         B1 -- JCAMP-DX reference FTIR spectra (real parser,
                          fixture-driven)
  fixtures/reference/    synthetic fixtures used ONLY to test the MSP/JCAMP
                         parsers -- not real SWGDRUG/NIST library data
  cache/                 gitignored; where a future network-fetching adapter
                         would cache downloaded raw files (empty today)
  test/                  unittest suite (stdlib `unittest`, no pytest --
                         nothing else in this repo's Python code uses
                         pytest, see datasets/code/, so we didn't introduce it)
```

Each adapter is one Python module implementing the `BaseAdapter` contract
from `adapters/base.py`:

```python
class MyAdapter(BaseAdapter):
    source_id = 'my-source'          # -> sources.source_id (primary key)
    name = 'Human-readable name'     # -> sources.name
    url = 'https://...'              # -> sources.url
    license = '...'                  # -> sources.license (be honest here)
    terms = '...'                    # -> sources.terms

    def fetch(self, cache_dir: Path) -> list[Path]:
        """Download into cache_dir (or point at a bundled fixture) and
        return the raw file paths."""

    def parse(self, raw_paths: list[Path]) -> ParsedBatch:
        """Read the raw files and return a ParsedBatch: plain-dict rows for
        substances/samples/detections/spectra, shaped like the schema.sql
        tables (see the docstring in adapters/base.py for exact keys)."""
```

`build_db.py` calls `fetch()` then `parse()` for every adapter in its
`ADAPTERS` list, inserts a `sources` row from the adapter's class attributes,
and loads the returned `ParsedBatch` with a shared set of loader functions
(`upsert_substances`, `load_samples`, `load_detections`, `load_spectra`).
Substances referenced by bare name (rather than by id) are resolved
case-insensitively against `substances.name` via `get_or_create_substance` --
the same pattern the original B0 loader used to link `lab_detail.csv` rows
to `chemdictionary.csv`, now shared by every adapter (an MSP/JCAMP reference
spectrum for "Fentanyl" links to the same `substances` row the demo dataset's
detections use).

**To add a new adapter:** write `adapters/my_source.py` implementing
`BaseAdapter`, add fixtures/tests under `fixtures/` and `test/` if it parses
a non-trivial format, and add an instance to `ADAPTERS` in `build_db.py`.
Nothing else needs to change -- `parse()` never touches sqlite directly, so
adapters are testable by calling `fetch()`/`parse()` and inspecting the
returned dicts, no database required.

## What's real and tested today vs. documented-only (future work)

| Adapter | Status |
|---|---|
| `unc_demo.py` | **Real, tested.** Loads the checked-in `chemdictionary.csv` and demo `datasets/analysis_dataset.csv` / `datasets/lab_detail.csv`. No network access -- these files are already in the repo. |
| `program_datasets.py` | **Real, tested.** Loads `datasets/nc/nc_analysis_dataset.csv` and every `datasets/selfservice/<PROGRAM>/analysis_dataset.csv` (`MI` is skipped -- it has no `analysis_dataset.csv`, only `michigan.html`) as one `sources` row per program/state. Samples only -- each program's own `lab_detail.csv` is out of scope for this extension. A handful of samples are distributed under more than one program directory (e.g. some `nc`/`hnc` and `TN`/`hnc` rows are identical physical samples); `samples.sample_id` is a global primary key, so the duplicate is attributed to whichever adapter loads it first (`ADAPTERS` order in `build_db.py`) rather than counted twice. |
| `unc_gcms.py` | **Real, tested.** Loads `datasets/labservice/unc_gcms.csv` (~22.6k rows) as detections only, mapping `gcms_peak` -> `detections.rt` (`"."` -> `NULL`, never `0`). About a third of its sample IDs have no matching `analysis_dataset.csv` row anywhere in this repo; `build_db.py`'s `load_detections` skips those (logged as a count, not silently) rather than violating the `detections.sample_id` foreign key. |
| `msp_library.py` | **Real parser, tested against a fixture.** Hand-written parser for the NIST/SWGDRUG "Key: value" MSP text format. Ships only `fixtures/reference/example.msp`, a synthetic 3-compound fixture authored for parser validation. **Does not fetch real SWGDRUG/NIST MSP libraries over the network** -- that's B1's documented-but-not-implemented remainder. |
| `jcamp_ftir.py` | **Real parser, tested against a fixture.** Hand-written JCAMP-DX parser (LDR key/value + value/point tables + ASDF-compressed `##XYDATA`). Ships only `fixtures/reference/example.jdx`, a synthetic 2-compound fixture. **Does not fetch real NIST WebBook JCAMP-DX exports over the network.** |
| `mona_json.py` | **Real parser, tested against a real, licensed 7-record excerpt of MoNA's actual GC-MS export** (`fixtures/reference/mona_sample.json`) -- unlike the MSP/JCAMP fixtures, this one is not synthetic: each record carries its own genuine CC BY / CC BY-SA / CC BY-NC-SA license in `meta.license`, so it's real reference-spectrum data, just a small subset. Point `mona_path=` at the full ~19k-record export (available at https://mona.fiehnlab.ucdavis.edu/downloads, not bundled here for size) to ingest more. |
| DrugsData.org, Toronto DCS, WEDINOS (B2) | Documented in `docs/ROADMAP.md` only. No adapter module exists yet. |
| Live SWGDRUG/Cayman/MassBank/NIST WebBook network fetch (B1/B3 "real" fetch path) | Documented only. `fetch()` in `msp_library.py`/`jcamp_ftir.py` currently returns the bundled fixture path, not a downloaded file -- there is no scraping or network I/O anywhere in this pipeline today. `mona_json.py` is the one exception: its fixture is real (see above), just not the full export. |
| Real mzML sample-spectrum ingestion (B3) | Documented only; no adapter module exists yet. |

**Nobody should read `spectra` rows with `format_origin IN ('MSP', 'JCAMP-DX')`
in the current build as real SWGDRUG/NIST reference data** -- check the
`sources.license`/`sources.terms` columns (both literally say "synthetic
fixture for parser validation; not redistributed licensed data") or the
`meta.comment` / fixture file header comments before treating any of this
as authoritative. `format_origin = 'MoNA-JSON'` rows are the exception --
these are real MoNA data; check `meta.license` per-row before reuse since it
varies record to record (CC BY vs CC BY-SA vs CC BY-NC-SA each impose
different reuse terms).

## How the MSP parser works

NIST/SWGDRUG MS reference libraries are distributed as MSP text: a sequence
of entries, each a block of `Key: value` header lines (`Name:`, `CAS#:`,
`DB#:`, `Comment:`, ...) followed by a `Num Peaks: N` line and then N
`(mz, intensity)` pairs (semicolon- or whitespace-separated). Entries are
blank-line separated. `msp_library.parse_msp_text()` is a small state
machine: accumulate header lines until `Num Peaks:` flips it into
peak-collection mode, then parse peak-list lines until a blank line (or an
unseparated new `Name:` line) closes the entry. Every parsed entry becomes
one `spectra` row: `technique='MS'`, `role='reference'`, `format_origin='MSP'`,
`peaks` = the `(mz, intensity)` list as JSON, linked to a substance by
case-insensitive name match on `Name:`.

Note: the MSP format uses `Key: value` lines, not `##KEY=value` -- that
`##`-prefixed syntax belongs to JCAMP-DX (below). The two are easy to
conflate by name; this pipeline implements the real, widely distributed MSP
notation so the parser works against genuine SWGDRUG/NIST exports, not just
against files matching a stricter reading of "MSP".

## How the JCAMP-DX parser works

JCAMP-DX (the ASTM/IUPAC open IR spectroscopy exchange format used by NIST
WebBook) is a sequence of `##KEYWORD=value` "Labelled Data Records" (LDRs),
some spanning multiple lines (e.g. the XY-data table), terminated by
`##END=`. `jcamp_ftir.parse_jcamp_text()`:

1. Splits the file into LDR blocks (`_split_ldr_blocks`), collecting
   continuation lines under their owning key and dropping `$$`-prefixed
   inline comments.
2. Reads `##TITLE`, `##CAS REGISTRY NO`, `##XUNITS`, `##YUNITS`,
   `##XFACTOR`/`##YFACTOR` (scale factors applied to raw values), and
   `##DELTAX` (the per-point X increment).
3. Decodes the point table from whichever of these is present:
   - `##XYDATA=(X++(Y..Y))` -- one X-checkpoint per line followed by a run
     of Y pseudo-digits. `_decode_asdf_values()` hand-implements the
     ASDF (ASCII Squeezed Difference Format) alphabet: plain numbers, SQZ
     (absolute-value pseudo-digits `@A-I`/`%a-i`), DIF (difference
     pseudo-digits `%J-R`/`%j-r`), and DUP (repeat-the-last-step
     pseudo-digits `S-Z`/`s`). This covers the common encodings used by
     NIST WebBook exports; it does not implement every edge case of the
     full 1988 ASDF spec (see the docstring in `jcamp_ftir.py`).
   - `##XYPOINTS=(XY..XY)` or `##PEAK TABLE=(XY..XY)` -- plain `x,y` pairs,
     no compression.
4. Each block becomes one `spectra` row: `technique='FTIR'`,
   `role='reference'`, `format_origin='JCAMP-DX'`, `peaks` = the decoded
   `(x, y)` list (after XFACTOR/YFACTOR scaling) as JSON, linked to a
   substance by case-insensitive name match on `##TITLE`.

## Running the tests

```
python3 -m unittest discover -s pipeline/test -v
```

Stdlib `unittest`, not pytest (nothing else in this repo's Python code --
see `datasets/code/`, which is Stata `.do` files plus a couple of ad hoc
scripts -- uses pytest, so we matched the no-new-dependency default rather
than introduce one). `pipeline/test/__init__.py` and a small per-file
`sys.path` bootstrap make `import build_db` / `from adapters... import ...`
work the same way tests do regardless of how the test runner discovers
these modules.

- `test_schema.py` -- schema.sql loads cleanly, FK pragma is on, expected
  tables/indexes exist, uniqueness/FK constraints are enforced.
- `test_unc_demo_adapter.py` -- the refactored B0 adapter reproduces the
  documented demo-dataset counts (156 chemdictionary substances + 2
  lab_detail-only substances = 158 total, 20 samples, 115 detections) both
  at the `parse()` level and end-to-end through `build_db.build()`.
- `test_msp_adapter.py` -- `example.msp` parses into exactly the peak
  counts/values it was authored with, correct `technique`/`role`/
  `format_origin`, and links to the real `fentanyl`/`acetaminophen`/
  `xylazine` chemdictionary rows.
- `test_jcamp_adapter.py` -- the ASDF decoder is pinned down with hand-
  computed unit cases, then `example.jdx`'s compressed `##XYDATA` block and
  plain `##PEAK TABLE` block both decode to the expected points, with the
  same substance-linkage check.

## Notes carried over from B0

Every row in `samples`/`spectra` traces back to a `sources` row with a
license/terms note and a fetch timestamp -- required for any data pulled in
by later phases (B2: DrugsData/Toronto DCS/WEDINOS community results; B3:
real GC-MS mzML ingestion).

Substance name matching is case-insensitive exact match; anything not
already in `chemdictionary.csv` gets inserted with an empty `classes` array
rather than dropped, so no detection or reference spectrum is silently lost.
