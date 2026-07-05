// Mirrors pipeline/schema.sql (read that file for the authoritative shape).
// All JSON text columns (substances.classes, spectra.peaks, spectra.meta) are
// parsed into these richer TS types by src/db/queries.ts -- callers never see
// raw JSON strings from the database.

export interface SourceRow {
  source_id: string;
  name: string;
  url: string | null;
  license: string | null;
  terms: string | null;
  fetched_at: string;
}

export interface SubstanceRow {
  substance_id: number;
  name: string;
  pronunciation: string | null;
  pubchem_cid: string | null;
  cas: string | null;
  unii: string | null;
  common_role: string | null;
  classes: string[];
}

export interface SampleRow {
  sample_id: string;
  source_id: string;
  external_id: string | null;
  program: string | null;
  state: string | null;
  county_fips: string | null;
  date_collected: string | null;
  expected: string | null;
  color: string | null;
  texture: string | null;
  notes: string | null;
}

export interface DetectionRow {
  detection_id: number;
  sample_id: string;
  substance_id: number;
  method: string | null;
  abundance: number | null;
  rt: number | null;
  confidence: string | null;
}

export type Technique = 'GCMS' | 'MS' | 'FTIR';
export type SpectrumRole = 'sample' | 'reference';

export interface SpectrumRow {
  spectrum_id: number;
  sample_id: string | null;
  substance_id: number | null;
  technique: string;
  role: string;
  format_origin: string | null;
  peaks: Array<[number, number]>;
  meta: Record<string, unknown>;
  hasRaw: boolean;
}

export interface DetectionWithSubstance extends DetectionRow {
  substanceName: string;
  classes: string[];
}

export interface SampleListItem extends SampleRow {
  detections: DetectionWithSubstance[];
}

export interface SpectrumListItem extends SpectrumRow {
  substanceName: string | null;
  sampleExpected: string | null;
}

export interface SampleDetail {
  sample: SampleRow;
  detections: DetectionWithSubstance[];
  spectra: SpectrumListItem[];
  source: SourceRow | null;
}

// -- Filters (Index facets: ROADMAP.md Track D, "Index") --
export interface SampleFilters {
  q: string;
  technique: Technique[];
  substanceId: number | null;
  classes: string[];
  program: string | null;
  state: string | null;
  dateFrom: string | null; // yyyy-mm-dd, from <input type="date">
  dateTo: string | null;
}

export interface SpectrumFilters {
  q: string;
  technique: Technique[];
  role: SpectrumRole | null;
  substanceId: number | null;
  classes: string[];
}

// -- Library hand-off contract v1 (ROADMAP.md "Library hand-off contract (v1)") --
export interface LibraryExportSampleEntry {
  sample_id: string;
  detections: Array<{
    substance: string;
    method: string | null;
    abundance: number | null;
    confidence: string | null;
  }>;
  spectra: string[];
}
export interface LibraryExportReferenceEntry {
  substance: string;
  spectrum_id: string;
  source: string;
}
export interface LibraryExportSpectrumEntry {
  spectrum_id: string;
  technique: string;
  peaks: Array<[number, number]>;
  meta: Record<string, unknown>;
}
export interface LibraryExportV1 {
  schema: 'dcf-library@1';
  name: string;
  created: string;
  samples: LibraryExportSampleEntry[];
  references: LibraryExportReferenceEntry[];
  spectra: LibraryExportSpectrumEntry[];
}

// -- Local overlay (saved libraries) -- see src/lib/overlay.ts for why
// localStorage was chosen. Never written back into the loaded SQLite DB.
export interface OverlayLibrary {
  id: string;
  name: string;
  createdAt: string; // ISO-8601
  sampleIds: string[];
  spectrumIds: number[];
}
