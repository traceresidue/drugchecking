"""B1 adapter: JCAMP-DX reference FTIR spectra.

JCAMP-DX (Joint Committee on Atomic and Molecular Physical Data eXchange) is
the open, ASTM/IUPAC-documented text format for IR spectra -- the format
NIST WebBook exports its FTIR reference spectra in. A JCAMP-DX file is a
sequence of "Labelled Data Records" (LDRs): lines of the form
"##KEYWORD=value", optionally followed by continuation lines (used for
multi-line records such as the Y-data table), and terminated by "##END=".

This module hand-rolls a minimal parser (stdlib only, no `jcamp` dependency)
covering the LDRs needed to reconstruct an IR curve:

  ##TITLE, ##CAS REGISTRY NO      -- identity
  ##XUNITS, ##YUNITS              -- axis units (e.g. 1/CM, ABSORBANCE)
  ##XFACTOR, ##YFACTOR            -- scale factors applied to raw X/Y values
  ##FIRSTX, ##LASTX, ##DELTAX, ##NPOINTS
  ##XYDATA=(X++(Y..Y))            -- ASDF-compressed table: one X checkpoint
                                      per line + a run of Y values encoded as
                                      plain numbers, SQZ (absolute-value
                                      pseudo-digits), DIF (difference
                                      pseudo-digits), or DUP (repeat-count
                                      pseudo-digits)
  ##XYPOINTS=(XY..XY)              -- plain "x,y x,y ..." pairs
  ##PEAK TABLE=(XY..XY)            -- plain "x,y x,y ..." pairs (peak-picked)

Coverage note: this implements the common ASDF encodings (plain, SQZ, DIF,
and simple DUP-repeats-the-last-step) used by NIST WebBook exports. It does
not implement every edge case of the full 1988 JCAMP-DX ASDF spec (e.g.
adjacent DUP runs that switch between SQZ and DIF context mid-run) -- see
_decode_asdf_values() below for exactly what is and isn't handled.

Every spectrum parsed here is written to `spectra` with technique='FTIR',
role='reference', format_origin='JCAMP-DX', and linked to a `substances` row
by case-insensitive name match against ##TITLE (get_or_create, same pattern
as msp_library.py / build_db.py's `get_or_create_substance`).

IMPORTANT: this adapter only ships a synthetic, hand-authored fixture
(fixtures/reference/example.jdx) for parser validation. It does not fetch
real NIST WebBook JCAMP-DX spectra over the network -- that is documented,
not yet implemented, future work (see pipeline/README.md).
"""
from __future__ import annotations

import re
from pathlib import Path
from typing import Any

from .base import BaseAdapter, ParsedBatch

ROOT = Path(__file__).resolve().parent.parent.parent
FIXTURE_JDX = ROOT / 'pipeline' / 'fixtures' / 'reference' / 'example.jdx'

_LDR_RE = re.compile(r'^##([^=]+)=(.*)$')

# ASDF pseudo-digit tables (JCAMP-DX 1988 spec). '%' is shared between SQZ
# negative-zero and DIF zero (zero has no sign) -- handled contextually in
# _decode_asdf_values() rather than in these tables.
_SQZ = {
    '@': (0, 1), 'A': (1, 1), 'B': (2, 1), 'C': (3, 1), 'D': (4, 1),
    'E': (5, 1), 'F': (6, 1), 'G': (7, 1), 'H': (8, 1), 'I': (9, 1),
    'a': (1, -1), 'b': (2, -1), 'c': (3, -1), 'd': (4, -1), 'e': (5, -1),
    'f': (6, -1), 'g': (7, -1), 'h': (8, -1), 'i': (9, -1),
}
_DIF = {
    'J': (1, 1), 'K': (2, 1), 'L': (3, 1), 'M': (4, 1), 'N': (5, 1),
    'O': (6, 1), 'P': (7, 1), 'Q': (8, 1), 'R': (9, 1),
    'j': (1, -1), 'k': (2, -1), 'l': (3, -1), 'm': (4, -1), 'n': (5, -1),
    'o': (6, -1), 'p': (7, -1), 'q': (8, -1), 'r': (9, -1),
}
_DUP = {'S': 1, 'T': 2, 'U': 3, 'V': 4, 'W': 5, 'X': 6, 'Y': 7, 'Z': 8, 's': 9}


def _normalize_key(key: str) -> str:
    return re.sub(r'[\s_]+', ' ', key.strip()).upper()


