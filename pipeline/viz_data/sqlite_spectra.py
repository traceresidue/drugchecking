"""Export real sample chromatograms and reference spectra from SQLite into spectra.json."""
from __future__ import annotations

import json
import sqlite3
from pathlib import Path

from .classify import classify
from .cohort import COHORT_SIZE
from .datasets import load_unc_gcms

ROOT = Path(__file__).resolve().parent.parent.parent
PIPELINE_DB = ROOT / 'pipeline' / 'drugchecking.sqlite'
LIBRARIAN_DB = ROOT / 'web' / 'apps' / 'librarian' / 'public' / 'drugchecking.sqlite'
SPECTRA_JSON = ROOT / 'visualization-framework' / 'data' / 'spectra.json'


def _normalize_peaks(peaks: list) -> list[list[float]]:
    if not peaks:
        return []
    numeric = [[float(p[0]), float(p[1])] for p in peaks if isinstance(p, (list, tuple)) and len(p) >= 2]
    if not numeric:
        return []
    max_y = max(point[1] for point in numeric) or 1.0
    return [[point[0], round(point[1] / max_y * 100, 2)] for point in numeric]


def _chromatogram_peaks(
    detections: list[dict],
    gcms: dict[tuple[str, str], float],
    median_rt: dict[str, float],
) -> list[list]:
    peaks: list[tuple[str, float, float, int]] = []
    for det in detections:
        substance = det['substance']
        key = substance.lower()
        rt = det.get('rt')
        if rt is None:
            rt = gcms.get((det['sample_id'], key))
        if rt is None:
            rt = median_rt.get(key)
        if rt is None:
            continue
        rank = 0 if det.get('confidence') == 'primary' else 1
        peaks.append((substance, float(rt), 0.0, rank))

    if not peaks:
        return []

    peaks.sort(key=lambda item: (item[3], -item[1]))
    primary = [item for item in peaks if item[3] == 0]
    anchor = primary[0] if primary else peaks[0]
    amp_scale = 100.0
    trace_scale = 35.0
    rendered: list[list] = []
    for substance, rt, _, rank in peaks:
        amp = amp_scale if rank == 0 else trace_scale
        if substance == anchor[0] and rank == 0:
            amp = amp_scale
        rendered.append([substance, round(rt, 2), round(amp, 1)])
    return rendered


def _median_rt_from_aggregates(retention_times: list[dict] | None = None) -> dict[str, float]:
    if retention_times is None:
        return {}
    return {row['substance'].lower(): float(row['rt']) for row in retention_times}


def _load_sample_detections(conn: sqlite3.Connection, source_id: str, limit: int) -> list[dict]:
    sample_rows = conn.execute(
        """
        SELECT sample_id, state, expected, date_collected
        FROM samples
        WHERE source_id = ?
        ORDER BY sample_id
        LIMIT ?
        """,
        (source_id, limit),
    ).fetchall()
    if not sample_rows:
        return []

    sample_ids = [row[0] for row in sample_rows]
    placeholders = ','.join('?' for _ in sample_ids)
    det_rows = conn.execute(
        f"""
        SELECT d.sample_id, sub.name AS substance, d.confidence, d.rt
        FROM detections d
        JOIN substances sub ON sub.substance_id = d.substance_id
        WHERE d.sample_id IN ({placeholders})
        ORDER BY d.sample_id, d.detection_id
        """,
        sample_ids,
    ).fetchall()

    grouped: dict[str, dict] = {
        sample_id: {
            'sample_id': sample_id,
            'state': state,
            'expected': expected,
            'date_collected': date_collected,
            'detections': [],
        }
        for sample_id, state, expected, date_collected in sample_rows
    }
    for sample_id, substance, confidence, rt in det_rows:
        grouped[sample_id]['detections'].append({
            'sample_id': sample_id,
            'substance': substance,
            'confidence': confidence,
            'rt': rt,
        })
    return [grouped[sample_id] for sample_id in sample_ids if grouped[sample_id]['detections']]


def export_sample_chromatograms(
    db_path: Path,
    *,
    source_id: str = 'unc-viz-cohort',
    limit: int = COHORT_SIZE,
    retention_times: list[dict] | None = None,
) -> dict[str, dict]:
    if not db_path.exists():
        raise FileNotFoundError(db_path)

    conn = sqlite3.connect(db_path)
    try:
        samples = _load_sample_detections(conn, source_id, limit)
    finally:
        conn.close()

    gcms = load_unc_gcms()
    median_rt = _median_rt_from_aggregates(retention_times)
    exported: dict[str, dict] = {}
    for sample in samples:
        sample_id = sample['sample_id']
        peaks = _chromatogram_peaks(sample['detections'], gcms, median_rt)
        if not peaks:
            continue
        expected = (sample.get('expected') or 'unknown').strip()
        state = (sample.get('state') or '??').strip()
        label = f'{state} · {expected[:72]}' if expected else f'{state} · sample {sample_id}'
        exported[f'sample_{sample_id}'] = {
            'sample_id': sample_id,
            'label': label,
            'source': source_id,
            'provenance': 'Real detections with GC–MS retention times from unc_gcms.csv (primary peaks scaled higher than trace).',
            'peaks': peaks,
        }
    return exported


