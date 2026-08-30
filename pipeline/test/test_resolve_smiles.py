"""pipeline/resolve_smiles.py: CID extraction from chemdictionary.csv, and
resolve_all()'s caching / rate-limiting / failure-handling -- all against a
mocked HTTP layer (`fetch`) and a mocked `sleep`, so this suite makes zero
real network calls and takes ~0s regardless of the configured rate limit."""
import csv
import sys
import tempfile
import unittest
from pathlib import Path
from urllib.error import URLError

_PIPELINE_DIR = str(Path(__file__).resolve().parent.parent)
if _PIPELINE_DIR not in sys.path:
    sys.path.insert(0, _PIPELINE_DIR)

import resolve_smiles


def _write_csv(path: Path, rows: list[dict]) -> None:
    fieldnames = ['substance', 'PubChemCID']
    with open(path, 'w', encoding='utf-8', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


class TestDistinctCids(unittest.TestCase):
    def test_distinct_non_blank_first_seen_order(self):
        with tempfile.TemporaryDirectory() as tmp:
            csv_path = Path(tmp) / 'chemdictionary.csv'
            _write_csv(csv_path, [
                {'substance': 'Fentanyl', 'PubChemCID': '3345'},
                {'substance': 'Xylazine', 'PubChemCID': '5707'},
                {'substance': 'Fentanyl analog', 'PubChemCID': '3345'},  # dup CID
                {'substance': 'No CID here', 'PubChemCID': ''},
                {'substance': 'Whitespace CID', 'PubChemCID': '  9999  '},
            ])
            cids = resolve_smiles.distinct_cids(csv_path)
        self.assertEqual(cids, ['3345', '5707', '9999'])

    def test_real_chemdictionary_csv_has_many_distinct_cids(self):
        # Sanity check against the real, checked-in CSV this script targets
        # in production -- not a fixture -- so a change to that file's
        # column name (PubChemCID) or shape would surface here too.
        cids = resolve_smiles.distinct_cids()
        self.assertGreater(len(cids), 100)
        self.assertTrue(all(cid.strip() == cid and cid for cid in cids))


class FakeSleep:
    """Records every requested delay instead of actually sleeping."""

    def __init__(self):
        self.calls: list[float] = []

    def __call__(self, seconds: float) -> None:
        self.calls.append(seconds)


class TestResolveAll(unittest.TestCase):
    def setUp(self):
        self._tmpdir = tempfile.TemporaryDirectory()
        self.cache_dir = Path(self._tmpdir.name)
        self.addCleanup(self._tmpdir.cleanup)

    def test_fetches_and_caches_each_cid(self):
        fetch_calls = []

        def fake_fetch(cid):
            fetch_calls.append(cid)
            return f'C{cid}SMILES'

        sleep = FakeSleep()
        results, failures = resolve_smiles.resolve_all(
            ['111', '222'], cache_dir=self.cache_dir, rate_limit_s=1.0,
            fetch=fake_fetch, sleep=sleep, log=lambda msg: None,
        )

        self.assertEqual(results, {'111': 'C111SMILES', '222': 'C222SMILES'})
        self.assertEqual(failures, [])
        self.assertEqual(fetch_calls, ['111', '222'])
        # One rate-limit sleep per network call actually made.
        self.assertEqual(sleep.calls, [1.0, 1.0])
        # Raw response cached to disk under the CID's own filename.
        self.assertEqual((self.cache_dir / '111.txt').read_text().strip(), 'C111SMILES')
        self.assertEqual((self.cache_dir / '222.txt').read_text().strip(), 'C222SMILES')

    def test_already_cached_cid_skips_network_and_sleep(self):
        (self.cache_dir).mkdir(parents=True, exist_ok=True)
        (self.cache_dir / '111.txt').write_text('CachedSMILES\n')

        def fail_if_called(cid):
            raise AssertionError(f'fetch() should not be called for cached CID {cid}')

        sleep = FakeSleep()
        results, failures = resolve_smiles.resolve_all(
            ['111'], cache_dir=self.cache_dir, rate_limit_s=1.0,
            fetch=fail_if_called, sleep=sleep, log=lambda msg: None,
        )

        self.assertEqual(results, {'111': 'CachedSMILES'})
        self.assertEqual(failures, [])
        self.assertEqual(sleep.calls, [])  # no network call made, so no rate-limit wait either

    def test_force_refetches_even_when_cached(self):
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        (self.cache_dir / '111.txt').write_text('StaleSMILES\n')

        results, failures = resolve_smiles.resolve_all(
            ['111'], cache_dir=self.cache_dir, rate_limit_s=0,
            fetch=lambda cid: 'FreshSMILES', sleep=lambda s: None, force=True,
            log=lambda msg: None,
        )

        self.assertEqual(results, {'111': 'FreshSMILES'})
        self.assertEqual(failures, [])
        self.assertEqual((self.cache_dir / '111.txt').read_text().strip(), 'FreshSMILES')

    def test_failed_cid_is_logged_and_does_not_stop_the_run(self):
        def flaky_fetch(cid):
            if cid == 'bad':
                raise URLError('simulated network failure')
            return f'good-{cid}'

        logged = []
        results, failures = resolve_smiles.resolve_all(
            ['bad', 'good1'], cache_dir=self.cache_dir, rate_limit_s=0,
            fetch=flaky_fetch, sleep=lambda s: None, log=logged.append,
        )

        self.assertEqual(results, {'good1': 'good-good1'})
        self.assertEqual(failures, ['bad'])
        self.assertFalse((self.cache_dir / 'bad.txt').exists())
        self.assertTrue(any('bad' in msg for msg in logged))

    def test_empty_response_is_treated_as_failure(self):
        results, failures = resolve_smiles.resolve_all(
            ['111'], cache_dir=self.cache_dir, rate_limit_s=0,
            fetch=lambda cid: (_ for _ in ()).throw(ValueError('empty response body for CID 111')),
            sleep=lambda s: None, log=lambda msg: None,
        )

        self.assertEqual(results, {})
        self.assertEqual(failures, ['111'])

    def test_empty_cid_list_is_a_noop(self):
        results, failures = resolve_smiles.resolve_all(
            [], cache_dir=self.cache_dir, fetch=lambda cid: 'unused', sleep=lambda s: None,
        )
        self.assertEqual(results, {})
        self.assertEqual(failures, [])
        # cache dir is still created even with nothing to resolve.
        self.assertTrue(self.cache_dir.is_dir())


if __name__ == '__main__':
    unittest.main()