def _split_ldr_blocks(text: str) -> list[dict[str, list[str]]]:
    """Split JCAMP-DX text into blocks (one per ##TITLE ... ##END=), each a
    dict of {normalized LDR key: [value_line, continuation_line, ...]}."""
    blocks: list[dict[str, list[str]]] = []
    current: dict[str, list[str]] = {}
    pending_key: str | None = None
    pending_lines: list[str] = []

    def flush_ldr() -> None:
        nonlocal pending_key, pending_lines
        if pending_key is not None:
            current[pending_key] = pending_lines
        pending_key = None
        pending_lines = []

    for raw_line in text.splitlines():
        line = raw_line.rstrip()
        if not line.strip():
            continue
        if line.lstrip().startswith('$$'):
            continue  # JCAMP-DX inline comment
        if line.lstrip().startswith('##'):
            m = _LDR_RE.match(line.strip())
            if not m:
                continue
            flush_ldr()
            key = _normalize_key(m.group(1))
            val = m.group(2).strip()
            if key == 'END':
                if current:
                    blocks.append(current)
                current = {}
                continue
            pending_key = key
            pending_lines = [val] if val else []
        elif pending_key is not None:
            pending_lines.append(line.strip())
    flush_ldr()
    if current:
        blocks.append(current)
    return blocks


def _get_single(ldrs: dict[str, list[str]], key: str, default: str | None = None) -> str | None:
    lines = ldrs.get(key)
    if not lines:
        return default
    return lines[0].strip()


def _decode_asdf_values(y_str: str) -> list[float]:
    """Decode one ASDF Y-run (the part of an ##XYDATA line after the leading
    X-checkpoint number) into a list of raw (pre-YFACTOR) Y values.

    Rule used to resolve the shared '%' character: the first value decoded
    on a line is always absolute (SQZ-like); after that, '%' is treated as a
    DIF zero (a delta of 0). Explicit SQZ letters always mean "absolute",
    explicit DIF letters always mean "delta from the previous value", and
    DUP repeats the most recent step (absolute value or delta) that many
    additional times.
    """
    values: list[float] = []
    last_y: float | None = None
    last_step: tuple[str, float] | None = None  # ('sqz'|'dif', magnitude)
    i, n = 0, len(y_str)

    while i < n:
        c = y_str[i]
        if c.isspace() or c == ',':
            i += 1
            continue

        if c == '%':
            digit, sign, is_dif = 0, 1, last_y is not None
            i += 1
        elif c in _SQZ:
            digit, sign = _SQZ[c]
            is_dif = False
            i += 1
        elif c in _DIF:
            digit, sign = _DIF[c]
            is_dif = True
            i += 1
        elif c in _DUP:
            count = _DUP[c]
            i += 1
            digits = ''
            while i < n and y_str[i].isdigit():
                digits += y_str[i]
                i += 1
            if digits:
                count = int(str(count) + digits)
            if last_step is None:
                raise ValueError('JCAMP-DX DUP character with no preceding value to repeat')
            kind, amount = last_step
            for _ in range(count - 1):
                last_y = amount if kind == 'sqz' else (last_y or 0) + amount
                values.append(last_y)
            continue
        elif c in '+-.0123456789':
            # Plain (PAC) number, unusual mid-run but valid as the very
            # first value on a line before any SQZ/DIF letter has appeared.
            j = i + 1
            while j < n and (y_str[j].isdigit() or y_str[j] in '.+-'):
                j += 1
            val = float(y_str[i:j])
            i = j
            last_y = val
            last_step = ('sqz', val)
            values.append(last_y)
            continue
        else:
            i += 1  # skip unrecognized character defensively
            continue

        digits = str(digit)
        while i < n and y_str[i].isdigit():
            digits += y_str[i]
            i += 1
        magnitude = sign * float(digits)
        if is_dif:
            last_y = magnitude if last_y is None else last_y + magnitude
            last_step = ('dif', magnitude)
        else:
            last_y = magnitude
            last_step = ('sqz', magnitude)
        values.append(last_y)

    return values


_X_CHECK_RE = re.compile(r'^[+-]?\d+(?:\.\d+)?')


