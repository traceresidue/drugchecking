"""Load merged analysis_dataset + lab_detail rows from all published CSV cuts."""
from __future__ import annotations

import csv
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent

MONTHS = {
    'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
    'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12,
}


def parse_stata_date(value: str | None) -> str | None:
    """Parse Stata-style dates like 31Oct2022 -> 2022-10."""
    text = (value or '').strip()
    if not text:
        return None
    match = re.match(r'(\d{1,2})([a-zA-Z]{3})(\d{4})', text)
    if not match:
        return None
    month = MONTHS.get(match.group(2).lower()[:3])
    if not month:
        return None
    return f'{int(match.group(3)):04d}-{month:02d}'


def _read_csv(path: Path) -> list[dict[str, str]]:
    with open(path, encoding='utf-8-sig', newline='') as handle:
        return list(csv.DictReader(handle))


def analysis_paths() -> list[Path]:
    paths = [ROOT / 'datasets' / 'analysis_dataset.csv']
    paths.extend(sorted((ROOT / 'datasets' / 'selfservice').glob('*/analysis_dataset.csv')))
    paths.append(ROOT / 'datasets' / 'nc' / 'nc_analysis_dataset.csv')
    return [p for p in paths if p.exists()]


def lab_detail_paths() -> list[Path]:
    paths = [ROOT / 'datasets' / 'lab_detail.csv']
    paths.extend(sorted((ROOT / 'datasets' / 'selfservice').glob('*/lab_detail.csv')))
    paths.append(ROOT / 'datasets' / 'nc' / 'nc_lab_detail.csv')
    return [p for p in paths if p.exists()]


def load_analysis() -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    seen: set[str] = set()
    for path in analysis_paths():
        for row in _read_csv(path):
            sample_id = row['sampleid']
            if sample_id in seen:
                continue
            seen.add(sample_id)
            rows.append(row)
    return rows


def load_lab_detail() -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    seen: set[tuple[str, str]] = set()
    for path in lab_detail_paths():
        for row in _read_csv(path):
            substance = (row.get('substance') or '').strip()
            if not substance:
                continue
            key = (row['sampleid'], substance.lower())
            if key in seen:
                continue
            seen.add(key)
            rows.append(row)
    return rows


def load_unc_gcms() -> dict[tuple[str, str], float]:
    """Map (sample_id, substance_lower) -> retention time in minutes."""
    path = ROOT / 'datasets' / 'labservice' / 'unc_gcms.csv'
    lookup: dict[tuple[str, str], float] = {}
    if not path.exists():
        return lookup
    for row in _read_csv(path):
        substance = (row.get('substance') or '').strip().lower()
        peak = (row.get('gcms_peak') or '').strip()
        if not substance or not peak or peak == '.':
            continue
        try:
            lookup[(row['sampleid'], substance)] = float(peak)
        except ValueError:
            continue
    return lookup


def load_chemdict_roles() -> dict[str, str]:
    path = ROOT / 'chemdictionary' / 'chemdictionary.csv'
    roles: dict[str, str] = {}
    for row in _read_csv(path):
        name = (row.get('substance') or '').strip()
        if name:
            roles[name.lower()] = (row.get('commonrole') or 'other').strip() or 'other'
    return roles


def demo_sample_ids() -> set[str]:
    ids: set[str] = set()
    path = ROOT / 'datasets' / 'analysis_dataset.csv'
    if path.exists():
        for row in _read_csv(path):
            ids.add(row['sampleid'])
    return ids
