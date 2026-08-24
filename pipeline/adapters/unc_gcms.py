"""B0 extension: datasets/labservice/unc_gcms.csv -- UNC's confirmatory/
complementary GCMS testing results, one substance per row, 22,651 rows as of
this writing. Detections-only: unlike unc_demo.py's lab_detail.csv, this
file has no accompanying analysis_dataset.csv of its own (it's a lab-results
export that references sample IDs collected by the demo/nc/selfservice
programs, and ~1,600 more sample IDs not covered by any analysis_dataset.csv
bundled in this repo -- see `load_detections` in build_db.py, which skips
any detection whose sample_id isn't already a known `samples` row rather
than crashing the whole build on a foreign-key violation).

Column mapping (see datasets/labservice/README.md's "Data Elements" table
for the authoritative field descriptions):
  sampleid    -> detections.sample_id (must already exist as a samples row)
  substance   -> detections.substance (resolved/created via
                 get_or_create_substance, same as every other adapter)
  method      -> detections.method ('GCMS' | 'Derivatized GCMS' | 'FTIR')
  gcms_peak   -> detections.rt (retention time, minutes). "." means missing
                 in this file -- treated as NULL, not 0.
  abundance   -> detections.confidence. Per the README: "Trace elements are
                 noted, and primary are left blank" -- i.e. confidence is
                 'primary' when abundance is blank and 'trace' for any
                 non-blank abundance value (observed values: '', 'trace',
                 'indication of' -- the latter two both read as "detected,
                 but below/at the primary-abundance threshold").
There is no numeric abundance value in this file (it's categorical, not a
percentage), so detections.abundance is always left NULL here, matching how
unc_demo.py's lab_detail.csv loader only populates it when the raw value is
actually numeric.
"""
from __future__ import annotations

from pathlib import Path

from .base import BaseAdapter, ParsedBatch
from .unc_demo import _read_csv_rows

ROOT = Path(__file__).resolve().parent.parent.parent
GCMS_CSV = ROOT / 'datasets' / 'labservice' / 'unc_gcms.csv'


def _parse_rt(raw: str | None) -> float | None:
    """gcms_peak -> rt. '.' and '' both mean "not recorded" in this file;
    any other non-numeric junk is treated the same way rather than raising,
    since a malformed retention-time cell shouldn't fail the whole row."""
    value = (raw or '').strip()
    if not value or value == '.':
        return None
    try:
        return float(value)
    except ValueError:
        return None


def _parse_confidence(raw_abundance: str | None) -> str:
    """'' (blank) -> primary, any other value (observed: 'trace',
    'indication of') -> trace. See module docstring / datasets/labservice/
    README.md."""
    return 'primary' if not (raw_abundance or '').strip() else 'trace'


class UNCGCMSAdapter(BaseAdapter):
    """Loads datasets/labservice/unc_gcms.csv as the `unc-labservice-gcms`
    source: detections only, with `rt` populated from `gcms_peak`."""

    source_id = 'unc-labservice-gcms'
    name = 'UNC Street Drug Analysis Lab -- confirmatory/complementary GCMS results'
    url = 'https://github.com/opioiddatalab/drugchecking/tree/main/datasets/labservice'
    license = 'see datasets/labservice/README.md'
    terms = ('confirmatory/complementary drug-checking service results; '
              'law-enforcement prohibition and attribution norms apply; '
              'see repo root README and datasets/labservice/README.md')

    def fetch(self, cache_dir: Path) -> list[Path]:
        if not GCMS_CSV.exists():
            raise FileNotFoundError(GCMS_CSV)
        return [GCMS_CSV]

    def parse(self, raw_paths: list[Path]) -> ParsedBatch:
        batch = ParsedBatch()
        for row in _read_csv_rows(raw_paths[0]):
            sample_id = (row.get('sampleid') or '').strip()
            substance = (row.get('substance') or '').strip()
            if not sample_id or not substance:
                continue
            batch.detections.append(dict(
                sample_id=sample_id,
                substance=substance,
                method=row.get('method') or None,
                abundance=None,
                rt=_parse_rt(row.get('gcms_peak')),
                confidence=_parse_confidence(row.get('abundance')),
            ))
        return batch
