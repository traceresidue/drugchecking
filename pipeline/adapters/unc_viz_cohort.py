"""Adapter: 40 diverse viz-cohort samples from merged analysis/lab CSVs."""
from __future__ import annotations

import csv
from pathlib import Path

from .base import BaseAdapter, ParsedBatch
from viz_data.cohort import COHORT_SIZE, select_viz_cohort_ids
from viz_data.datasets import analysis_paths, lab_detail_paths

ROOT = Path(__file__).resolve().parent.parent.parent


def _read_csv_rows(path: Path) -> list[dict]:
    with open(path, encoding='utf-8-sig', newline='') as handle:
        return list(csv.DictReader(handle))


class UncVizCohortAdapter(BaseAdapter):
    source_id = 'unc-viz-cohort'
    name = 'UNC viz cohort — 40 real samples for visualization exports'
    url = 'https://github.com/opioiddatalab/drugchecking/tree/main/datasets'
    license = 'see datasets/README.md'
    terms = 'law-enforcement prohibition and attribution norms apply; see repo root README'

    def fetch(self, cache_dir: Path) -> list[Path]:
        paths = analysis_paths() + lab_detail_paths()
        for path in paths:
            if not path.exists():
                raise FileNotFoundError(path)
        return paths

    def parse(self, raw_paths: list[Path]) -> ParsedBatch:
        by_name = {path.name: path for path in raw_paths}
        cohort_ids = set(select_viz_cohort_ids())

        analysis_rows: dict[str, dict] = {}
        for path in analysis_paths():
            for row in _read_csv_rows(path):
                sample_id = row['sampleid']
                if sample_id in cohort_ids:
                    analysis_rows[sample_id] = row

        batch = ParsedBatch()
        for sample_id in sorted(cohort_ids):
            row = analysis_rows.get(sample_id)
            if not row:
                continue
            batch.samples.append(dict(
                sample_id=sample_id,
                external_id=sample_id,
                program=row.get('program') or None,
                state=row.get('state') or None,
                county_fips=row.get('countyfips') or None,
                date_collected=row.get('date_collect') or None,
                expected=row.get('expectedsubstance') or None,
                color=row.get('color') or None,
                texture=row.get('texture') or None,
                notes=row.get('texture_notes') or None,
            ))

        for path in lab_detail_paths():
            for row in _read_csv_rows(path):
                sample_id = row['sampleid']
                if sample_id not in cohort_ids:
                    continue
                substance = (row.get('substance') or '').strip()
                if not substance:
                    continue
                confidence = 'primary' if row.get('primary') == '1' else ('trace' if row.get('trace') == '1' else None)
                batch.detections.append(dict(
                    sample_id=sample_id,
                    substance=substance,
                    method=row.get('method') or None,
                    abundance=None,
                    confidence=confidence,
                ))

        if len(batch.samples) != COHORT_SIZE:
            raise RuntimeError(f'expected {COHORT_SIZE} cohort samples, got {len(batch.samples)}')

        return batch
