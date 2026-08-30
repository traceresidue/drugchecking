"""B0 adapter: chemdictionary + the two demo CSVs shipped in datasets/.

This is a refactor of the original single-file build_db.py loader into the
adapter shape (adapters/base.py) -- same source files, same field mapping,
same output rows, so build_db.py continues to report identical
substances/samples/detections counts after the refactor (see
pipeline/test/test_unc_demo_adapter.py for the regression check).
"""
from __future__ import annotations

import csv
from pathlib import Path

from .base import BaseAdapter, ParsedBatch

ROOT = Path(__file__).resolve().parent.parent.parent

CHEMDICT_CSV = ROOT / 'chemdictionary' / 'chemdictionary.csv'
ANALYSIS_CSV = ROOT / 'datasets' / 'analysis_dataset.csv'
LAB_DETAIL_CSV = ROOT / 'datasets' / 'lab_detail.csv'

# Class-indicator columns in chemdictionary.csv -> substances.classes JSON.
CHEMDICT_CLASS_COLS = [
    'substituted_cathinones', 'designer_benzos', 'benzos', 'nitazenes',
    'opiates_opioids', 'synthetic_cannabinoids', 'meth_impurities',
    'mdma_impurities', 'cocaine_impurities', 'common_cuts',
    'heroin_impurities', 'cannabinoids', 'fentanyl_impurities',
    'pf_fent_impurities', 'ketamine_impurities',
]

# Shared provenance text: every UNC program/state dataset (demo, nc/,
# selfservice/*, labservice/) is governed by the same repo-wide community
# standards and law-enforcement-prohibition terms documented in the root
# README and datasets/README.md, so every adapter sourcing from this repo's
# datasets/ tree quotes the same `terms` string rather than each adapter
# re-wording it slightly differently.
DATASETS_TERMS = 'law-enforcement prohibition and attribution norms apply; see repo root README'


def _read_csv_rows(path: Path) -> list[dict]:
    with open(path, encoding='utf-8-sig', newline='') as f:
        return list(csv.DictReader(f))


def _load_cached_smiles(cid: str | None, smiles_dir: Path | None) -> str | None:
    """Look up a CID's canonical SMILES in the pipeline/cache/smiles/ cache
    resolve_smiles.py populates (see that script's docstring). Returns None
    -- never raises -- when there's no cid, no cache directory, no cache
    file for this cid, or the cache file is empty; any of those just leaves
    substances.smiles NULL for this row rather than failing the build."""
    if not cid or not smiles_dir:
        return None
    path = smiles_dir / f'{cid}.txt'
    if not path.exists():
        return None
    return path.read_text(encoding='utf-8').strip() or None


def parse_chemdictionary_rows(rows: list[dict], smiles_dir: Path | None = None) -> list[dict]:
    """chemdictionary.csv rows -> substances dicts. Shared so every adapter
    that needs to (re-)seed the chemdictionary uses the exact same mapping;
    in practice only UNCDemoAdapter calls this today since build_db.py's
    name_to_id cache is shared across all adapters in a single build() run.

    `smiles_dir`, when given, is pipeline/cache/smiles/ (resolve_smiles.py's
    cache directory, one <PubChemCID>.txt file per resolved CID) -- pass
    None (the default) to leave every row's smiles unset, e.g. from a caller
    that never resolved cache paths."""
    substances = []
    for row in rows:
        name = row['substance'].strip()
        if not name:
            continue
        classes = [c for c in CHEMDICT_CLASS_COLS if row.get(c, '').strip() == '1']
        cid = row.get('PubChemCID') or None
        substances.append(dict(
            name=name,
            pronunciation=row.get('pronunciation') or None,
            pubchem_cid=cid,
            cas=row.get('CAS') or None,
            unii=row.get('UNII') or None,
            common_role=row.get('commonrole') or None,
            smiles=_load_cached_smiles(cid, smiles_dir),
            classes=classes,
        ))
    return substances


