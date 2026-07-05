import { beforeAll, describe, expect, it } from 'vitest';
import type { Database } from 'sql.js';
import { makeTestDb } from './fixtures/makeTestDb';
import {
  defaultSampleFilters,
  defaultSpectrumFilters,
  getSampleDetail,
  getSpectrumById,
  listAllClasses,
  listDistinctPrograms,
  listDistinctStates,
  loadSubstances,
  querySamples,
  querySpectra,
} from '../src/db/queries';

describe('db/queries', () => {
  let db: Database;

  beforeAll(async () => {
    db = await makeTestDb();
  });

  it('loads substances with parsed classes and lists distinct facets', () => {
    const substances = loadSubstances(db);
    expect(substances.size).toBe(3);
    expect(substances.get(1)?.classes).toEqual(['fentanyl_impurities', 'opiates_opioids']);
    expect(listAllClasses(substances).sort()).toEqual(['common_cuts', 'fentanyl_impurities', 'meth_impurities', 'opiates_opioids']);
    expect(listDistinctPrograms(db)).toEqual(['ProgramA', 'ProgramB']);
    expect(listDistinctStates(db)).toEqual(['NC', 'NY']);
  });

  it('filters samples by substance, class, and date range', () => {
    const substances = loadSubstances(db);

    const byFentanyl = querySamples(db, substances, { ...defaultSampleFilters(), substanceId: 1 });
    expect(byFentanyl.map((s) => s.sample_id)).toEqual(['S1']);

    const byClass = querySamples(db, substances, { ...defaultSampleFilters(), classes: ['meth_impurities'] });
    expect(byClass.map((s) => s.sample_id)).toEqual(['S2']);

    // date_collected is "DDMonYYYY" (e.g. "20Oct2022"); confirm range filtering
    // parses it rather than doing a naive string compare.
    const dateFiltered = querySamples(db, substances, {
      ...defaultSampleFilters(),
      dateFrom: '2022-09-01',
      dateTo: '2022-12-31',
    });
    expect(dateFiltered.map((s) => s.sample_id)).toEqual(['S1']);
  });

  it('search hits samples_fts (notes) and substances_fts (via detections), plus free-text fallback', () => {
    const substances = loadSubstances(db);

    const byNote = querySamples(db, substances, { ...defaultSampleFilters(), q: 'smell' });
    expect(byNote.map((s) => s.sample_id)).toEqual(['S1']);

    const bySubstanceName = querySamples(db, substances, { ...defaultSampleFilters(), q: 'Methamphetamine' });
    expect(bySubstanceName.map((s) => s.sample_id)).toEqual(['S2']);

    const byExpectedFallback = querySamples(db, substances, { ...defaultSampleFilters(), q: 'heroin' });
    expect(byExpectedFallback.map((s) => s.sample_id)).toEqual(['S1']);
  });

  it('filters spectra by role/technique and enriches with substance + sample info', () => {
    const substances = loadSubstances(db);

    const references = querySpectra(db, substances, { ...defaultSpectrumFilters(), role: 'reference' });
    expect(references).toHaveLength(2);
    expect(references.every((r) => r.role === 'reference')).toBe(true);

    const ftir = querySpectra(db, substances, { ...defaultSpectrumFilters(), technique: ['FTIR'] });
    expect(ftir).toHaveLength(1);
    expect(ftir[0]?.substanceName).toBe('Methamphetamine');

    const sampleSpectra = querySpectra(db, substances, { ...defaultSpectrumFilters(), role: 'sample' });
    expect(sampleSpectra).toHaveLength(1);
    expect(sampleSpectra[0]?.sample_id).toBe('S1');
    expect(sampleSpectra[0]?.peaks).toEqual([[1, 2], [2, 10], [3, 4]]);
  });

  it('getSampleDetail joins detections, spectra, and source for one sample', () => {
    const substances = loadSubstances(db);
    const detail = getSampleDetail(db, substances, 'S1');
    expect(detail).not.toBeNull();
    expect(detail!.sample.sample_id).toBe('S1');
    expect(detail!.detections.map((d) => d.substanceName).sort()).toEqual(['Fentanyl', 'Xylazine']);
    expect(detail!.spectra).toHaveLength(1);
    expect(detail!.source?.name).toBe('Test Source');

    expect(getSampleDetail(db, substances, 'does-not-exist')).toBeNull();
  });

  it('getSpectrumById returns a single enriched reference spectrum', () => {
    const substances = loadSubstances(db);
    const all = querySpectra(db, substances, { ...defaultSpectrumFilters(), technique: ['MS'] });
    const id = all[0]!.spectrum_id;
    const spec = getSpectrumById(db, substances, id);
    expect(spec?.substanceName).toBe('Fentanyl');
    expect(spec?.meta).toEqual({ source: 'SWGDRUG' });
  });
});
