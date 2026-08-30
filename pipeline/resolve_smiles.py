#!/usr/bin/env python3
"""One-time PubChem CID -> SMILES resolver (ROADMAP.md: viz #34/#35/#36).

chemdictionary/chemdictionary.csv carries a PubChemCID per substance but no
SMILES string, which the planned scaffold-sunburst (#34), substructure-search
(#35), and similarity-matrix (#36) visualizations need (via RDKit.js) to draw
or compare structures. This script resolves every distinct PubChemCID in that
CSV to a canonical SMILES string via PubChem's public, unauthenticated
PUG-REST API and caches each raw response as its own file under
pipeline/cache/smiles/ -- one request per *distinct* CID (~150 for the
current chemdictionary), at a conservative ~1 req/sec, safe to re-run (a CID
already cached is skipped unless --force is passed).

This script does NOT touch the database -- build_db.py's UNCDemoAdapter reads
whatever pipeline/cache/smiles/ already holds (see adapters/unc_demo.py) and
leaves `substances.smiles` NULL for any CID with no cache entry, so a
never-run or partially-run resolver degrades gracefully rather than blocking
a build.

Endpoint shape (confirmed against PubChem's PUG-REST docs -- no auth, no key):
  https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/<CID>/property/CanonicalSMILES/TXT
returns the bare SMILES string as `text/plain`, one line, no JSON wrapper.

Run as:  python3 pipeline/resolve_smiles.py [--force] [--rate SECONDS]
(from the repo root; zero third-party dependencies -- urllib/csv only).

Network note: this needs outbound HTTPS to pubchem.ncbi.nlm.nih.gov, which
some sandboxes (including the one this script was authored in) block by
policy -- run it somewhere with real internet access. See
pipeline/test/test_resolve_smiles.py for coverage of the caching/rate-limit/
failure-handling logic with the HTTP layer mocked out.
"""
from __future__ import annotations

import argparse
import csv
import sys
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
CHEMDICT_CSV = ROOT / 'chemdictionary' / 'chemdictionary.csv'
CACHE_DIR = ROOT / 'pipeline' / 'cache' / 'smiles'

PUG_URL_TEMPLATE = (
    'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{cid}/property/CanonicalSMILES/TXT'
)
USER_AGENT = 'drugchecking-pipeline/1.0 (+https://github.com/opioiddatalab/drugchecking)'
DEFAULT_RATE_LIMIT_S = 1.0
DEFAULT_TIMEOUT_S = 10.0


def distinct_cids(csv_path: Path = CHEMDICT_CSV) -> list[str]:
    """Distinct, non-blank PubChemCID values from chemdictionary.csv, in
    first-seen order (order doesn't matter for correctness, but makes runs
    reproducible/diffable)."""
    cids: list[str] = []
    seen: set[str] = set()
    with open(csv_path, encoding='utf-8-sig', newline='') as f:
        for row in csv.DictReader(f):
            cid = (row.get('PubChemCID') or '').strip()
            if cid and cid not in seen:
                seen.add(cid)
                cids.append(cid)
    return cids


def cache_path(cid: str, cache_dir: Path = CACHE_DIR) -> Path:
    return cache_dir / f'{cid}.txt'


def fetch_smiles(cid: str, timeout: float = DEFAULT_TIMEOUT_S) -> str:
    """Call PUG-REST for one CID and return the raw response body (stripped).
    Raises (HTTPError/URLError/ValueError) on any failure -- callers decide
    whether to log-and-continue."""
    url = PUG_URL_TEMPLATE.format(cid=cid)
    req = Request(url, headers={'User-Agent': USER_AGENT})
    with urlopen(req, timeout=timeout) as resp:
        body = resp.read().decode('utf-8').strip()
    if not body:
        raise ValueError(f'empty response body for CID {cid}')
    return body


def resolve_all(
    cids: list[str],
    cache_dir: Path = CACHE_DIR,
    rate_limit_s: float = DEFAULT_RATE_LIMIT_S,
    force: bool = False,
    fetch=fetch_smiles,
    sleep=time.sleep,
    log=lambda msg: print(msg, file=sys.stderr),
) -> tuple[dict[str, str], list[str]]:
    """Resolve every CID in `cids`, writing pipeline/cache/smiles/<cid>.txt
    for each success. Returns (cid -> smiles for every resolved CID,
    including ones already cached; list of CIDs that failed this run).

    A CID already cached is skipped (no network call, no sleep) unless
    `force` is set, so re-running after adding new substances only pays the
    rate limit for the CIDs that are actually new. `fetch`/`sleep`/`log` are
    injectable so tests can run this against a fake HTTP layer with no real
    delay and no real network."""
    cache_dir.mkdir(parents=True, exist_ok=True)
    results: dict[str, str] = {}
    failures: list[str] = []
    for cid in cids:
        path = cache_path(cid, cache_dir)
        if path.exists() and not force:
            cached = path.read_text(encoding='utf-8').strip()
            if cached:
                results[cid] = cached
                continue
        try:
            smiles = fetch(cid)
        except (HTTPError, URLError, ValueError, TimeoutError) as e:
            log(f'warning: could not resolve PubChem CID {cid} to SMILES: {e}')
            failures.append(cid)
        else:
            path.write_text(smiles + '\n', encoding='utf-8')
            results[cid] = smiles
        finally:
            # Rate-limit every network call this run makes, success or
            # failure alike -- PubChem's own guidance is <=5 req/sec, and a
            # one-time ~150-CID backfill has no need to push anywhere near
            # that, so this defaults to a conservative ~1 req/sec.
            sleep(rate_limit_s)
    return results, failures


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('--force', action='store_true',
                         help='re-fetch every CID even if already cached')
    parser.add_argument('--rate', type=float, default=DEFAULT_RATE_LIMIT_S,
                         help=f'seconds to sleep between requests (default {DEFAULT_RATE_LIMIT_S})')
    args = parser.parse_args()

    cids = distinct_cids()
    print(f'{len(cids)} distinct PubChemCID value(s) in {CHEMDICT_CSV.relative_to(ROOT)}')
    results, failures = resolve_all(cids, rate_limit_s=args.rate, force=args.force)
    print(f'resolved {len(results)}/{len(cids)} CID(s) to SMILES '
          f'({len(failures)} failed, cache at {CACHE_DIR.relative_to(ROOT)}/)')
    if failures:
        print('unresolved CIDs (left NULL in substances.smiles): ' + ', '.join(failures))


if __name__ == '__main__':
    main()
