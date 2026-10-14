"""jcamp_ftir.py must parse fixtures/reference/example.jdx (a synthetic,
hand-authored JCAMP-DX fixture -- see the file's own header comments) into
correct spectra rows, including correctly decoding the ASDF-compressed
##XYDATA block."""
import sys
import unittest
from pathlib import Path

# See test_unc_demo_adapter.py for why this bootstrap is needed here too.
_PIPELINE_DIR = str(Path(__file__).resolve().parent.parent)
if _PIPELINE_DIR not in sys.path:
    sys.path.insert(0, _PIPELINE_DIR)

from adapters.jcamp_ftir import (
    FIXTURE_JDX,
    JCAMPFTIRAdapter,
    _decode_asdf_values,
    parse_jcamp_text,
)

FIXTURE_TEXT = FIXTURE_JDX.read_text(encoding='utf-8')


class TestDecodeAsdfValues(unittest.TestCase):
    """Direct unit tests of the ASDF pseudo-digit decoder, independent of
    the fixture, so the SQZ/DIF/DUP table itself is pinned down."""

    def test_plain_pac_numbers(self):
        self.assertEqual(_decode_asdf_values('100 200 300'), [100.0, 200.0, 300.0])

    def test_sqz_absolute(self):
        # '@'=0, 'A'=1 .. 'I'=9 (positive); continuation digits extend it.
        self.assertEqual(_decode_asdf_values('A000'), [1000.0])

    def test_sqz_then_dif_chain(self):
        # SQZ 1000, then DIF +50, DIF -40, DIF -20, DIF +210 (see
        # example.jdx's ##XYDATA line, decoded by hand for this test).
        self.assertEqual(
            _decode_asdf_values('A000N0m0k0K10'),
            [1000.0, 1050.0, 1010.0, 990.0, 1200.0],
        )

    def test_dup_repeats_last_step(self):
        # SQZ 5 (via 'E'), then DUP 'T' (=2) repeats it 1 additional time.
        self.assertEqual(_decode_asdf_values('ET'), [5.0, 5.0])

    def test_dif_zero_percent(self):
        # SQZ 10 ('A0'), then DIF zero ('%') repeats the same value.
        self.assertEqual(_decode_asdf_values('A0%'), [10.0, 10.0])


class TestParseJcampText(unittest.TestCase):
    def setUp(self):
        self.records = parse_jcamp_text(FIXTURE_TEXT)

    def test_block_count(self):
        self.assertEqual(len(self.records), 2)

    def test_titles_and_cas(self):
        self.assertEqual([r['title'] for r in self.records], ['Methamphetamine', 'Caffeine'])
        self.assertEqual([r['cas'] for r in self.records], ['537-46-2', '58-08-2'])

    def test_xydata_block_decoded_correctly(self):
        meth = self.records[0]
        self.assertEqual(meth['xunits'], '1/CM')
        self.assertEqual(meth['yunits'], 'ABSORBANCE')
        # X = (400 + i*1) * XFACTOR(1); Y = raw * YFACTOR(0.001).
        expected = [
            (400.0, 1.0), (401.0, 1.05), (402.0, 1.01), (403.0, 0.99), (404.0, 1.2),
        ]
        self.assertEqual(len(meth['points']), 5)
        for (x, y), (ex, ey) in zip(meth['points'], expected):
            self.assertAlmostEqual(x, ex)
            self.assertAlmostEqual(y, ey)

    def test_peak_table_block_decoded_correctly(self):
        caffeine = self.records[1]
        self.assertEqual(caffeine['yunits'], 'TRANSMITTANCE')
        self.assertEqual(
            caffeine['points'],
            [(1650.0, 45.2), (1700.0, 60.1), (1750.0, 30.0)],
        )


class TestJCAMPFTIRAdapter(unittest.TestCase):
    def setUp(self):
        self.adapter = JCAMPFTIRAdapter()
        raw_paths = self.adapter.fetch(Path('/unused-cache-dir'))
        self.batch = self.adapter.parse(raw_paths)

    def test_fetch_returns_fixture_path(self):
        self.assertEqual(self.adapter.fetch(Path('/unused-cache-dir')), [FIXTURE_JDX])

    def test_spectra_count(self):
        self.assertEqual(len(self.batch.spectra), 2)

    def test_spectrum_shape(self):
        for sp in self.batch.spectra:
            self.assertEqual(sp['technique'], 'FTIR')
            self.assertEqual(sp['role'], 'reference')
            self.assertEqual(sp['format_origin'], 'JCAMP-DX')
            self.assertTrue(sp['substance'])
            self.assertIsInstance(sp['peaks'], list)
            self.assertGreater(len(sp['peaks']), 0)
            self.assertIsInstance(sp['raw'], bytes)

    def test_substance_linkage_by_title(self):
        substances = {sp['substance'] for sp in self.batch.spectra}
        self.assertEqual(substances, {'Methamphetamine', 'Caffeine'})

    def test_decompressed_peaks_match_hand_computed_values(self):
        meth = next(sp for sp in self.batch.spectra if sp['substance'] == 'Methamphetamine')
        self.assertEqual(
            meth['peaks'],
            [[400.0, 1.0], [401.0, 1.05], [402.0, 1.01], [403.0, 0.99], [404.0, 1.2]],
        )

    def test_source_metadata_is_honest_about_being_synthetic(self):
        self.assertIn('synthetic fixture', JCAMPFTIRAdapter.license.lower())
        self.assertIn('synthetic fixture', JCAMPFTIRAdapter.terms.lower())


class TestJCAMPAdapterEndToEnd(unittest.TestCase):
    def test_links_to_existing_chemdictionary_substance(self):
        import tempfile
        import build_db
        from adapters.unc_demo import UNCDemoAdapter

        with tempfile.TemporaryDirectory() as tmp:
            db_path = Path(tmp) / 'test.sqlite'
            conn = build_db.build(db_path=db_path, adapters=[UNCDemoAdapter(), JCAMPFTIRAdapter()])
            try:
                rows = conn.execute(
                    """SELECT sub.name, sp.technique, sp.role, sp.format_origin
                       FROM spectra sp JOIN substances sub ON sub.substance_id = sp.substance_id
                       WHERE sp.format_origin = 'JCAMP-DX' ORDER BY sub.name"""
                ).fetchall()
                self.assertEqual([r[0] for r in rows], ['caffeine', 'methamphetamine'])
                for _, technique, role, fmt in rows:
                    self.assertEqual((technique, role, fmt), ('FTIR', 'reference', 'JCAMP-DX'))
                (n_substances,) = conn.execute("SELECT count(*) FROM substances").fetchone()
                self.assertEqual(n_substances, 158)
            finally:
                conn.close()


if __name__ == '__main__':
    unittest.main()
