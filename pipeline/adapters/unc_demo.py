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


def _read_csv_rows(path: Path) -> list[dict]:
    with open(path, encoding='utf-8-sig', newline='') as f:
        return list(csv.DictReader(f))


class UNCDemoAdapter(BaseAdapter):
    """Loads chemdictionary.csv (-> substances) and the demo analysis_dataset
    / lab_detail CSVs (-> samples / detections) as the `unc-demo-datasets`
    source."""

    source_id = 'unc-demo-datasets'
    name = 'UNC Street Drug Analysis Lab -- demo datasets'
    url = 'https://github.com/opioiddatalab/drugchecking/tree/main/datasets'
    license = 'see datasets/README.md'
    terms = 'law-enforcement prohibition and attribution norms apply; see repo root README'

    def fetch(self, cache_dir: Path) -> list[Path]:
        # These CSVs are already checked into the repo -- nothing to
        # download or cache, but we still verify they exist so a missing
        # file fails loudly at fetch() rather than deep inside parse().
        paths = [CHEMDICT_CSV, ANALYSIS_CSV, LAB_DETAIL_CSV]
        for p in paths:
            if not p.exists():
                raise FileNotFoundError(p)
        return paths

    def parse(self, raw_paths: list[Path]) -> ParsedBatch:
        by_name = {p.name: p for p in raw_paths}
        batch = ParsedBatch()

        for row in _read_csv_rows(by_name['chemdictionary.csv']):
            name = row['substance'].strip()
            if not name:
                continue
            classes = [c for c in CHEMDICT_CLASS_COLS if row.get(c, '').strip() == '1']
            batch.substances.append(dict(
                name=name,
                pronunciation=row.get('pronunciation') or None,
                pubchem_cid=row.get('PubChemCID') or None,
                cas=row.get('CAS') or None,
                unii=row.get('UNII') or None,
                common_role=row.get('commonrole') or None,
                classes=classes,
            ))

        for row in _read_csv_rows(by_name['analysis_dataset.csv']):
            batch.samples.append(dict(
                sample_id=row['sampleid'],
                external_id=row['sampleid'],
                program=row.get('program') or None,
                state=row.get('state') or None,
                county_fips=row.get('countyfips') or None,
                date_collected=row.get('date_collect') or None,
                expected=row.get('expectedsubstance') or None,
                color=row.get('color') or None,
                texture=row.get('texture') or None,
                notes=row.get('texture_notes') or None,
            ))

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
