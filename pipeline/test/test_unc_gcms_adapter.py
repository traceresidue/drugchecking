"""pipeline/adapters/unc_gcms.py: datasets/labservice/unc_gcms.csv loads
into detections with gcms_peak -> rt (treating "." as NULL, not 0), and no
detection whose sample_id isn't already a loaded sample crashes the build
(data-coverage extension, see docs/WAVE2_DELEGATION_PLAN.md WP0.4)."""
import sys
import tempfile
import unittest
from pathlib import Path

_PIPELINE_DIR = str(Path(__file__).resolve().parent.parent)
if _PIPELINE_DIR not in sys.path:
    sys.path.insert(0, _PIPELINE_DIR)

from adapters.program_datasets import make_program_adapters
from adapters.unc_demo import UNCDemoAdapter
from adapters.unc_gcms import UNCGCMSAdapter, _parse_confidence, _parse_rt
import build_db

# Ground truth from datasets/labservice/unc_gcms.csv itself: 22,651 data
# rows, 1 with a blank substance (dropped, same as unc_demo's lab_detail.csv
# rule), 8,062 with gcms_peak == "." (-> rt IS NULL).
EXPECTED_TOTAL_ROWS = 22651
EXPECTED_BLANK_SUBSTANCE_ROWS = 1
EXPECTED_DETECTIONS = EXPECTED_TOTAL_ROWS - EXPECTED_BLANK_SUBSTANCE_ROWS
EXPECTED_DOT_PEAK_ROWS = 8062
EXPECTED_RT_NOT_NULL = EXPECTED_DETECTIONS - EXPECTED_DOT_PEAK_ROWS


class TestParseHelpers(unittest.TestCase):
    def test_dot_means_missing_not_zero(self):
        self.assertIsNone(_parse_rt('.'))

    def test_blank_means_missing(self):
        self.assertIsNone(_parse_rt(''))
        self.assertIsNone(_parse_rt(None))

    def test_numeric_string_parses(self):
        self.assertEqual(_parse_rt('9.12'), 9.12)

    def test_junk_does_not_raise(self):
        self.assertIsNone(_parse_rt('not-a-number'))

    def test_confidence_blank_is_primary(self):
        self.assertEqual(_parse_confidence(''), 'primary')
        self.assertEqual(_parse_confidence(None), 'primary')

    def test_confidence_nonblank_is_trace(self):
        self.assertEqual(_parse_confidence('trace'), 'trace')
        self.assertEqual(_parse_confidence('indication of'), 'trace')


class TestUNCGCMSAdapterParse(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.adapter = UNCGCMSAdapter()
        cls.batch = cls.adapter.parse(cls.adapter.fetch(Path('/unused-cache-dir')))

    def test_detection_count(self):
        self.assertEqual(len(self.batch.detections), EXPECTED_DETECTIONS)

    def test_rt_populated_count(self):
        n_rt = sum(1 for d in self.batch.detections if d['rt'] is not None)
        self.assertEqual(n_rt, EXPECTED_RT_NOT_NULL)

    def test_no_zero_rt_from_dot(self):
        # "." must become None, never 0.0.
        self.assertFalse(any(d['rt'] == 0.0 for d in self.batch.detections))

    def test_every_detection_has_sample_id_and_substance(self):
        for d in self.batch.detections:
            self.assertTrue(d['sample_id'])
            self.assertTrue(d['substance'])

    def test_no_substances_or_samples_produced(self):
        # Detections-only adapter; samples come from analysis_dataset.csv
        # adapters, substances from chemdictionary via UNCDemoAdapter.
        self.assertEqual(self.batch.samples, [])
        self.assertEqual(self.batch.substances, [])


class TestUNCGCMSAdapterIntegration(unittest.TestCase):
    def test_orphan_sample_ids_are_skipped_not_crashed(self):
        # Demo set (20 samples) has zero overlap with unc_gcms.csv sample
        # ids, so with only [UNCDemoAdapter, UNCGCMSAdapter] essentially all
        # GCMS detections are orphaned -- build() must still complete
        # (FK-safe skip, not a crash) and must not pollute `substances` with
        # names from skipped detections.
        with tempfile.TemporaryDirectory() as tmp:
            db_path = Path(tmp) / 'test.sqlite'
            conn = build_db.build(
                db_path=db_path,
                adapters=[UNCDemoAdapter(), UNCGCMSAdapter()],
            )
            try:
                n_substances = conn.execute("SELECT count(*) FROM substances").fetchone()[0]
                n_detections = conn.execute("SELECT count(*) FROM detections").fetchone()[0]
                # Unchanged from the demo-only baseline: no GCMS detection
                # found a matching sample to attach to.
                self.assertEqual(n_substances, 158)
                self.assertEqual(n_detections, 115)
            finally:
                conn.close()

    def test_rt_populated_end_to_end_with_full_sample_coverage(self):
        with tempfile.TemporaryDirectory() as tmp:
            db_path = Path(tmp) / 'test.sqlite'
            conn = build_db.build(
                db_path=db_path,
                adapters=[UNCDemoAdapter(), *make_program_adapters(), UNCGCMSAdapter()],
            )
            try:
                (n_rt,) = conn.execute(
                    "SELECT count(*) FROM detections WHERE rt IS NOT NULL"
                ).fetchone()
                self.assertGreater(n_rt, 0)
                (n_zero,) = conn.execute(
                    "SELECT count(*) FROM detections WHERE rt = 0"
                ).fetchone()
                self.assertEqual(n_zero, 0)
            finally:
                conn.close()


if __name__ == '__main__':
    unittest.main()
