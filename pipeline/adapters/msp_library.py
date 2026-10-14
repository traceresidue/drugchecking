"""B1 adapter: NIST-format MSP reference EI/MS spectra.

MSP ("MS Search Program" text format) is the lingua franca of GC-MS
reference libraries -- SWGDRUG and NIST both ship their libraries as MSP.
An MSP file is a sequence of entries, each a block of "Key: value" header
lines (Name:, CAS#:, DB#:, Comment:, ...) followed by a "Num Peaks: N" line
and then N (mz, intensity) pairs, e.g.:

    Name: Acetaminophen
    CAS#: 103-90-2
    Num Peaks: 4
    109 20; 111 5; 150 15; 151 100

Entries are separated by a blank line. This module hand-rolls that parser
(stdlib only, no matchms/pyteomics dependency) -- it is deliberately the
real, widely-used "Key: value" MSP notation, not the "##KEY=value" ASTM
notation (that syntax belongs to JCAMP-DX and is handled by
jcamp_ftir.py -- the two formats are easy to conflate by name alone).

Every spectrum parsed here is written to `spectra` with technique='MS',
role='reference', format_origin='MSP', and linked to a `substances` row by
case-insensitive name match (get_or_create, same pattern build_db.py already
used for lab_detail.csv detections) -- see build_db.py's
`get_or_create_substance`.

IMPORTANT: this adapter only ships a synthetic, hand-authored fixture
(fixtures/reference/example.msp) for parser validation. It does not fetch
real SWGDRUG/NIST MSP libraries over the network -- that is documented, not
yet implemented, future work (see pipeline/README.md).
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Any

from .base import BaseAdapter, ParsedBatch

ROOT = Path(__file__).resolve().parent.parent.parent
FIXTURE_MSP = ROOT / 'pipeline' / 'fixtures' / 'reference' / 'example.msp'

# "Key: value" header line, e.g. "Name: Fentanyl", "CAS#: 437-38-7". Requires
# a leading letter so peak-list lines (which start with a number) never match.
_HEADER_RE = re.compile(r'^([A-Za-z][A-Za-z0-9#_ ]*):\s*(.*)$')


def _parse_peak_line(line: str) -> list[tuple[float, float]]:
    """Parse one peak-list line: "mz intensity; mz intensity; ..." (also
    tolerates comma-separated pairs and bare whitespace-separated pairs)."""
    pairs: list[tuple[float, float]] = []
    for chunk in re.split(r'[;\t]', line):
        chunk = chunk.strip()
        if not chunk:
            continue
        parts = chunk.replace(',', ' ').split()
        if len(parts) >= 2:
            try:
                pairs.append((float(parts[0]), float(parts[1])))
            except ValueError:
                continue
    return pairs


def parse_msp_text(text: str) -> list[dict[str, Any]]:
    """Parse MSP text into a list of entries:

        {'header': {lowercased_key: value, ...},
         'peaks': [(mz, intensity), ...],
         'raw': "original text block for this entry"}
    """
    records: list[dict[str, Any]] = []
    header: dict[str, str] = {}
    peaks: list[tuple[float, float]] = []
    raw_lines: list[str] = []
    in_peaks = False

    def flush() -> None:
        nonlocal header, peaks, raw_lines, in_peaks
        if header or peaks:
            records.append({
                'header': header,
                'peaks': peaks,
                'raw': '\n'.join(raw_lines).strip(),
            })
        header = {}
        peaks = []
        raw_lines = []
        in_peaks = False

    for raw_line in text.splitlines():
        line = raw_line.strip()
        if not line:
            flush()
            continue
        if line.startswith('#') or line.startswith(';'):
            continue  # file-level comment (e.g. synthetic-fixture disclaimer)
        m = _HEADER_RE.match(line)
        is_new_name = bool(m) and m.group(1).strip().lower() == 'name'
        if m and (not in_peaks or is_new_name):
            if in_peaks and is_new_name:
                # New entry started without a blank-line separator.
                flush()
            key = m.group(1).strip().lower()
            val = m.group(2).strip()
            header[key] = val
            raw_lines.append(raw_line)
            if key == 'num peaks':
                in_peaks = True
            continue
        if in_peaks:
            peaks.extend(_parse_peak_line(line))
            raw_lines.append(raw_line)
    flush()
    return records


class MSPLibraryAdapter(BaseAdapter):
    """B1 reference adapter: parses an MSP file into reference MS spectra.

    Defaults to the bundled synthetic fixture; pass `msp_path` to point it
    at a different MSP file (e.g. a real SWGDRUG/NIST export dropped into
    pipeline/cache/ by a future fetch() implementation).
    """

    source_id = 'msp-reference-fixture'
    name = 'Synthetic MSP reference fixture (parser validation)'
    url = None
    license = 'synthetic fixture for parser validation; not redistributed licensed data'
    terms = 'synthetic fixture for parser validation; not redistributed licensed data'

    def __init__(self, msp_path: Path = FIXTURE_MSP):
        self.msp_path = msp_path

    def fetch(self, cache_dir: Path) -> list[Path]:
        if not self.msp_path.exists():
            raise FileNotFoundError(self.msp_path)
        return [self.msp_path]

    def parse(self, raw_paths: list[Path]) -> ParsedBatch:
        batch = ParsedBatch()
        for path in raw_paths:
            text = path.read_text(encoding='utf-8')
            for entry in parse_msp_text(text):
                header = entry['header']
                name = header.get('name')
                if not name:
                    continue
                meta = {
                    'cas': header.get('cas#') or header.get('cas'),
                    'db_num': header.get('db#'),
                    'comment': header.get('comment'),
                    'source_file': path.name,
                }
                batch.spectra.append(dict(
                    substance=name,
                    technique='MS',
                    role='reference',
                    format_origin='MSP',
                    peaks=[list(p) for p in entry['peaks']],
                    meta=meta,
                    raw=entry['raw'].encode('utf-8'),
                ))
        return batch
