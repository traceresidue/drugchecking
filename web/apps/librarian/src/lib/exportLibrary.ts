import type { Database } from 'sql.js';
import { getSampleDetail, getSpectrumById } from '../db/queries';
import type { LibraryExportV1, OverlayLibrary, SubstanceRow } from './types';

/**
 * Builds the ROADMAP.md "Library hand-off contract (v1)" JSON from a saved
 * overlay library, re-reading live from the loaded (read-only) SQLite DB so
 * the export always reflects current data rather than a stale snapshot taken
 * at save time.
 */
export function buildLibraryExport(
  db: Database,
  substances: Map<number, SubstanceRow>,
  library: OverlayLibrary,
): LibraryExportV1 {
  const samples: LibraryExportV1['samples'] = [];
  const references: LibraryExportV1['references'] = [];
  const spectraOut: LibraryExportV1['spectra'] = [];
  const seenSpectrumIds = new Set<number>();

  for (const sampleId of library.sampleIds) {
    const detail = getSampleDetail(db, substances, sampleId);
    if (!detail) continue;
    samples.push({
      sample_id: detail.sample.sample_id,
      detections: detail.detections.map((d) => ({
        substance: d.substanceName,
        method: d.method,
        abundance: d.abundance,
        confidence: d.confidence,
      })),
      spectra: detail.spectra.map((s) => String(s.spectrum_id)),
    });
    for (const s of detail.spectra) {
      if (seenSpectrumIds.has(s.spectrum_id)) continue;
      seenSpectrumIds.add(s.spectrum_id);
      spectraOut.push({ spectrum_id: String(s.spectrum_id), technique: s.technique, peaks: s.peaks, meta: s.meta });
    }
  }

  for (const spectrumId of library.spectrumIds) {
    const spec = getSpectrumById(db, substances, spectrumId);
    if (!spec) continue;

    if (!seenSpectrumIds.has(spec.spectrum_id)) {
      seenSpectrumIds.add(spec.spectrum_id);
      spectraOut.push({
        spectrum_id: String(spec.spectrum_id),
        technique: spec.technique,
        peaks: spec.peaks,
        meta: spec.meta,
      });
    }

    if (spec.role === 'reference') {
      // Reference spectra aren't linked to a `sources` row in the v1 schema;
      // provenance is expected to live in spectra.meta once the B1 reference
      // adapters (SWGDRUG MSP, NIST WebBook JCAMP-DX) land. We try common
      // keys and fall back gracefully so this doesn't crash on today's
      // (currently empty) spectra table or on adapters that use a different
      // key name.
      const metaSource = spec.meta['source'] ?? spec.meta['library'] ?? spec.meta['source_name'];
      const source = typeof metaSource === 'string' && metaSource ? metaSource : (spec.format_origin ?? 'unknown');
      references.push({
        substance: spec.substanceName ?? 'unknown',
        spectrum_id: String(spec.spectrum_id),
        source,
      });
    }
  }

  return {
    schema: 'dcf-library@1',
    name: library.name,
    created: library.createdAt,
    samples,
    references,
    spectra: spectraOut,
  };
}
