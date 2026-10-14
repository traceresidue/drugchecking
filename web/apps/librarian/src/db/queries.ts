import type { Database } from 'sql.js';
import type {
  DetectionRow,
  DetectionWithSubstance,
  SampleDetail,
  SampleFilters,
  SampleListItem,
  SampleRow,
  SourceRow,
  SpectrumFilters,
  SpectrumListItem,
  SubstanceRow,
  Technique,
} from '../lib/types';
import { parseCardDate } from '../lib/dates';

/** Runs a parameterized query and returns every row as a plain object. Small
 * helper over sql.js's prepare/bind/step/getAsObject/free dance. */
function execAll<T>(db: Database, sql: string, params: unknown[] = []): T[] {
  const stmt = db.prepare(sql);
  try {
    if (params.length) stmt.bind(params as never);
    const out: T[] = [];
    while (stmt.step()) {
      out.push(stmt.getAsObject() as T);
    }
    return out;
  } finally {
    stmt.free();
  }
}

function parseJsonArray(raw: unknown): string[] {
  if (typeof raw !== 'string' || !raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function parsePeaks(raw: unknown): Array<[number, number]> {
  if (typeof raw !== 'string' || !raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((p): p is [number, number] => Array.isArray(p) && p.length >= 2)
      .map((p) => [Number(p[0]), Number(p[1])] as [number, number]);
  } catch {
    return [];
  }
}

function parseJsonObject(raw: unknown): Record<string, unknown> {
  if (typeof raw !== 'string' || !raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

// ---- reference data (small tables, cached in memory by the caller) --------

export function loadSubstances(db: Database): Map<number, SubstanceRow> {
  const rows = execAll<{
    substance_id: number;
    name: string;
    pronunciation: string | null;
    pubchem_cid: string | null;
    cas: string | null;
    unii: string | null;
    common_role: string | null;
    classes: string | null;
  }>(
    db,
    `SELECT substance_id, name, pronunciation, pubchem_cid, cas, unii, common_role, classes FROM substances`,
  );
  const map = new Map<number, SubstanceRow>();
  for (const r of rows) {
    map.set(r.substance_id, { ...r, classes: parseJsonArray(r.classes) });
  }
  return map;
}

export function listAllClasses(substances: Map<number, SubstanceRow>): string[] {
  const set = new Set<string>();
  for (const s of substances.values()) for (const c of s.classes) set.add(c);
  return [...set].sort();
}

export function listSources(db: Database): SourceRow[] {
  return execAll<SourceRow>(db, `SELECT * FROM sources ORDER BY name`);
}

export function listDistinctPrograms(db: Database): string[] {
  return execAll<{ program: string }>(
    db,
    `SELECT DISTINCT program FROM samples WHERE program IS NOT NULL AND program <> '' ORDER BY program`,
  ).map((r) => r.program);
}

export function listDistinctStates(db: Database): string[] {
  return execAll<{ state: string }>(
    db,
    `SELECT DISTINCT state FROM samples WHERE state IS NOT NULL AND state <> '' ORDER BY state`,
  ).map((r) => r.state);
}

// ---- FTS search -------------------------------------------------------------

/** Wraps the query as an FTS5 phrase so punctuation/quotes in free text can't
 * break MATCH syntax. */
function ftsPhraseQuery(q: string): string {
  return `"${q.replace(/"/g, '""')}"`;
}

export function searchSamplesFts(db: Database, q: string): Set<string> {
  try {
    const rows = execAll<{ sample_id: string }>(
      db,
      `SELECT sample_id FROM samples_fts WHERE samples_fts MATCH ?`,
      [ftsPhraseQuery(q)],
    );
    return new Set(rows.map((r) => r.sample_id));
  } catch {
    return new Set();
  }
}

export function searchSubstancesFts(db: Database, q: string): Set<number> {
  try {
    const rows = execAll<{ substance_id: number }>(
      db,
      `SELECT substance_id FROM substances_fts WHERE substances_fts MATCH ?`,
      [ftsPhraseQuery(q)],
    );
    return new Set(rows.map((r) => r.substance_id));
  } catch {
    return new Set();
  }
}

/**
 * IMPORTANT: the officially published `sql.js` wasm binary (dist/sql-wasm.wasm,
 * as of 1.14.x) is built WITHOUT the FTS5 module -- `MATCH` queries against
 * samples_fts/substances_fts throw "no such module: fts5" at runtime, even
 * though the CPython `sqlite3` module used by pipeline/build_db.py has FTS5
 * and happily creates/populates those virtual tables. searchSamplesFts and
 * searchSubstancesFts already catch that and degrade to an empty result set
 * (see their try/catch above) so nothing crashes -- but that would make
 * substance-name search silently stop working. This substring-based fallback
 * keeps substance search functional regardless of the sql.js build in use; if
 * a future sql.js build (or an FTS5-enabled fork) is adopted, this just
 * becomes a redundant OR alongside the real FTS5 match. See README.md "Known
 * gaps" for more.
 */
export function substanceIdsMatchingText(substances: Map<number, SubstanceRow>, q: string): Set<number> {
  const needle = q.toLowerCase();
  const out = new Set<number>();
  for (const s of substances.values()) {
    if (s.name.toLowerCase().includes(needle)) out.add(s.substance_id);
  }
  return out;
}

/** samples_fts only indexes `notes`, which is sparse in practice -- fall back
 * to a plain substring scan over the other visible free-text fields so search
 * stays useful even when notes are empty (or when FTS5 isn't available at
 * all -- see substanceIdsMatchingText above). */
function matchesFreeTextFallback(s: SampleRow, q: string): boolean {
  const needle = q.toLowerCase();
  return [s.expected, s.program, s.external_id, s.sample_id, s.color, s.texture, s.notes].some((v) =>
    (v ?? '').toLowerCase().includes(needle),
  );
}

// ---- samples ----------------------------------------------------------------

const EMPTY_SAMPLE_FILTERS: SampleFilters = {
  q: '',
  technique: [],
  substanceId: null,
  classes: [],
  program: null,
  state: null,
  dateFrom: null,
  dateTo: null,
};

export function defaultSampleFilters(): SampleFilters {
  return { ...EMPTY_SAMPLE_FILTERS, technique: [], classes: [] };
}

/**
 * The dataset is capped at "a few thousand rows" (ROADMAP.md), so this loads
 * all samples + all detections in two queries and does filtering/joining in
 * JS. That sidesteps two awkward things about doing it all in SQL: (a)
 * substances.classes is a JSON array column, and sql.js's SQLite build may or
 * may not have JSON1 compiled in, so class-membership filtering is safer done
 * against the already-parsed in-memory substances map; (b) date_collected is
 * "DDMonYYYY", not sortable/comparable as SQL text (see lib/dates.ts).
 */
export function querySamples(
  db: Database,
  substances: Map<number, SubstanceRow>,
  filters: SampleFilters,
): SampleListItem[] {
  const sampleRows = execAll<SampleRow>(db, `SELECT * FROM samples ORDER BY date_collected DESC`);
  const detectionRows = execAll<DetectionRow>(db, `SELECT * FROM detections`);

  const detectionsBySample = new Map<string, DetectionWithSubstance[]>();
  for (const d of detectionRows) {
    const sub = substances.get(d.substance_id);
    const enriched: DetectionWithSubstance = {
      ...d,
      substanceName: sub?.name ?? `substance #${d.substance_id}`,
      classes: sub?.classes ?? [],
    };
    const arr = detectionsBySample.get(d.sample_id);
    if (arr) arr.push(enriched);
    else detectionsBySample.set(d.sample_id, [enriched]);
  }

  const q = filters.q.trim();
  const ftsSampleIds = q ? searchSamplesFts(db, q) : null;
  const ftsSubstanceIds = q ? searchSubstancesFts(db, q) : null;
  const substringSubstanceIds = q ? substanceIdsMatchingText(substances, q) : null;

  const wantClasses = filters.classes.length ? new Set(filters.classes) : null;
  const dateFrom = filters.dateFrom ? new Date(filters.dateFrom) : null;
  const dateTo = filters.dateTo ? new Date(filters.dateTo) : null;

  const items: SampleListItem[] = [];
  for (const s of sampleRows) {
    if (filters.program && s.program !== filters.program) continue;
    if (filters.state && s.state !== filters.state) continue;

    if (dateFrom || dateTo) {
      const d = parseCardDate(s.date_collected);
      if (!d) continue;
      if (dateFrom && d < dateFrom) continue;
      if (dateTo && d > dateTo) continue;
    }

    const detections = detectionsBySample.get(s.sample_id) ?? [];

    if (filters.substanceId != null && !detections.some((d) => d.substance_id === filters.substanceId)) continue;
    if (wantClasses && !detections.some((d) => d.classes.some((c) => wantClasses.has(c)))) continue;
    if (
      filters.technique.length &&
      !detections.some((d) => d.method && filters.technique.includes(d.method as Technique))
    )
      continue;

    if (q) {
      const matchesSample = ftsSampleIds?.has(s.sample_id) ?? false;
      const matchesSubstance = detections.some(
        (d) => (ftsSubstanceIds?.has(d.substance_id) ?? false) || (substringSubstanceIds?.has(d.substance_id) ?? false),
      );
      const matchesFreeText = matchesFreeTextFallback(s, q);
      if (!matchesSample && !matchesSubstance && !matchesFreeText) continue;
    }

    items.push({ ...s, detections });
  }
  return items;
}

// ---- spectra ------------------------------------------------------------

const EMPTY_SPECTRUM_FILTERS: SpectrumFilters = {
  q: '',
  technique: [],
  role: null,
  substanceId: null,
  classes: [],
};

export function defaultSpectrumFilters(): SpectrumFilters {
  return { ...EMPTY_SPECTRUM_FILTERS, technique: [], classes: [] };
}

interface RawSpectrumRow {
  spectrum_id: number;
  sample_id: string | null;
  substance_id: number | null;
  technique: string;
  role: string;
  format_origin: string | null;
  peaks: string | null;
  meta: string | null;
  raw: Uint8Array | null;
}

function enrichSpectrumRow(
  r: RawSpectrumRow,
  substances: Map<number, SubstanceRow>,
  sampleExpectedById: Map<string, string | null>,
): SpectrumListItem {
  const sub = r.substance_id != null ? substances.get(r.substance_id) : undefined;
  return {
    spectrum_id: r.spectrum_id,
    sample_id: r.sample_id,
    substance_id: r.substance_id,
    technique: r.technique,
    role: r.role,
    format_origin: r.format_origin,
    peaks: parsePeaks(r.peaks),
    meta: parseJsonObject(r.meta),
    hasRaw: r.raw != null,
    substanceName: sub?.name ?? null,
    sampleExpected: r.sample_id ? (sampleExpectedById.get(r.sample_id) ?? null) : null,
  };
}

export function querySpectra(
  db: Database,
  substances: Map<number, SubstanceRow>,
  filters: SpectrumFilters,
): SpectrumListItem[] {
  const rows = execAll<RawSpectrumRow>(
    db,
    `SELECT spectrum_id, sample_id, substance_id, technique, role, format_origin, peaks, meta, raw FROM spectra`,
  );

  const sampleExpectedById = new Map<string, string | null>();
  if (rows.some((r) => r.sample_id)) {
    const sampRows = execAll<{ sample_id: string; expected: string | null }>(
      db,
      `SELECT sample_id, expected FROM samples`,
    );
    for (const sr of sampRows) sampleExpectedById.set(sr.sample_id, sr.expected);
  }

  const wantClasses = filters.classes.length ? new Set(filters.classes) : null;
  const q = filters.q.trim();
  const ftsMatchedSubstanceIds = q ? searchSubstancesFts(db, q) : null;
  const substringMatchedSubstanceIds = q ? substanceIdsMatchingText(substances, q) : null;

  const out: SpectrumListItem[] = [];
  for (const r of rows) {
    if (filters.role && r.role !== filters.role) continue;
    if (filters.technique.length && !filters.technique.includes(r.technique as Technique)) continue;
    if (filters.substanceId != null && r.substance_id !== filters.substanceId) continue;

    const sub = r.substance_id != null ? substances.get(r.substance_id) : undefined;
    if (wantClasses && !(sub && sub.classes.some((c) => wantClasses.has(c)))) continue;

    if (q) {
      const nameMatch = sub
        ? (ftsMatchedSubstanceIds?.has(sub.substance_id) ?? false) || (substringMatchedSubstanceIds?.has(sub.substance_id) ?? false)
        : false;
      const textMatch = (r.format_origin ?? '').toLowerCase().includes(q.toLowerCase());
      if (!nameMatch && !textMatch) continue;
    }

    out.push(enrichSpectrumRow(r, substances, sampleExpectedById));
  }
  return out;
}

export function getSpectrumById(
  db: Database,
  substances: Map<number, SubstanceRow>,
  spectrumId: number,
): SpectrumListItem | null {
  const rows = execAll<RawSpectrumRow>(
    db,
    `SELECT spectrum_id, sample_id, substance_id, technique, role, format_origin, peaks, meta, raw FROM spectra WHERE spectrum_id = ?`,
    [spectrumId],
  );
  const r = rows[0];
  if (!r) return null;
  const sampleExpectedById = new Map<string, string | null>();
  if (r.sample_id) {
    const [s] = execAll<{ expected: string | null }>(db, `SELECT expected FROM samples WHERE sample_id = ?`, [
      r.sample_id,
    ]);
    sampleExpectedById.set(r.sample_id, s?.expected ?? null);
  }
  return enrichSpectrumRow(r, substances, sampleExpectedById);
}

// ---- sample detail (Viewer) ------------------------------------------------

export function getSampleDetail(
  db: Database,
  substances: Map<number, SubstanceRow>,
  sampleId: string,
): SampleDetail | null {
  const [sample] = execAll<SampleRow>(db, `SELECT * FROM samples WHERE sample_id = ?`, [sampleId]);
  if (!sample) return null;

  const detectionRows = execAll<DetectionRow>(db, `SELECT * FROM detections WHERE sample_id = ?`, [sampleId]);
  const detections: DetectionWithSubstance[] = detectionRows.map((d) => {
    const sub = substances.get(d.substance_id);
    return { ...d, substanceName: sub?.name ?? `substance #${d.substance_id}`, classes: sub?.classes ?? [] };
  });

  const spectraRows = execAll<RawSpectrumRow>(
    db,
    `SELECT spectrum_id, sample_id, substance_id, technique, role, format_origin, peaks, meta, raw FROM spectra WHERE sample_id = ?`,
    [sampleId],
  );
  const sampleExpectedById = new Map<string, string | null>([[sampleId, sample.expected]]);
  const spectra = spectraRows.map((r) => enrichSpectrumRow(r, substances, sampleExpectedById));

  const [source] = execAll<SourceRow>(db, `SELECT * FROM sources WHERE source_id = ?`, [sample.source_id]);

  return { sample, detections, spectra, source: source ?? null };
}
