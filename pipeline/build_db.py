#!/usr/bin/env python3
"""Build drugchecking.sqlite (ROADMAP.md Track B, phase B0).

Seeds `substances` from chemdictionary/chemdictionary.csv and loads the two
demo CSVs shipped in datasets/ (analysis_dataset.csv -> samples,
lab_detail.csv -> detections) as the first `source`. Idempotent: re-running
drops and rebuilds the database from the checked-in CSVs.

Later phases (B1-B3) add adapters that write into the same schema from
reference libraries (SWGDRUG, NIST WebBook) and community sources
(DrugsData, Toronto DCS, WEDINOS) -- each as its own `source_id`.
"""
import csv
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / 'pipeline' / 'drugchecking.sqlite'
SCHEMA_PATH = ROOT / 'pipeline' / 'schema.sql'

CHEMDICT_CSV = ROOT / 'chemdictionary' / 'chemdictionary.csv'
ANALYSIS_CSV = ROOT / 'datasets' / 'analysis_dataset.csv'
LAB_DETAIL_CSV = ROOT / 'datasets' / 'lab_detail.csv'

# Class-indicator columns in chemdictionary.csv -> substances.classes JSON.
CHEMDICT_CLASS_COLS = [
    'substituted_cathinones', 'designer_benzos', 'benzos', 'nitazenes',
    'opiates_opioids', 'synthetic_cannabinoids', 'meth_impurities',
    'mdma_impurities', 'cocaine_impurities', 'common_cuts',
    'heroin_impurities', 'cannabinoids', 'fentanyl_impurities',
    'pf_fent_impurities', 'ketamine_impurities',
]

DEMO_SOURCE_ID = 'unc-demo-datasets'


def read_csv_rows(path: Path) -> list[dict]:
    with open(path, encoding='utf-8-sig', newline='') as f:
        return list(csv.DictReader(f))


def load_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(SCHEMA_PATH.read_text(encoding='utf-8'))


def seed_sources(conn: sqlite3.Connection) -> None:
    conn.execute(
        """INSERT INTO sources (source_id, name, url, license, terms, fetched_at)
           VALUES (?, ?, ?, ?, ?, ?)""",
        (
            DEMO_SOURCE_ID,
            'UNC Street Drug Analysis Lab -- demo datasets',
            'https://github.com/opioiddatalab/drugchecking/tree/main/datasets',
            'see datasets/README.md',
            'law-enforcement prohibition and attribution norms apply; see repo root README',
            datetime.now(timezone.utc).isoformat(),
        ),
    )


def seed_substances(conn: sqlite3.Connection) -> dict[str, int]:
    """Returns name(lowercased) -> substance_id for detection linkage."""
    name_to_id: dict[str, int] = {}
    for row in read_csv_rows(CHEMDICT_CSV):
        name = row['substance'].strip()
        if not name:
            continue
        classes = [c for c in CHEMDICT_CLASS_COLS if row.get(c, '').strip() == '1']
        cur = conn.execute(
            """INSERT INTO substances (name, pronunciation, pubchem_cid, cas, unii, common_role, classes)
               VALUES (?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(name) DO UPDATE SET
                 pubchem_cid=excluded.pubchem_cid, cas=excluded.cas, unii=excluded.unii,
                 common_role=excluded.common_role, classes=excluded.classes
               RETURNING substance_id""",
            (
                name,
                row.get('pronunciation') or None,
                row.get('PubChemCID') or None,
                row.get('CAS') or None,
                row.get('UNII') or None,
                row.get('commonrole') or None,
                json.dumps(classes),
            ),
        )
        name_to_id[name.lower()] = cur.fetchone()[0]
    return name_to_id


def get_or_create_substance(conn: sqlite3.Connection, name_to_id: dict[str, int], name: str) -> int:
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


def load_samples(conn: sqlite3.Connection) -> None:
    for row in read_csv_rows(ANALYSIS_CSV):
        conn.execute(
            """INSERT INTO samples
                 (sample_id, source_id, external_id, program, state, county_fips,
                  date_collected, expected, color, texture, notes)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON CONFLICT(sample_id) DO NOTHING""",
            (
                row['sampleid'],
                DEMO_SOURCE_ID,
                row['sampleid'],
                row.get('program') or None,
                row.get('state') or None,
                row.get('countyfips') or None,
                row.get('date_collect') or None,
                row.get('expectedsubstance') or None,
                row.get('color') or None,
                row.get('texture') or None,
                row.get('texture_notes') or None,
            ),
        )


def load_detections(conn: sqlite3.Connection, name_to_id: dict[str, int]) -> None:
    for row in read_csv_rows(LAB_DETAIL_CSV):
        substance = row.get('substance', '').strip()
        if not substance:
            continue
        substance_id = get_or_create_substance(conn, name_to_id, substance)
        # abundance in this demo file is 'trace'/'' rather than a number; the
        # primary/trace columns are the reliable signal and map to confidence.
        raw_abundance = row.get('abundance') or ''
        abundance = float(raw_abundance) if raw_abundance.replace('.', '', 1).isdigit() else None
        confidence = 'primary' if row.get('primary') == '1' else ('trace' if row.get('trace') == '1' else None)
        conn.execute(
            """INSERT INTO detections (sample_id, substance_id, method, abundance, confidence)
               VALUES (?, ?, ?, ?, ?)""",
            (
                row['sampleid'],
                substance_id,
                row.get('method') or None,
                abundance,
                confidence,
            ),
        )


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


def main() -> None:
    if DB_PATH.exists():
        DB_PATH.unlink()
    conn = sqlite3.connect(DB_PATH)
    try:
        load_schema(conn)
        seed_sources(conn)
        name_to_id = seed_substances(conn)
        load_samples(conn)
        load_detections(conn, name_to_id)
        populate_fts(conn)
        conn.commit()
    finally:
        conn.close()

    check = sqlite3.connect(DB_PATH)
    n_substances, n_samples, n_detections = (
        check.execute(f"SELECT count(*) FROM {t}").fetchone()[0]
        for t in ('substances', 'samples', 'detections')
    )
    print(f"built {DB_PATH.relative_to(ROOT)}: "
          f"{n_substances} substances, {n_samples} samples, {n_detections} detections")
    check.close()


if __name__ == '__main__':
    main()
