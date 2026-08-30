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

from adapters.unc_demo import UNCDemoAdapter, parse_chemdictionary_rows
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


class TestChemdictionarySmilesWiring(unittest.TestCase):
    """substances.smiles is populated from pipeline/cache/smiles/<CID>.txt
    (resolve_smiles.py's cache) when present, and left None -- never a
    crash -- for any row whose CID has no cache entry, or when no
    smiles_dir is given at all (e.g. an empty/never-run cache)."""

    def setUp(self):
        rows = [
            {'substance': 'Fentanyl', 'PubChemCID': '3345', 'pronunciation': '',
             'CAS': '', 'UNII': '', 'commonrole': ''},
            {'substance': 'Xylazine', 'PubChemCID': '5707', 'pronunciation': '',
             'CAS': '', 'UNII': '', 'commonrole': ''},
            {'substance': 'No CID Substance', 'PubChemCID': '', 'pronunciation': '',
             'CAS': '', 'UNII': '', 'commonrole': ''},
        ]
        self.rows = rows

    def test_no_smiles_dir_leaves_smiles_none(self):
        substances = parse_chemdictionary_rows(self.rows, smiles_dir=None)
        self.assertTrue(all(s['smiles'] is None for s in substances))

    def test_cached_cid_populates_smiles(self):
        with tempfile.TemporaryDirectory() as tmp:
            smiles_dir = Path(tmp)
            (smiles_dir / '3345.txt').write_text('CN(CCC1)C1CCNC(=O)c1ccccc1\n')
            substances = parse_chemdictionary_rows(self.rows, smiles_dir=smiles_dir)
        by_name = {s['name']: s for s in substances}
        self.assertEqual(by_name['Fentanyl']['smiles'], 'CN(CCC1)C1CCNC(=O)c1ccccc1')
        # 5707 (Xylazine) has no cache file -> smiles stays None, no crash.
        self.assertIsNone(by_name['Xylazine']['smiles'])
        # No PubChemCID at all -> smiles stays None too.
        self.assertIsNone(by_name['No CID Substance']['smiles'])

    def test_empty_cache_file_is_treated_as_no_smiles(self):
        with tempfile.TemporaryDirectory() as tmp:
            smiles_dir = Path(tmp)
            (smiles_dir / '3345.txt').write_text('   \n')  # whitespace-only
            substances = parse_chemdictionary_rows(self.rows, smiles_dir=smiles_dir)
        by_name = {s['name']: s for s in substances}
        self.assertIsNone(by_name['Fentanyl']['smiles'])

    def test_adapter_fetch_picks_up_smiles_cache_dir_when_present(self):
        with tempfile.TemporaryDirectory() as tmp:
            cache_dir = Path(tmp)
            (cache_dir / 'smiles').mkdir()
            paths = UNCDemoAdapter().fetch(cache_dir)
            names = {p.name for p in paths}
            self.assertIn('smiles', names)

    def test_adapter_fetch_omits_smiles_dir_when_absent(self):
        with tempfile.TemporaryDirectory() as tmp:
            # cache_dir exists but has no smiles/ subdirectory -- as it
            # would if resolve_smiles.py has never been run.
            cache_dir = Path(tmp)
            paths = UNCDemoAdapter().fetch(cache_dir)
            names = {p.name for p in paths}
            self.assertNotIn('smiles', names)

    def test_build_populates_smiles_column_from_cache(self):
        """End-to-end: build_db.build() against the real chemdictionary.csv,
        with a temporary cache/smiles/ dir substituted in for the module's
        CACHE_DIR, actually lands a value in substances.smiles."""
        with tempfile.TemporaryDirectory() as tmp:
            tmp_path = Path(tmp)
            smiles_dir = tmp_path / 'smiles'
            smiles_dir.mkdir()
            # 3345 is fentanyl's real PubChemCID in chemdictionary.csv.
            (smiles_dir / '3345.txt').write_text('CN(CCC1)C1CCNC(=O)c1ccccc1\n')

            original_cache_dir = build_db.CACHE_DIR
            build_db.CACHE_DIR = tmp_path
            try:
                db_path = tmp_path / 'test.sqlite'
                conn = build_db.build(db_path=db_path, adapters=[UNCDemoAdapter()])
                try:
                    row = conn.execute(
                        "SELECT smiles FROM substances WHERE lower(name) = 'fentanyl'"
                    ).fetchone()
                    self.assertEqual(row[0], 'CN(CCC1)C1CCNC(=O)c1ccccc1')
                    # A substance with a real CID but no cache entry stays NULL.
                    other = conn.execute(
                        "SELECT smiles FROM substances WHERE smiles IS NULL LIMIT 1"
                    ).fetchone()
                    self.assertIsNotNone(other)
                finally:
                    conn.close()
            finally:
                build_db.CACHE_DIR = original_cache_dir


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
