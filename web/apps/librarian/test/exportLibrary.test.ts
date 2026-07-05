import { beforeAll, describe, expect, it } from 'vitest';
import type { Database } from 'sql.js';
import { makeTestDb } from './fixtures/makeTestDb';
import { loadSubstances, querySpectra, defaultSpectrumFilters } from '../src/db/queries';
import { buildLibraryExport } from '../src/lib/exportLibrary';

describe('lib/exportLibrary buildLibraryExport', () => {
  let db: Database;

  beforeAll(async () => {
    db = await makeTestDb();
  });

  it('matches the dcf-library@1 hand-off contract shape', () => {
    const substances = loadSubstances(db);
    const references = querySpectra(db, substances, { ...defaultSpectrumFilters(), role: 'reference' });
    const swgdrugRef = references.find((r) => r.meta.source === 'SWGDRUG')!;

    const payload = buildLibraryExport(db, substances, {
      id: 'lib-1',
      name: 'Test export',
      createdAt: '2026-01-01T00:00:00.000Z',
      sampleIds: ['S1'],
      spectrumIds: [swgdrugRef.spectrum_id],
    });

    expect(payload.schema).toBe('dcf-library@1');
    expect(payload.name).toBe('Test export');
    expect(payload.created).toBe('2026-01-01T00:00:00.000Z');

    expect(payload.samples).toHaveLength(1);
    expect(payload.samples[0]!.sample_id).toBe('S1');
    expect(payload.samples[0]!.detections.map((d) => d.substance).sort()).toEqual(['Fentanyl', 'Xylazine']);
    expect(payload.samples[0]!.spectra).toEqual(expect.arrayContaining([String(payload.spectra[0]!.spectrum_id ?? '')]));

    // The pinned reference spectrum should surface in both `references` (with
    // provenance pulled from spectra.meta) and the flat `spectra` array.
    expect(payload.references).toHaveLength(1);
    expect(payload.references[0]).toEqual({
      substance: 'Fentanyl',
      spectrum_id: String(swgdrugRef.spectrum_id),
      source: 'SWGDRUG',
    });

    const spectrumIds = payload.spectra.map((s) => s.spectrum_id);
    expect(new Set(spectrumIds).size).toBe(spectrumIds.length); // no duplicates
    expect(spectrumIds).toContain(String(swgdrugRef.spectrum_id));
  });

  it('skips sample/spectrum ids that no longer exist in the DB, rather than throwing', () => {
    const substances = loadSubstances(db);
    const payload = buildLibraryExport(db, substances, {
      id: 'lib-2',
      name: 'Stale',
      createdAt: '2026-01-01T00:00:00.000Z',
      sampleIds: ['S1', 'ghost-sample'],
      spectrumIds: [999999],
    });
    expect(payload.samples).toHaveLength(1);
    expect(payload.spectra.some((s) => s.spectrum_id === String(999999))).toBe(false);
  });
});
