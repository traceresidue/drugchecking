"""B0 extension: the full-size program/state `analysis_dataset.csv` files
that sit alongside the N=20 demo set --  datasets/nc/nc_analysis_dataset.csv
and every datasets/selfservice/<PROGRAM>/analysis_dataset.csv.

Each program/state directory is its own `sources` row (distinct source_id)
rather than being merged into one -- these are separate drug-checking
programs/communities and the provenance distinction (which community a
sample arose from) matters for attribution per datasets/README.md's
community-standards expectations, even where the same physical sample
happens to also appear in a second directory (e.g. a handful of NC samples
are also distributed under datasets/selfservice/hnc/).

This module deliberately does NOT re-implement CSV parsing: it reuses
`unc_demo.parse_analysis_dataset_rows` (the exact same `analysis_dataset.csv`
-> samples mapping the demo adapter uses) and `unc_demo._read_csv_rows`, so
there is exactly one place that mapping lives. It also does not load any
`lab_detail.csv` files (per-program detection data is out of scope for this
extension -- see pipeline/adapters/unc_gcms.py for the detections source
that *is* in scope, datasets/labservice/unc_gcms.csv).

Programs are discovered dynamically from the datasets/selfservice/ directory
listing rather than hardcoded, so a directory with no analysis_dataset.csv
(datasets/selfservice/MI/ ships only michigan.html) is skipped automatically
instead of needing a special case, and a future program directory added the
same way (one analysis_dataset.csv per subdirectory) is picked up without
code changes.
"""
from __future__ import annotations

from pathlib import Path

from .base import BaseAdapter, ParsedBatch
from .unc_demo import DATASETS_TERMS, _read_csv_rows, parse_analysis_dataset_rows

ROOT = Path(__file__).resolve().parent.parent.parent
DATASETS_DIR = ROOT / 'datasets'
NC_DIR = DATASETS_DIR / 'nc'
SELFSERVICE_DIR = DATASETS_DIR / 'selfservice'

ANALYSIS_FILENAME = 'analysis_dataset.csv'
NC_ANALYSIS_FILENAME = 'nc_analysis_dataset.csv'


class ProgramSamplesAdapter(BaseAdapter):
    """Generic one-directory, one-CSV, one-`sources`-row adapter for an
    `analysis_dataset.csv`-shaped file: samples only, no substances/
    detections/spectra (chemdictionary is seeded once by UNCDemoAdapter;
    this program's own lab_detail.csv is out of scope -- see module
    docstring)."""

    def __init__(self, *, source_id: str, name: str, csv_path: Path, url: str,
                 default_program: str, default_state: str | None = None,
                 license: str = 'see datasets/README.md', terms: str = DATASETS_TERMS):
        self.source_id = source_id
        self.name = name
        self.csv_path = csv_path
        self.url = url
        self.default_program = default_program
        self.default_state = default_state
        self.license = license
        self.terms = terms

    def fetch(self, cache_dir: Path) -> list[Path]:
        if not self.csv_path.exists():
            raise FileNotFoundError(self.csv_path)
        return [self.csv_path]

    def parse(self, raw_paths: list[Path]) -> ParsedBatch:
        batch = ParsedBatch()
        rows = _read_csv_rows(raw_paths[0])
        batch.samples = parse_analysis_dataset_rows(
            rows, default_program=self.default_program, default_state=self.default_state,
        )
        return batch


def make_nc_adapter() -> ProgramSamplesAdapter:
    return ProgramSamplesAdapter(
        source_id='unc-nc',
        name='UNC Street Drug Analysis Lab -- North Carolina program dataset',
        csv_path=NC_DIR / NC_ANALYSIS_FILENAME,
        url='https://github.com/opioiddatalab/drugchecking/tree/main/datasets/nc',
        default_program='nc',
        default_state='NC',
    )


def discover_selfservice_programs() -> list[tuple[str, Path]]:
    """(program_code, csv_path) for every datasets/selfservice/<CODE>/
    directory that actually has an analysis_dataset.csv -- e.g. skips
    datasets/selfservice/MI/, which ships only michigan.html. Sorted by
    program code for deterministic adapter-registration order."""
    if not SELFSERVICE_DIR.is_dir():
        return []
    found = []
    for entry in sorted(SELFSERVICE_DIR.iterdir(), key=lambda p: p.name):
        if not entry.is_dir():
            continue
        csv_path = entry / ANALYSIS_FILENAME
        if csv_path.exists():
            found.append((entry.name, csv_path))
    return found


def make_selfservice_adapters() -> list[ProgramSamplesAdapter]:
    adapters = []
    for code, csv_path in discover_selfservice_programs():
        adapters.append(ProgramSamplesAdapter(
            source_id=f'unc-selfservice-{code.lower()}',
            name=f'UNC Street Drug Analysis Lab -- self-service program dataset ({code})',
            csv_path=csv_path,
            url=f'https://github.com/opioiddatalab/drugchecking/tree/main/datasets/selfservice/{code}',
            default_program=code,
        ))
    return adapters


def make_program_adapters() -> list[ProgramSamplesAdapter]:
    """All new sample-source adapters this extension adds: nc/ + every
    discovered selfservice/<PROGRAM>/. build_db.py extends its ADAPTERS list
    with this."""
    return [make_nc_adapter(), *make_selfservice_adapters()]
