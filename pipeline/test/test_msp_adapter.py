"""msp_library.py must parse fixtures/reference/example.msp (a synthetic,
hand-authored MSP fixture -- see the file's own header comment) into correct
spectra rows: peak counts, substance linkage, and role/technique/format_origin."""
import sys
import unittest
from pathlib import Path

# See test_unc_demo_adapter.py for why this bootstrap is needed here too.
_PIPELINE_DIR = str(Path(__file__).resolve().parent.parent)
if _PIPELINE_DIR not in sys.path:
    sys.path.insert(0, _PIPELINE_DIR)

from adapters.msp_library import FIXTURE_MSP, MSPLibraryAdapter, parse_msp_text

FIXTURE_TEXT = FIXTURE_MSP.read_text(encoding='utf-8')


class TestParseMspText(unittest.TestCase):
    """Parser-only tests against the raw text (no Adapter/Path involved)."""

    def setUp(self):
        self.entries = parse_msp_text(FIXTURE_TEXT)

    def test_entry_count(self):
        self.assertEqual(len(self.entries), 3)

    def test_names_and_cas(self):
        names = [e['header']['name'] for e in self.entries]
        self.assertEqual(names, ['Fentanyl', 'Acetaminophen', 'Xylazine'])
        cas_numbers = [e['header']['cas#'] for e in self.entries]
        self.assertEqual(cas_numbers, ['437-38-7', '103-90-2', '7361-61-7'])

    def test_peak_counts_match_num_peaks_header(self):
        for e in self.entries:
            declared = int(e['header']['num peaks'])
            self.assertEqual(len(e['peaks']), declared)

    def test_fentanyl_peaks_exact(self):
        fentanyl = self.entries[0]
        self.assertEqual(
            fentanyl['peaks'],
            [(57.0, 15.0), (105.0, 25.0), (146.0, 45.0), (189.0, 100.0), (245.0, 60.0)],
        )

    def test_file_comment_lines_ignored(self):
        # The fixture's leading '#'-prefixed disclaimer lines (before the
        # first "Name:") must not leak into any entry as a spurious 4th
        # record or a bogus header key.
        expected_keys = {'name', 'cas#', 'db#', 'comment', 'num peaks'}
        for e in self.entries:
            self.assertEqual(set(e['header'].keys()), expected_keys)

    def test_raw_block_captured(self):
        for e in self.entries:
            self.assertIn('Name:', e['raw'])
            self.assertIn('Num Peaks:', e['raw'])


class TestMSPLibraryAdapter(unittest.TestCase):
    def setUp(self):
        self.adapter = MSPLibraryAdapter()
        raw_paths = self.adapter.fetch(Path('/unused-cache-dir'))
        self.batch = self.adapter.parse(raw_paths)

    def test_fetch_returns_fixture_path(self):
        paths = self.adapter.fetch(Path('/unused-cache-dir'))
        self.assertEqual(paths, [FIXTURE_MSP])

    def test_spectra_count(self):
        self.assertEqual(len(self.batch.spectra), 3)

    def test_no_samples_or_detections_produced(self):
        self.assertEqual(self.batch.samples, [])
        self.assertEqual(self.batch.detections, [])
        self.assertEqual(self.batch.substances, [])

    def test_spectrum_shape(self):
        for sp in self.batch.spectra:
            self.assertEqual(sp['technique'], 'MS')
            self.assertEqual(sp['role'], 'reference')
            self.assertEqual(sp['format_origin'], 'MSP')
            self.assertIn('substance', sp)
            self.assertTrue(sp['substance'])
            self.assertIsInstance(sp['peaks'], list)
            self.assertGreater(len(sp['peaks']), 0)
            self.assertIsInstance(sp['raw'], bytes)

    def test_substance_linkage_by_name(self):
        substances = {sp['substance'] for sp in self.batch.spectra}
        self.assertEqual(substances, {'Fentanyl', 'Acetaminophen', 'Xylazine'})

    def test_meta_carries_cas_and_comment(self):
        fentanyl_spectrum = next(sp for sp in self.batch.spectra if sp['substance'] == 'Fentanyl')
        self.assertEqual(fentanyl_spectrum['meta']['cas'], '437-38-7')
        self.assertIn('not real SWGDRUG/NIST data', fentanyl_spectrum['meta']['comment'])

    def test_source_metadata_is_honest_about_being_synthetic(self):
        self.assertIn('synthetic fixture', MSPLibraryAdapter.license.lower())
        self.assertIn('synthetic fixture', MSPLibraryAdapter.terms.lower())


class TestMSPAdapterEndToEnd(unittest.TestCase):
    """Confirms the adapter's spectra link to real substances.name rows via
    build_db's get_or_create_substance (case-insensitive), same as detections."""

    def test_links_to_existing_chemdictionary_substance(self):
        import tempfile
        import build_db
        from adapters.unc_demo import UNCDemoAdapter

        with tempfile.TemporaryDirectory() as tmp:
            db_path = Path(tmp) / 'test.sqlite'
            conn = build_db.build(db_path=db_path, adapters=[UNCDemoAdapter(), MSPLibraryAdapter()])
            try:
                rows = conn.execute(
                    """SELECT sub.name, sp.technique, sp.role, sp.format_origin
                       FROM spectra sp JOIN substances sub ON sub.substance_id = sp.substance_id
                       WHERE sp.format_origin = 'MSP' ORDER BY sub.name"""
                ).fetchall()
                names = [r[0] for r in rows]
                self.assertEqual(names, ['acetaminophen', 'fentanyl', 'xylazine'])
                for _, technique, role, fmt in rows:
                    self.assertEqual((technique, role, fmt), ('MS', 'reference', 'MSP'))
                # No duplicate substances created -- MSP names matched the
                # existing chemdictionary-seeded rows case-insensitively.
                (n_substances,) = conn.execute("SELECT count(*) FROM substances").fetchone()
                self.assertEqual(n_substances, 158)
            finally:
                conn.close()


if __name__ == '__main__':
    unittest.main()