def parse_analysis_dataset_rows(rows: list[dict], *, default_program: str | None = None,
                                 default_state: str | None = None) -> list[dict]:
    """`analysis_dataset.csv`-shaped rows (the demo file, datasets/nc/
    nc_analysis_dataset.csv, and every datasets/selfservice/<PROGRAM>/
    analysis_dataset.csv) -> samples dicts.

    Column sets vary slightly between variants (e.g. some lack `program`,
    `location`, or `texture_notes` -- see pipeline/adapters/program_datasets.py)
    so every field is read with `.get()` and a fallback rather than direct
    indexing, except `sampleid` which every variant has and which is required
    for the row to be meaningful as a sample.

    `default_program`/`default_state` are used when a variant's CSV has no
    `program`/`state` column of its own (e.g. datasets/nc/ and several
    selfservice/ programs) so samples from that adapter still carry a
    non-null program/state label rather than silently losing that
    provenance signal.
    """
    samples = []
    for row in rows:
        sample_id = (row.get('sampleid') or '').strip()
        if not sample_id:
            continue
        samples.append(dict(
            sample_id=sample_id,
            external_id=sample_id,
            program=row.get('program') or default_program,
            state=row.get('state') or default_state,
            county_fips=row.get('countyfips') or None,
            date_collected=row.get('date_collect') or None,
            expected=row.get('expectedsubstance') or None,
            color=row.get('color') or None,
            texture=row.get('texture') or None,
            notes=row.get('texture_notes') or None,
        ))
    return samples


class UNCDemoAdapter(BaseAdapter):
    """Loads chemdictionary.csv (-> substances) and the demo analysis_dataset
    / lab_detail CSVs (-> samples / detections) as the `unc-demo-datasets`
    source."""

    source_id = 'unc-demo-datasets'
    name = 'UNC Street Drug Analysis Lab -- demo datasets'
    url = 'https://github.com/opioiddatalab/drugchecking/tree/main/datasets'
    license = 'see datasets/README.md'
    terms = DATASETS_TERMS

    def fetch(self, cache_dir: Path) -> list[Path]:
        # These CSVs are already checked into the repo -- nothing to
        # download or cache, but we still verify they exist so a missing
        # file fails loudly at fetch() rather than deep inside parse().
        paths = [CHEMDICT_CSV, ANALYSIS_CSV, LAB_DETAIL_CSV]
        for p in paths:
            if not p.exists():
                raise FileNotFoundError(p)
        # pipeline/cache/smiles/ (resolve_smiles.py's one-time PubChem CID ->
        # SMILES cache) is optional: it won't exist until someone has run
        # that script with network access, so only pass it through to
        # parse() when it's actually there -- an empty/missing cache just
        # means every row's smiles comes back None, not a build failure.
        smiles_dir = cache_dir / 'smiles'
        if smiles_dir.is_dir():
            paths.append(smiles_dir)
        return paths

    def parse(self, raw_paths: list[Path]) -> ParsedBatch:
        by_name = {p.name: p for p in raw_paths}
        batch = ParsedBatch()

        batch.substances = parse_chemdictionary_rows(
            _read_csv_rows(by_name['chemdictionary.csv']), smiles_dir=by_name.get('smiles'))
        batch.samples = parse_analysis_dataset_rows(_read_csv_rows(by_name['analysis_dataset.csv']))

        for row in _read_csv_rows(by_name['lab_detail.csv']):
            substance = row.get('substance', '').strip()
            if not substance:
                continue
            # abundance in this demo file is 'trace'/'' rather than a number;
            # the primary/trace columns are the reliable signal and map to
            # confidence.
            raw_abundance = row.get('abundance') or ''
            abundance = float(raw_abundance) if raw_abundance.replace('.', '', 1).isdigit() else None
            confidence = 'primary' if row.get('primary') == '1' else ('trace' if row.get('trace') == '1' else None)
            batch.detections.append(dict(
                sample_id=row['sampleid'],
                substance=substance,
                method=row.get('method') or None,
                abundance=abundance,
                confidence=confidence,
            ))

        return batch