def export_reference_spectra(db_path: Path, *, limit: int = 10) -> dict[str, dict]:
    if not db_path.exists():
        raise FileNotFoundError(db_path)

    conn = sqlite3.connect(db_path)
    try:
        rows = conn.execute(
            """
            SELECT sp.spectrum_id, sp.technique, sp.format_origin, sp.peaks, sp.meta,
                   sub.name AS substance, src.license, src.name AS source_name
            FROM spectra sp
            LEFT JOIN substances sub ON sub.substance_id = sp.substance_id
            LEFT JOIN sources src ON src.source_id = 'mona-json-sample'
            WHERE sp.role = 'reference' AND sp.peaks IS NOT NULL
            ORDER BY sp.technique, sub.name, sp.spectrum_id
            """
        ).fetchall()
    finally:
        conn.close()

    chosen: list = []
    seen: set[tuple[str, str]] = set()
    for row in rows:
        technique = row[1] or 'MS'
        substance = (row[5] or 'unknown').lower()
        key = (technique, substance)
        if key in seen:
            continue
        seen.add(key)
        chosen.append(row)
        if len(chosen) >= limit:
            break

    if len(chosen) < limit:
        for row in rows:
            if row in chosen:
                continue
            chosen.append(row)
            if len(chosen) >= limit:
                break

    exported: dict[str, dict] = {}
    for row in chosen[:limit]:
        spectrum_id, technique, format_origin, peaks_raw, meta_raw, substance, license_text, source_name = row
        peaks = json.loads(peaks_raw) if peaks_raw else []
        meta = json.loads(meta_raw) if meta_raw else {}
        ref_id = f'ref_{spectrum_id}'
        exported[ref_id] = {
            'spectrum_id': spectrum_id,
            'substance': substance or meta.get('compound') or 'unknown',
            'technique': technique,
            'format': format_origin,
            'license': meta.get('license') or license_text,
            'source': source_name,
            'provenance': 'Reference spectrum from pipeline SQLite (MoNA / MSP / JCAMP fixtures).',
            'peaks': _normalize_peaks(peaks),
            'cls': classify(substance or '')['cls'],
        }
    return exported


def samples_as_chromatograms(samples: dict[str, dict]) -> dict[str, dict]:
    """Copy SQLite cohort exports into chromatograms-compatible entries for viz dropdowns."""
    merged: dict[str, dict] = {}
    for key, sample in samples.items():
        sample_id = sample.get('sample_id') or key.removeprefix('sample_')
        merged[key] = {
            'label': sample.get('label') or f'Sample {sample_id}',
            'peaks': sample.get('peaks') or [],
            'real': True,
            'sample_id': sample_id,
            'source': sample.get('source'),
            'provenance': sample.get('provenance'),
        }
    return merged


def archetype_chromatograms(chromatograms: dict[str, dict]) -> dict[str, dict]:
    """Keep illustrative archetypes only — drop prior real-sample merges on re-export."""
    return {
        key: value
        for key, value in chromatograms.items()
        if not value.get('real') and not key.startswith('sample_')
    }


def merge_spectra_json(
    aggregates: dict,
    *,
    pipeline_db: Path = PIPELINE_DB,
    librarian_db: Path = LIBRARIAN_DB,
    sample_limit: int = COHORT_SIZE,
    reference_limit: int = 10,
) -> dict:
    base = json.loads(SPECTRA_JSON.read_text(encoding='utf-8')) if SPECTRA_JSON.exists() else {
        'note': 'Illustrative spectra for visualization design. Peak positions reflect characteristic fragments/bands; intensities approximate. Not for analytical identification.',
        'ms': {},
        'ftir': {},
        'chromatograms': {},
    }

    samples = export_sample_chromatograms(
        pipeline_db,
        limit=sample_limit,
        retention_times=aggregates.get('retention_times'),
    )
    ref_db = librarian_db if librarian_db.exists() else pipeline_db
    references = export_reference_spectra(ref_db, limit=reference_limit)

    base['samples'] = samples
    base['references'] = references
    archetypes = archetype_chromatograms(base.get('chromatograms') or {})
    real_chroms = samples_as_chromatograms(samples)
    base['chromatograms'] = {**archetypes, **real_chroms}
    base['note'] = (
        'Illustrative MS/FTIR archetypes remain for teaching layouts; '
        f'{len(samples)} real sample chromatograms (also in chromatograms) and '
        f'{len(references)} reference spectra exported from drugchecking.sqlite. '
        'Peak height ≠ purity.'
    )
    return base