def _decode_xydata(lines: list[str], deltax_raw: float, xfactor: float, yfactor: float) -> list[tuple[float, float]]:
    """Decode an ##XYDATA=(X++(Y..Y)) block into [(x, y), ...]."""
    points: list[tuple[float, float]] = []
    for raw_line in lines[1:]:  # lines[0] is the "(X++(Y..Y))" descriptor
        line = raw_line.strip()
        if not line:
            continue
        m = _X_CHECK_RE.match(line)
        if not m:
            continue
        x_check_raw = float(m.group(0))
        rest = line[m.end():]
        for i, y_raw in enumerate(_decode_asdf_values(rest)):
            x = (x_check_raw + i * deltax_raw) * xfactor
            points.append((x, y_raw * yfactor))
    return points


def _decode_xyxy_pairs(lines: list[str]) -> list[tuple[float, float]]:
    """Decode ##XYPOINTS=(XY..XY) / ##PEAK TABLE=(XY..XY): plain 'x,y'
    pairs separated by whitespace across lines."""
    text = ' '.join(lines[1:])  # lines[0] is the "(XY..XY)" descriptor
    pairs: list[tuple[float, float]] = []
    for token in text.replace(';', ' ').split():
        if ',' in token:
            xs, ys = token.split(',', 1)
            try:
                pairs.append((float(xs), float(ys)))
            except ValueError:
                continue
    return pairs


def parse_jcamp_text(text: str) -> list[dict[str, Any]]:
    """Parse JCAMP-DX text into a list of records:

        {'title': str | None, 'cas': str | None, 'xunits': str | None,
         'yunits': str | None, 'points': [(x, y), ...]}
    """
    records: list[dict[str, Any]] = []
    for ldrs in _split_ldr_blocks(text):
        xfactor = float(_get_single(ldrs, 'XFACTOR', '1') or '1')
        yfactor = float(_get_single(ldrs, 'YFACTOR', '1') or '1')
        deltax = float(_get_single(ldrs, 'DELTAX', '0') or '0')

        if 'XYDATA' in ldrs:
            points = _decode_xydata(ldrs['XYDATA'], deltax, xfactor, yfactor)
        elif 'XYPOINTS' in ldrs:
            points = _decode_xyxy_pairs(ldrs['XYPOINTS'])
        elif 'PEAK TABLE' in ldrs:
            points = _decode_xyxy_pairs(ldrs['PEAK TABLE'])
        else:
            points = []

        records.append({
            'title': _get_single(ldrs, 'TITLE'),
            'cas': _get_single(ldrs, 'CAS REGISTRY NO'),
            'xunits': _get_single(ldrs, 'XUNITS'),
            'yunits': _get_single(ldrs, 'YUNITS'),
            'points': points,
        })
    return records


class JCAMPFTIRAdapter(BaseAdapter):
    """B1 reference adapter: parses a JCAMP-DX file into reference FTIR spectra.

    Defaults to the bundled synthetic fixture; pass `jdx_path` to point it at
    a different JCAMP-DX file (e.g. a real NIST WebBook export dropped into
    pipeline/cache/ by a future fetch() implementation).
    """

    source_id = 'jcamp-ftir-fixture'
    name = 'Synthetic JCAMP-DX FTIR reference fixture (parser validation)'
    url = None
    license = 'synthetic fixture for parser validation; not redistributed licensed data'
    terms = 'synthetic fixture for parser validation; not redistributed licensed data'

    def __init__(self, jdx_path: Path = FIXTURE_JDX):
        self.jdx_path = jdx_path

    def fetch(self, cache_dir: Path) -> list[Path]:
        if not self.jdx_path.exists():
            raise FileNotFoundError(self.jdx_path)
        return [self.jdx_path]

    def parse(self, raw_paths: list[Path]) -> ParsedBatch:
        batch = ParsedBatch()
        for path in raw_paths:
            text = path.read_text(encoding='utf-8')
            full_bytes = text.encode('utf-8')
            for record in parse_jcamp_text(text):
                title = record['title']
                if not title:
                    continue
                meta = {
                    'cas': record['cas'],
                    'xunits': record['xunits'],
                    'yunits': record['yunits'],
                    'source_file': path.name,
                }
                batch.spectra.append(dict(
                    substance=title,
                    technique='FTIR',
                    role='reference',
                    format_origin='JCAMP-DX',
                    peaks=[list(p) for p in record['points']],
                    meta=meta,
                    # Per-block raw slicing isn't tracked separately; the
                    # whole source file is small (a handful of fixture
                    # entries) so we keep the full file as provenance.
                    raw=full_bytes,
                ))
        return batch
