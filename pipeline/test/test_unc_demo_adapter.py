"""Refactored UNCDemoAdapter must produce the same rows the original
single-file B0 loader did (documented in pipeline/README.md: 156
chemdictionary substances, 20 samples, 115 detections, 158 substances total
after 2 lab_detail-only substances are created) -- no regression from the
adapter-ization refactor."""
import sys
import tempfile
import unittest
from pathlib import Path

# Ensure pipeline/ (not just pipeline/test/) is on sys.path so `adapters.*`
# and `build_db` import the same way tests do regardless of how the test
# runner discovered this module (bare `unittest discover` does not always
# execute test/__init__.py before importing sibling test_*.py modules).
_PIPELINE_DIR = str(Path(__file__).resolve().parent.parent)
if _PIPELINE_DIR not in sys.path:
    sys.path.insert(0, _PIPELINE_DIR)

from adapters.unc_demo import UNCDemoAdapter
import build_db


class TestUNCDemoAdapterParse(unittest.TestCase):
    """Unit-level: adapter.parse() alone, no database involved."""

    @classmethod
    def setUpClass(cls):
        adapter = UNCDemoAdapter()
        raw_paths = adapter.fetch(Path('/unused-cache-dir'))
        cls.batch = adapter.parse(raw_paths)

    def test_substances_from_chemdictionary(self):
        # chemdictionary.csv has 156 distinct, non-blank substance rows.
        self.assertEqual(len(self.batch.substances), 156)
        names = {s['name'].lower() for s in self.batch.substances}
        self.assertIn('fentanyl', names)
        self.assertIn('xylazine', names)

    def test_substance_rows_carry_expected_fields(self):
        by_name = {s['name'].lower(): s for s in self.batch.substances}
        fentanyl = by_name['fentanyl']
        self.assertIn('pubchem_cid', fentanyl)
        self.assertIsInstance(fentanyl['classes'], list)

    def test_samples_from_analysis_dataset(self):
        self.assertEqual(len(self.batch.samples), 20)
        sample_ids = {s['sample_id'] for s in self.batch.samples}
        self.assertEqual(len(sample_ids), 20)  # all unique

    def test_detections_from_lab_detail(self):
        self.assertEqual(len(self.batch.detections), 115)
        for d in self.batch.detections:
            self.assertTrue(d['sample_id'])
            self.assertTrue(d['substance'])


class TestUNCDemoAdapterIntegration(unittest.TestCase):
    """End-to-end: run build_db.build() (schema + adapters + FTS) against a
    temp db path and check the final counts match the documented baseline --
    this is the "python3 pipeline/build_db.py still works, no regression"
    check from a test runner rather than a human eyeballing stdout."""

    def test_build_reports_documented_counts(self):
        with tempfile.TemporaryDirectory() as tmp:
            db_path = Path(tmp) / 'test.sqlite'
            conn = build_db.build(db_path=db_path, adapters=[UNCDemoAdapter()])
            try:
                n_substances = conn.execute("SELECT count(*) FROM substances").fetchone()[0]
                n_samples = conn.execute("SELECT count(*) FROM samples").fetchone()[0]
                n_detections = conn.execute("SELECT count(*) FROM detections").fetchone()[0]
                # 156 from chemdictionary + 2 lab_detail substances not in
                # chemdictionary ("non-specific sugars", "non-specific
                # organic acids") = 158.
                self.assertEqual(n_substances, 158)
                self.assertEqual(n_samples, 20)
                self.assertEqual(n_detections, 115)
            finally:
                conn.close()

    def test_source_row_seeded(self):
        with tempfile.TemporaryDirectory() as tmp:
            db_path = Path(tmp) / 'test.sqlite'
            conn = build_db.build(db_path=db_path, adapters=[UNCDemoAdapter()])
            try:
                row = conn.execute(
                    "SELECT source_id, license FROM sources WHERE source_id = ?",
                    (UNCDemoAdapter.source_id,),
                ).fetchone()
                self.assertIsNotNone(row)
            finally:
                conn.close()

    def test_fts_populated(self):
        with tempfile.TemporaryDirectory() as tmp:
            db_path = Path(tmp) / 'test.sqlite'
            conn = build_db.build(db_path=db_path, adapters=[UNCDemoAdapter()])
            try:
                (n,) = conn.execute("SELECT count(*) FROM substances_fts").fetchone()
                self.assertEqual(n, 158)
            finally:
                conn.close()


if __name__ == '__main__':
    unittest.main()
