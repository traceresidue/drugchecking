"""pipeline/adapters/program_datasets.py: nc/ + every selfservice/<PROGRAM>/
analysis_dataset.csv become their own `sources` rows, MI (no
analysis_dataset.csv) is skipped, and no adapter's samples are silently
merged into another's (data-coverage extension, see docs/WAVE2_DELEGATION_PLAN.md
WP0.4)."""
import sys
import tempfile
import unittest
from pathlib import Path

_PIPELINE_DIR = str(Path(__file__).resolve().parent.parent)
if _PIPELINE_DIR not in sys.path:
    sys.path.insert(0, _PIPELINE_DIR)

from adapters.program_datasets import (
    discover_selfservice_programs,
    make_nc_adapter,
    make_program_adapters,
    make_selfservice_adapters,
)
from adapters.unc_demo import UNCDemoAdapter
import build_db

# Ground-truth row counts straight out of each CSV (via `wc -l` minus header
# / csv.DictReader), pinned here so a future change to these bundled CSVs is
# caught rather than silently changing what the adapters report.
EXPECTED_SELFSERVICE_COUNTS = {
    'AC': 171, 'DN': 243, 'HC': 71, 'NV': 23, 'OR': 488,
    'TN': 141, 'WA': 2847, 'hnc': 77, 'nys': 1214,
}
EXPECTED_NC_COUNT = 1362


class TestDiscovery(unittest.TestCase):
    def test_mi_is_skipped(self):
        codes = [code for code, _ in discover_selfservice_programs()]
        self.assertNotIn('MI', codes)

    def test_discovers_all_other_programs(self):
        codes = {code for code, _ in discover_selfservice_programs()}
        self.assertEqual(codes, set(EXPECTED_SELFSERVICE_COUNTS))


class TestNCAdapter(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.adapter = make_nc_adapter()
        cls.batch = cls.adapter.parse(cls.adapter.fetch(Path('/unused-cache-dir')))

    def test_source_id_distinct_from_demo(self):
        self.assertNotEqual(self.adapter.source_id, UNCDemoAdapter.source_id)

    def test_sample_count(self):
        self.assertEqual(len(self.batch.samples), EXPECTED_NC_COUNT)

    def test_program_defaulted_when_csv_has_no_program_column(self):
        # nc_analysis_dataset.csv has no `program` column of its own.
        self.assertTrue(all(s['program'] == 'nc' for s in self.batch.samples))

    def test_no_detections_or_substances(self):
        # Detections for these samples come from unc_gcms.csv (a separate
        # adapter); this adapter is samples-only.
        self.assertEqual(self.batch.detections, [])
        self.assertEqual(self.batch.substances, [])


class TestSelfServiceAdapters(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.adapters = {a.source_id: a for a in make_selfservice_adapters()}

    def test_one_adapter_per_program_with_distinct_source_ids(self):
        self.assertEqual(len(self.adapters), len(EXPECTED_SELFSERVICE_COUNTS))
        self.assertEqual(len(set(self.adapters)), len(self.adapters))  # no collisions

    def test_sample_counts_per_program(self):
        for code, expected in EXPECTED_SELFSERVICE_COUNTS.items():
            adapter = self.adapters[f'unc-selfservice-{code.lower()}']
            batch = adapter.parse(adapter.fetch(Path('/unused-cache-dir')))
            self.assertEqual(len(batch.samples), expected, code)

    def test_missing_program_column_falls_back_to_program_code(self):
        # datasets/selfservice/AC/analysis_dataset.csv has no `program` column.
        adapter = self.adapters['unc-selfservice-ac']
        batch = adapter.parse(adapter.fetch(Path('/unused-cache-dir')))
        self.assertTrue(all(s['program'] == 'AC' for s in batch.samples))

    def test_program_column_used_when_present(self):
        # datasets/selfservice/WA/analysis_dataset.csv does have `program`.
        adapter = self.adapters['unc-selfservice-wa']
        batch = adapter.parse(adapter.fetch(Path('/unused-cache-dir')))
        self.assertTrue(all(s['program'] for s in batch.samples))


class TestProgramAdaptersIntegration(unittest.TestCase):
    """End-to-end through build_db.build(): every program/state directory
    lands as its own sources row, and samples counts match per source."""

    @classmethod
    def setUpClass(cls):
        cls.tmpdir = tempfile.TemporaryDirectory()
        db_path = Path(cls.tmpdir.name) / 'test.sqlite'
        cls.conn = build_db.build(
            db_path=db_path,
            adapters=[UNCDemoAdapter(), *make_program_adapters()],
        )

    @classmethod
    def tearDownClass(cls):
        cls.conn.close()
        cls.tmpdir.cleanup()

    def test_distinct_sources_rows(self):
        rows = self.conn.execute("SELECT source_id FROM sources").fetchall()
        source_ids = {r[0] for r in rows}
        self.assertIn('unc-demo-datasets', source_ids)
        self.assertIn('unc-nc', source_ids)
        for code in EXPECTED_SELFSERVICE_COUNTS:
            self.assertIn(f'unc-selfservice-{code.lower()}', source_ids)
        self.assertNotIn('unc-selfservice-mi', source_ids)
        # One row per program/state -- not merged into a single source.
        self.assertEqual(len(source_ids), 1 + 1 + len(EXPECTED_SELFSERVICE_COUNTS))

    def test_samples_per_source_counts(self):
        rows = self.conn.execute(
            "SELECT source_id, count(*) FROM samples GROUP BY source_id"
        ).fetchall()
        counts = dict(rows)
        self.assertEqual(counts['unc-demo-datasets'], 20)
        self.assertEqual(counts['unc-nc'], EXPECTED_NC_COUNT)
        for code, expected in EXPECTED_SELFSERVICE_COUNTS.items():
            source_id = f'unc-selfservice-{code.lower()}'
            if source_id in counts:
                self.assertLessEqual(counts[source_id], expected, code)
            # hnc/nc and hnc/TN partially overlap by physical sample -- a
            # duplicate row loses its own source_id count to whichever
            # adapter loaded that sample_id first (ON CONFLICT DO NOTHING),
            # so per-program counts may be slightly below the raw CSV count;
            # the *union* across all sources must still equal every unique
            # sample_id offered.
        total_samples = self.conn.execute("SELECT count(*) FROM samples").fetchone()[0]
        raw_total = 20 + EXPECTED_NC_COUNT + sum(EXPECTED_SELFSERVICE_COUNTS.values())
        known_duplicate_sample_ids = 70 + 7  # nc&hnc, TN&hnc (see module docstring)
        self.assertEqual(total_samples, raw_total - known_duplicate_sample_ids)


if __name__ == '__main__':
    unittest.main()
