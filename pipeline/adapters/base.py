"""Adapter contract for pipeline ingestion sources (ROADMAP.md Track B).

Each adapter represents exactly one `sources` row and knows how to (1) fetch
its raw files -- from a local cache directory or from bundled fixtures --
and (2) parse those files into plain-dict rows shaped like the tables in
`schema.sql`. Adapters never open a sqlite connection themselves: build_db.py
owns the connection and does all the INSERT/upsert work, which keeps every
adapter trivially unit-testable (call fetch()/parse() and inspect the
returned dicts -- no database required).

Row shapes (all keys optional unless noted; build_db.py fills in anything an
adapter leaves out, e.g. `source_id`):

  substances: {name*, pronunciation, pubchem_cid, cas, unii, common_role,
               classes: list[str]}
  samples:    {sample_id*, external_id, program, state, county_fips,
               date_collected, expected, color, texture, notes}
  detections: {sample_id*, substance: str | substance_id: int, method,
               abundance, rt, confidence}
  spectra:    {sample_id, substance: str | substance_id: int, technique*,
               role*, format_origin, peaks: list[[x, y]], meta: dict,
               raw: bytes}

(* = required for that row to be meaningful.) `substance` as a bare name
string is resolved case-insensitively against `substances.name` by
build_db.py's get_or_create_substance(), the same pattern the original B0
loader used to link lab_detail.csv rows to chemdictionary substances.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


@dataclass
class ParsedBatch:
    """Plain-dict rows an adapter hands back to build_db.py for loading.

    Every list defaults to empty so an adapter that only produces, say,
    reference spectra (no samples/detections) doesn't need to touch the
    other fields.
    """

    substances: list[dict[str, Any]] = field(default_factory=list)
    samples: list[dict[str, Any]] = field(default_factory=list)
    detections: list[dict[str, Any]] = field(default_factory=list)
    spectra: list[dict[str, Any]] = field(default_factory=list)


class BaseAdapter(ABC):
    """Base class every pipeline adapter implements.

    Class attributes map 1:1 onto a `sources` row (source_id/name/url/
    license/terms); build_db.py reads them to seed `sources` before loading
    whatever the adapter's parse() returns. Subclasses must set at least
    `source_id` and `name`.
    """

    source_id: str
    name: str
    url: str | None = None
    license: str | None = None
    terms: str | None = None

    def source_row(self, fetched_at: str) -> dict[str, Any]:
        """The dict build_db.py inserts into `sources` for this adapter."""
        return dict(
            source_id=self.source_id,
            name=self.name,
            url=self.url,
            license=self.license,
            terms=self.terms,
            fetched_at=fetched_at,
        )

    @abstractmethod
    def fetch(self, cache_dir: Path) -> list[Path]:
        """Return local paths to this source's raw files.

        Implementations may download into `cache_dir` and return the cached
        paths, or -- for local/bundled sources -- simply return paths to
        files already checked into the repo. Either way the return value is
        a list of `Path`s ready for parse().
        """
        raise NotImplementedError

    @abstractmethod
    def parse(self, raw_paths: list[Path]) -> ParsedBatch:
        """Parse raw files (as returned by fetch()) into a ParsedBatch."""
        raise NotImplementedError
