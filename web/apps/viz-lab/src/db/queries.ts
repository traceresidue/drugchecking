import type { Database } from 'sql.js';

function execAll<T>(db: Database, sql: string, params: unknown[] = []): T[] {
  const stmt = db.prepare(sql);
  try {
    if (params.length) stmt.bind(params as never);
    const out: T[] = [];
    while (stmt.step()) out.push(stmt.getAsObject() as T);
    return out;
  } finally {
    stmt.free();
  }
}

function parsePeaks(raw: unknown): Array<[number, number]> {
  if (typeof raw !== 'string' || !raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((p): p is [number, number] => Array.isArray(p) && p.length >= 2)
      .map((p) => [Number(p[0]), Number(p[1])]);
  } catch {
    return [];
  }
}

export interface ReferenceSpectrum {
  spectrumId: number;
  substanceId: number;
  substanceName: string;
  technique: string;
  peaks: Array<[number, number]>;
  formatOrigin: string | null;
  meta: Record<string, unknown>;
}

export interface SubstanceRow {
  substanceId: number;
  name: string;
  cas: string | null;
  classes: string[];
}

export function loadSubstances(db: Database): Map<number, SubstanceRow> {
  const rows = execAll<{
    substance_id: number;
    name: string;
    cas: string | null;
    classes: string | null;
  }>(db, `SELECT substance_id, name, cas, classes FROM substances`);
  const map = new Map<number, SubstanceRow>();
  for (const r of rows) {
    let classes: string[] = [];
    try {
      const parsed = JSON.parse(r.classes ?? '[]') as unknown;
      classes = Array.isArray(parsed) ? parsed.filter((c): c is string => typeof c === 'string') : [];
    } catch {
      classes = [];
    }
    map.set(r.substance_id, {
      substanceId: r.substance_id,
      name: r.name,
      cas: r.cas,
      classes,
    });
  }
  return map;
}

export function queryReferenceSpectra(
  db: Database,
  substances: Map<number, SubstanceRow>,
  technique = 'MS',
): ReferenceSpectrum[] {
  const rows = execAll<{
    spectrum_id: number;
    substance_id: number | null;
    technique: string;
    peaks: string | null;
    format_origin: string | null;
    meta: string | null;
  }>(
    db,
    `SELECT spectrum_id, substance_id, technique, peaks, format_origin, meta
     FROM spectra WHERE role = 'reference' AND technique = ? AND peaks IS NOT NULL`,
    [technique],
  );

  return rows
    .filter((r) => r.substance_id != null && r.peaks)
    .map((r) => {
      const sub = substances.get(r.substance_id!);
      let meta: Record<string, unknown> = {};
      try {
        meta = JSON.parse(r.meta ?? '{}') as Record<string, unknown>;
      } catch {
        meta = {};
      }
      return {
        spectrumId: r.spectrum_id,
        substanceId: r.substance_id!,
        substanceName: sub?.name ?? `substance #${r.substance_id}`,
        technique: r.technique,
        peaks: parsePeaks(r.peaks),
        formatOrigin: r.format_origin,
        meta,
      };
    })
    .filter((r) => r.peaks.length > 0);
}

export function referenceSpectraByName(refs: ReferenceSpectrum[]): Map<string, ReferenceSpectrum[]> {
  const map = new Map<string, ReferenceSpectrum[]>();
  for (const r of refs) {
    const key = r.substanceName.toLowerCase();
    const arr = map.get(key) ?? [];
    arr.push(r);
    map.set(key, arr);
  }
  return map;
}

export interface AggregatesData {
  monthly_class: Array<{ month: string; cls: string; n: number }>;
  monthly: Array<{ month: string; substance: string; n: number }>;
  monthly_total: Array<{ month: string; n: number }>;
  top_substances: Array<{ substance: string; samples: number; primary: number; trace: number }>;
  cooccurrence: Array<{ a: string; b: string; n: number; directed?: boolean }>;
  expected_detected: Array<{ expected: string; detected: string; n: number }>;
  emergence: Array<{ substance: string; first_month: string; samples: number }>;
  state_counts: Array<{ state: string; n: number; fentanyl_pct?: number; xylazine_pct?: number }>;
  xylazine_status: Array<{ state: string; month: string; status: string }>;
  retention_times: Record<string, number>;
  substances_per_sample: Array<{ n_substances: number; samples: number }>;
  geo?: { states: Array<{ id: string; name: string }> };
  [key: string]: unknown;
}

export interface SpectraData {
  note?: string;
  ms?: Record<string, { mw?: number; smiles?: string; peaks: Array<[number, number]> }>;
  ftir?: Record<string, { peaks: Array<[number, number, number?]> }>;
  chromatograms?: Record<string, { label: string; peaks: Array<[string, number, number]>; real?: boolean }>;
  samples?: Record<string, unknown>;
  references?: Record<string, unknown>;
}

export async function loadAggregates(): Promise<AggregatesData> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/aggregates.json`);
  if (!res.ok) throw new Error('Failed to load aggregates.json');
  return res.json() as Promise<AggregatesData>;
}

export async function loadSpectraJson(): Promise<SpectraData> {
  const res = await fetch(`${import.meta.env.BASE_URL}data/spectra.json`);
  if (!res.ok) throw new Error('Failed to load spectra.json');
  return res.json() as Promise<SpectraData>;
}
