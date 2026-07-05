#!/usr/bin/env python3
"""Build drugchecking.sqlite (ROADMAP.md Track B).

Thin CLI entrypoint: loads schema.sql, then runs each registered adapter
(adapters/*.py, contract in adapters/base.py) in turn -- fetch() its raw
files, parse() them into a ParsedBatch of plain dicts, and load that batch
into the database -- and finally (re)populates the FTS5 search tables.

Phase B0 (unc_demo): seeds `substances` from chemdictionary/chemdictionary.csv
and loads `samples`/`detections` from the demo CSVs in datasets/.

Phase B1 (msp_library, jcamp_ftir): parses bundled synthetic fixtures into
`spectra(role='reference')` rows, to validate the MSP and JCAMP-DX parsers
end-to-end. These do NOT fetch real SWGDRUG/NIST/NIST-WebBook data over the
network -- see pipeline/README.md for what's real vs. documented-only.

Run as:  python3 pipeline/build_db.py   (from the repo root, zero
third-party dependencies -- csv/json/sqlite3/pathlib only).
"""
from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from adapters.base import BaseAdapter, ParsedBatch
from adapters.jcamp_ftir import JCAMPFTIRAdapter
from adapters.mona_json import MoNAJSONAdapter
from adapters.msp_library import MSPLibraryAdapter
from adapters.unc_demo import UNCDemoAdapter

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / 'pipeline' / 'drugchecking.sqlite'
SCHEMA_PATH = ROOT / 'pipeline' / 'schema.sql'
CACHE_DIR = ROOT / 'pipeline' / 'cache'

# Registered adapters, run in order. Each is its own `sources` row.
ADAPTERS: list[BaseAdapter] = [
    UNCDemoAdapter(),      # B0: chemdictionary + demo analysis_dataset/lab_detail
    MSPLibraryAdapter(),   # B1: synthetic MSP reference-spectra fixture
    JCAMPFTIRAdapter(),    # B1: synthetic JCAMP-DX FTIR reference fixture
    MoNAJSONAdapter(),     # B1: real, CC-licensed MoNA GC-MS reference-spectra sample
]


def load_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(SCHEMA_PATH.read_text(encoding='utf-8'))


def seed_source(conn: sqlite3.Connection, adapter: BaseAdapter, fetched_at: str) -> None:
    row = adapter.source_row(fetched_at)
    conn.execute(
        """INSERT INTO sources (source_id, name, url, license, terms, fetched_at)
           VALUES (:source_id, :name, :url, :license, :terms, :fetched_at)""",
        row,
    )


def upsert_substances(conn: sqlite3.Connection, name_to_id: dict[str, int], substances: list[dict]) -> None:
    for s in substances:
        name = s['name'].strip()
        cur = conn.execute(
            """INSERT INTO substances (name, pronunciation, pubchem_cid, cas, unii, common_role, classes)
               VALUES (?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(name) DO UPDATE SET
                 pronunciation=excluded.pronunciation, pubchem_cid=excluded.pubchem_cid,
                 cas=excluded.cas, unii=excluded.unii,
                 common_role=excluded.common_role, classes=excluded.classes
               RETURNING substance_id""",
            (
                name,
                s.get('pronunciation'),
                s.get('pubchem_cid'),
                s.get('cas'),
                s.get('unii'),
                s.get('common_role'),
                json.dumps(s.get('classes') or []),
            ),
        )
        name_to_id[name.lower()] = cur.fetchone()[0]


def get_or_create_substance(conn: sqlite3.Connection, name_to_id: dict[str, int], name: str) -> int:
    """Resolve a bare substance name (case-insensitive) to a substance_id,
    creating a bare-bones row (empty classes) if this is the first time this
    name has been seen. Shared by every adapter's detections/spectra that
    reference a substance by name rather than by id."""
    key = name.strip().lower()
    if key in name_to_id:
        return name_to_id[key]
    cur = conn.execute(
        "INSERT INTO substances (name, classes) VALUES (?, '[]') RETURNING substance_id",
        (name.strip(),),
    )
    sid = cur.fetchone()[0]
    name_to_id[key] = sid
    return sid


