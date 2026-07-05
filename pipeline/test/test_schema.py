"""schema.sql sanity: loads cleanly, FK pragma is honored, expected tables /
indexes / FTS virtual tables exist."""
import sqlite3
import unittest
from pathlib import Path

SCHEMA_PATH = Path(__file__).resolve().parent.parent / 'schema.sql'

EXPECTED_TABLES = {
    'sources', 'substances', 'samples', 'detections', 'spectra',
    'libraries', 'library_members', 'substances_fts', 'samples_fts',
}
EXPECTED_INDEXES = {
    'idx_samples_source', 'idx_samples_date',
    'idx_detections_sample', 'idx_detections_substance',
    'idx_spectra_sample', 'idx_spectra_substance',
}


class TestSchema(unittest.TestCase):
    def setUp(self):
        self.conn = sqlite3.connect(':memory:')
        self.conn.executescript(SCHEMA_PATH.read_text(encoding='utf-8'))

    def tearDown(self):
        self.conn.close()

    def test_loads_cleanly(self):
        # setUp already ran executescript(); getting here means no exception.
        self.assertTrue(True)

    def test_foreign_keys_pragma_on(self):
        # schema.sql sets PRAGMA foreign_keys = ON as part of the script;
        # confirm it actually took effect on this connection.
        (fk_enabled,) = self.conn.execute("PRAGMA foreign_keys").fetchone()
        self.assertEqual(fk_enabled, 1)

    def test_expected_tables_exist(self):
        rows = self.conn.execute(
            "SELECT name FROM sqlite_master WHERE type IN ('table', 'view')"
        ).fetchall()
        names = {r[0] for r in rows}
        missing = EXPECTED_TABLES - names
        self.assertEqual(missing, set(), f"missing tables: {missing}")

    def test_expected_indexes_exist(self):
        rows = self.conn.execute(
            "SELECT name FROM sqlite_master WHERE type = 'index'"
        ).fetchall()
        names = {r[0] for r in rows}
        missing = EXPECTED_INDEXES - names
        self.assertEqual(missing, set(), f"missing indexes: {missing}")

    def test_fk_violation_is_rejected(self):
        self.conn.execute(
            "INSERT INTO sources (source_id, name, fetched_at) VALUES ('s', 'n', 'now')"
        )
        with self.assertRaises(sqlite3.IntegrityError):
            self.conn.execute(
                "INSERT INTO samples (sample_id, source_id) VALUES ('sample-1', 'does-not-exist')"
            )

    def test_substances_name_unique(self):
        self.conn.execute("INSERT INTO substances (name) VALUES ('fentanyl')")
        with self.assertRaises(sqlite3.IntegrityError):
            self.conn.execute("INSERT INTO substances (name) VALUES ('fentanyl')")


if __name__ == '__main__':
    unittest.main()
