"""mona_json.py must parse fixtures/reference/mona_sample.json -- a real
excerpt of the MoNA GC-MS export (each record carries its own genuine CC BY
/ CC BY-SA / CC BY-NC-SA license, unlike the synthetic MSP/JCAMP-DX
fixtures) -- into correct spectra rows. Expected counts are computed from
the fixture itself rather than hard-coded, so the fixture can grow (it
started at 7 records, then a 100-record diversity pass was added to widen
pipeline test coverage) without the test file needing hand edits."""
import json
import sys
import unittest
from pathlib import Path

# See test_unc_demo_adapter.py for why this bootstrap is needed here too.
_PIPELINE_DIR = str(Path(__file__).resolve().parent.parent)
if _PIPELINE_DIR not in sys.path:
    sys.path.insert(0, _PIPELINE_DIR)

from adapters.mona_json import FIXTURE_MONA, MoNAJSONAdapter, _parse_spectrum_string

FIXTURE_RECORDS = json.loads(FIXTURE_MONA.read_text(encoding='utf-8'))
FIXTURE_NAMES = {r['compound'][0]['names'][0]['name'].strip().lower() for r in FIXTURE_RECORDS}


class TestParseSpectrumString(unittest.TestCase):

    def test_basic_pairs(self):
        self.assertEqual(
            _parse_spectrum_string("41.0:12.3 55.0:34.0"),
            [[41.0, 12.3], [55.0, 34.0]],
        )

    def test_malformed_token_skipped(self):
        self.assertEqual(_parse_spectrum_string("41.0:12.3 garbage 55.0:34.0"), [[41.0, 12.3], [55.0, 34.0]])

    def test_empty_string(self):
        self.assertEqual(_parse_spectrum_string(""), [])


class TestMoNAJSONAdapter(unittest.TestCase):

    def setUp(self):
        self.adapter = MoNAJSONAdapter()
        raw_paths = self.adapter.fetch(Path('/unused-cache-dir'))
        self.batch = self.adapter.parse(raw_paths)

    def test_fetch_returns_fixture_path(self):
        self.assertEqual(self.adapter.fetch(Path('/unused-cache-dir')), [FIXTURE_MONA])

    def test_fixture_has_no_duplicate_names(self):
        # Each record's own name is unique -- guards against the fixture
        # accidentally shipping two records for the same compound.
        self.assertEqual(len(FIXTURE_RECORDS), len(FIXTURE_NAMES))

    def test_spectra_count_matches_fixture_record_count(self):
        self.assertEqual(len(self.batch.spectra), len(FIXTURE_RECORDS))

    def test_no_samples_or_detections_produced(self):
        self.assertEqual(self.batch.samples, [])
        self.assertEqual(self.batch.detections, [])
        self.assertEqual(self.batch.substances, [])

    def test_substance_names_match_fixture_selection(self):
        names = {sp['substance'].lower() for sp in self.batch.spectra}
        self.assertEqual(names, FIXTURE_NAMES)

    def test_spectrum_shape(self):
        for sp in self.batch.spectra:
            self.assertEqual(sp['technique'], 'MS')
            self.assertEqual(sp['role'], 'reference')
            self.assertEqual(sp['format_origin'], 'MoNA-JSON')
            self.assertIsInstance(sp['peaks'], list)
            self.assertGreater(len(sp['peaks']), 0)
            for peak in sp['peaks']:
                self.assertEqual(len(peak), 2)
            self.assertIsInstance(sp['raw'], bytes)

    def test_meta_carries_real_per_record_license(self):
        for sp in self.batch.spectra:
            self.assertIn(sp['meta']['license'], {'CC BY', 'CC BY-SA', 'CC BY-NC-SA'})
            self.assertTrue(sp['meta']['accession'])

    def test_only_names_filter(self):
        adapter = MoNAJSONAdapter(only_names={'cocaine', 'morphine'})
        batch = adapter.parse(adapter.fetch(Path('/unused-cache-dir')))
        names = {sp['substance'].lower() for sp in batch.spectra}
        self.assertEqual(names, {'cocaine', 'morphine'})

    def test_limit(self):
        adapter = MoNAJSONAdapter(limit=2)
        batch = adapter.parse(adapter.fetch(Path('/unused-cache-dir')))
        self.assertEqual(len(batch.spectra), 2)


class TestMoNAAdapterEndToEnd(unittest.TestCase):
    """Confirms the adapter's spectra link to substances.name rows via
    build_db's get_or_create_substance (case-insensitive), same as MSP/JCAMP
    -- some fixture names pre-exist in chemdictionary, some don't and get
    auto-created (get_or_create_substance's documented behavior), and this
    test checks both paths rather than assuming everything pre-exists."""

    def test_links_to_substances_creating_new_ones_as_needed(self):
        import tempfile
        import build_db
        from adapters.unc_demo import UNCDemoAdapter

        with tempfile.TemporaryDirectory() as tmp:
            # Baseline: UNCDemoAdapter alone, to know which substance names
            # already exist (chemdictionary.csv's 156 + 2 lab_detail-only,
            # per test_unc_demo_adapter.py) before MoNA adds anything.
            baseline_path = Path(tmp) / 'baseline.sqlite'
            baseline_conn = build_db.build(db_path=baseline_path, adapters=[UNCDemoAdapter()])
            existing_names = {r[0] for r in baseline_conn.execute("SELECT lower(name) FROM substances")}
            (n_baseline,) = baseline_conn.execute("SELECT count(*) FROM substances").fetchone()
            baseline_conn.close()
            n_new = len(FIXTURE_NAMES - existing_names)

            db_path = Path(tmp) / 'test.sqlite'
            conn = build_db.build(db_path=db_path, adapters=[UNCDemoAdapter(), MoNAJSONAdapter()])
            try:
                rows = conn.execute(
                    """SELECT sub.name, sp.technique, sp.role, sp.format_origin
                       FROM spectra sp JOIN substances sub ON sub.substance_id = sp.substance_id
                       WHERE sp.format_origin = 'MoNA-JSON' ORDER BY sub.name"""
                ).fetchall()
                names = {r[0].lower() for r in rows}
                self.assertEqual(names, FIXTURE_NAMES)
                for _, technique, role, fmt in rows:
                    self.assertEqual((technique, role, fmt), ('MS', 'reference', 'MoNA-JSON'))
                # substances after build = the UNCDemoAdapter baseline plus
                # exactly the MoNA fixture names that weren't already there.
                (n_substances,) = conn.execute("SELECT count(*) FROM substances").fetchone()
                self.assertEqual(n_substances, n_baseline + n_new)
            finally:
                conn.close()


if __name__ == '__main__':
    unittest.main()