def load_samples(conn: sqlite3.Connection, source_id: str, samples: list[dict]) -> None:
    for row in samples:
        conn.execute(
            """INSERT INTO samples
                 (sample_id, source_id, external_id, program, state, county_fips,
                  date_collected, expected, color, texture, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(sample_id) DO NOTHING""",
            (
                row['sample_id'],
                source_id,
                row.get('external_id'),
                row.get('program'),
                row.get('state'),
                row.get('county_fips'),
                row.get('date_collected'),
                row.get('expected'),
                row.get('color'),
                row.get('texture'),
                row.get('notes'),
            ),
        )


def _resolve_substance_id(conn: sqlite3.Connection, name_to_id: dict[str, int], row: dict) -> int | None:
    if row.get('substance_id') is not None:
        return row['substance_id']
    if row.get('substance'):
        return get_or_create_substance(conn, name_to_id, row['substance'])
    return None


def load_detections(conn: sqlite3.Connection, name_to_id: dict[str, int], detections: list[dict]) -> None:
    for row in detections:
        substance_id = _resolve_substance_id(conn, name_to_id, row)
        if substance_id is None:
            continue
        conn.execute(
            """INSERT INTO detections (sample_id, substance_id, method, abundance, rt, confidence)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (
                row['sample_id'],
                substance_id,
                row.get('method'),
                row.get('abundance'),
                row.get('rt'),
                row.get('confidence'),
            ),
        )


def load_spectra(conn: sqlite3.Connection, name_to_id: dict[str, int], spectra: list[dict]) -> None:
    for row in spectra:
        substance_id = _resolve_substance_id(conn, name_to_id, row)
        conn.execute(
            """INSERT INTO spectra (sample_id, substance_id, technique, role, format_origin, peaks, meta, raw)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                row.get('sample_id'),
                substance_id,
                row['technique'],
                row['role'],
                row.get('format_origin'),
                json.dumps(row.get('peaks')) if row.get('peaks') is not None else None,
                json.dumps(row.get('meta')) if row.get('meta') is not None else None,
                row.get('raw'),
            ),
        )


def run_adapter(conn: sqlite3.Connection, adapter: BaseAdapter, name_to_id: dict[str, int], fetched_at: str) -> None:
    raw_paths = adapter.fetch(CACHE_DIR)
    batch: ParsedBatch = adapter.parse(raw_paths)
    seed_source(conn, adapter, fetched_at)
    upsert_substances(conn, name_to_id, batch.substances)
    load_samples(conn, adapter.source_id, batch.samples)
    load_detections(conn, name_to_id, batch.detections)
    load_spectra(conn, name_to_id, batch.spectra)


def populate_fts(conn: sqlite3.Connection) -> None:
    conn.execute("DELETE FROM substances_fts")
    conn.execute("DELETE FROM samples_fts")
    conn.executemany(
        "INSERT INTO substances_fts (name, substance_id) VALUES (?, ?)",
        conn.execute("SELECT name, substance_id FROM substances").fetchall(),
    )
    conn.executemany(
        "INSERT INTO samples_fts (notes, sample_id) VALUES (?, ?)",
        [(n, s) for (n, s) in conn.execute("SELECT notes, sample_id FROM samples").fetchall() if n],
    )


def build(db_path: Path = DB_PATH, adapters: list[BaseAdapter] | None = None) -> sqlite3.Connection:
    """Build (or rebuild) the database at db_path from the given adapters
    (defaults to ADAPTERS). Returns an open connection to the built db --
    caller is responsible for closing it. Exposed as a function (rather than
    only living in main()) so tests can build against a temp path."""
    if db_path.exists():
        db_path.unlink()
    CACHE_DIR.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(db_path)
    fetched_at = datetime.now(timezone.utc).isoformat()
    name_to_id: dict[str, int] = {}
    try:
        load_schema(conn)
        for adapter in (adapters if adapters is not None else ADAPTERS):
            run_adapter(conn, adapter, name_to_id, fetched_at)
        populate_fts(conn)
        conn.commit()
    except Exception:
        conn.close()
        raise
    return conn


def main() -> None:
    conn = build()
    n_substances, n_samples, n_detections, n_spectra = (
        conn.execute(f"SELECT count(*) FROM {t}").fetchone()[0]
        for t in ('substances', 'samples', 'detections', 'spectra')
    )
    print(f"built {DB_PATH.relative_to(ROOT)}: "
          f"{n_substances} substances, {n_samples} samples, "
          f"{n_detections} detections, {n_spectra} reference/sample spectra")
    conn.close()


if __name__ == '__main__':
    main()
