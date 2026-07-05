#!/usr/bin/env python3
"""Refresh visualization-framework/data/*.json from CSV aggregates + SQLite spectra.

Run from repo root:
  python pipeline/build_db.py
  python pipeline/export_viz_data.py
  python visualization-framework/build.py

Or use this script alone after build_db.py has populated pipeline/drugchecking.sqlite.
"""
from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

PIPELINE_DIR = Path(__file__).resolve().parent
if str(PIPELINE_DIR) not in sys.path:
    sys.path.insert(0, str(PIPELINE_DIR))

from viz_data.aggregates import build_aggregates
from viz_data.sqlite_spectra import (
    LIBRARIAN_DB,
    PIPELINE_DB,
    SPECTRA_JSON,
    merge_spectra_json,
)

ROOT = PIPELINE_DIR.parent
AGGREGATES_JSON = ROOT / 'visualization-framework' / 'data' / 'aggregates.json'


def _copy_librarian_db() -> None:
    if not PIPELINE_DB.exists():
        return
    LIBRARIAN_DB.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(PIPELINE_DB, LIBRARIAN_DB)


def main() -> None:
    if not PIPELINE_DB.exists():
        raise SystemExit(
            'pipeline/drugchecking.sqlite not found. Run `python pipeline/build_db.py` first.'
        )

    aggregates = build_aggregates()
    AGGREGATES_JSON.write_text(
        json.dumps(aggregates, indent=1, ensure_ascii=False) + '\n',
        encoding='utf-8',
    )

    _copy_librarian_db()
    spectra = merge_spectra_json(aggregates)
    SPECTRA_JSON.write_text(
        json.dumps(spectra, indent=1, ensure_ascii=False) + '\n',
        encoding='utf-8',
    )

    sample_count = len(spectra.get('samples', {}))
    reference_count = len(spectra.get('references', {}))
    chrom_count = len(spectra.get('chromatograms', {}))
    monthly_total = sum(row['n'] for row in aggregates['monthly_total'])
    print(
        f'wrote {AGGREGATES_JSON.relative_to(ROOT)} '
        f'({monthly_total} samples, {len(aggregates["top_substances"])} top substances)'
    )
    print(
        f'wrote {SPECTRA_JSON.relative_to(ROOT)} '
        f'({chrom_count} chromatogram options = archetypes + real samples, '
        f'{sample_count} in samples, {reference_count} references)'
    )


if __name__ == '__main__':
    main()
