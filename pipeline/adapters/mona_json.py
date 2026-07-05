"""B1 adapter: MassBank of North America (MoNA) GC-MS reference spectra.

MoNA (https://mona.fiehnlab.ucdavis.edu/) exports its GC-MS holdings as a
single JSON array. Each record looks like:

    {
      "id": "JP003089",
      "compound": [{"names": [{"name": "Morphine"}],
                    "metaData": [{"name": "cas", "value": "57-27-2"}, ...]}],
      "spectrum": "41.0:12.3 55.0:34.0 ...",   -- "mz:intensity" pairs, space-separated
      "metaData": [{"name": "license", "value": "CC BY-NC-SA"}, ...],
      "library": {"library": "MassBank", ...}
    }

Unlike the MSP/JCAMP-DX fixtures (`msp_library.py`, `jcamp_ftir.py`), which
are hand-authored synthetic data because SWGDRUG/NIST are proprietary, MoNA
publishes each record under an explicit Creative Commons license (CC BY /
CC BY-SA / CC BY-NC-SA, declared per-record). That makes it the first
source in this pipeline where the bundled fixture is a real excerpt of the
actual library, not a stand-in -- see `fixtures/reference/mona_sample.json`,
a 107-record subset: ~44 chosen for name overlap with `chemdictionary.csv`
(caffeine, cocaine, methamphetamine, morphine, codeine, and other
drug-checking-relevant substances/cuts), plus a diversity fill of other
compounds stratified across spectrum-size buckets (peak counts from single
digits into the hundreds) and all three license types, to exercise the
pipeline at greater volume. Each record carries its original per-record
license in `meta.license` (informational provenance; this is a local
prototype, not a redistributed artifact, so license terms aren't enforced
here).

This adapter does not fetch the full MoNA export (141MB, ~19k GC-MS records)
over the network -- that remains documented-but-not-implemented future work,
same as the B1 remainder for MSP/JCAMP. Point `mona_path` at a full export to
parse more than the bundled sample; pass `only_names` to restrict ingestion
to a specific set of substances (case-insensitive) rather than everything in
the file.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .base import BaseAdapter, ParsedBatch

ROOT = Path(__file__).resolve().parent.parent.parent
FIXTURE_MONA = ROOT / 'pipeline' / 'fixtures' / 'reference' / 'mona_sample.json'


def _parse_spectrum_string(spectrum: str) -> list[list[float]]:
    """Parse MoNA's "mz:intensity mz:intensity ..." spectrum string into
    [[mz, intensity], ...] pairs. Skips any token that doesn't split into
    exactly two floats rather than failing the whole record."""
    peaks: list[list[float]] = []
    for token in spectrum.split():
        parts = token.split(':')
        if len(parts) != 2:
            continue
        try:
            peaks.append([float(parts[0]), float(parts[1])])
        except ValueError:
            continue
    return peaks


def _meta_value(meta_list: list[dict[str, Any]], key: str) -> str | None:
    for m in meta_list:
        if m.get('name') == key:
            return m.get('value')
    return None


class MoNAJSONAdapter(BaseAdapter):
    """B1 reference adapter: parses a MoNA GC-MS JSON export into reference
    MS spectra.

    Defaults to the bundled 7-record real sample; pass `mona_path` to point
    it at a larger export (e.g. the full 19k-record file), and `only_names`
    (a set of lowercased substance names) to filter which records get
    ingested.
    """

    source_id = 'mona-gcms-sample'
    name = 'MassBank of North America (MoNA) GC-MS spectra (sample subset)'
    url = 'https://mona.fiehnlab.ucdavis.edu/'
    license = ("Mixed per-record Creative Commons licenses (CC BY / CC BY-SA / "
               "CC BY-NC-SA) as declared by each record's own metaData -- see "
               "meta.license and meta.accession on each spectrum row for "
               "per-record attribution before redistributing.")
    terms = ("Community-contributed reference library (MassBank/RIKEN/other "
              "contributing labs via MoNA); attribute the original contributor "
              "and license named in meta.license, not this pipeline, when "
              "reusing an individual spectrum.")

    def __init__(self, mona_path: Path = FIXTURE_MONA, only_names: set[str] | None = None,
                 limit: int | None = None):
        self.mona_path = mona_path
        self.only_names = {n.lower() for n in only_names} if only_names else None
        self.limit = limit

    def fetch(self, cache_dir: Path) -> list[Path]:
        if not self.mona_path.exists():
            raise FileNotFoundError(self.mona_path)
        return [self.mona_path]

    def parse(self, raw_paths: list[Path]) -> ParsedBatch:
        batch = ParsedBatch()
        count = 0
        for path in raw_paths:
            records = json.loads(path.read_text(encoding='utf-8'))
            for record in records:
                if self.limit is not None and count >= self.limit:
                    break
                compounds = record.get('compound') or []
                if not compounds:
                    continue
                names = compounds[0].get('names') or []
                if not names:
                    continue
                name = names[0]['name'].strip()
                if self.only_names is not None and name.lower() not in self.only_names:
                    continue
                peaks = _parse_spectrum_string(record.get('spectrum', ''))
                if not peaks:
                    continue
                comp_meta = compounds[0].get('metaData') or []
                rec_meta = record.get('metaData') or []
                meta = {
                    'accession': record.get('id'),
                    'cas': _meta_value(comp_meta, 'cas'),
                    'molecular_formula': _meta_value(comp_meta, 'molecular formula'),
                    'inchikey': compounds[0].get('inchiKey'),
                    'license': _meta_value(rec_meta, 'license'),
                    'instrument': _meta_value(rec_meta, 'instrument'),
                    'ion_type': _meta_value(rec_meta, 'ion type'),
                    'library': (record.get('library') or {}).get('library'),
                    'source_file': path.name,
                }
                batch.spectra.append(dict(
                    substance=name,
                    technique='MS',
                    role='reference',
                    format_origin='MoNA-JSON',
                    peaks=peaks,
                    meta=meta,
                    raw=json.dumps(record).encode('utf-8'),
                ))
                count += 1
        return batch
