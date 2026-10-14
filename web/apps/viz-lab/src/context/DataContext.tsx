import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Database } from 'sql.js';
import { tryLoadDefaultDatabase } from '../db/loadDatabase';
import {
  loadAggregates,
  loadSpectraJson,
  loadSubstances,
  queryReferenceSpectra,
  referenceSpectraByName,
  type AggregatesData,
  type ReferenceSpectrum,
  type SpectraData,
  type SubstanceRow,
} from '../db/queries';

interface DataContextValue {
  loading: boolean;
  db: Database | null;
  aggregates: AggregatesData | null;
  spectra: SpectraData | null;
  substances: Map<number, SubstanceRow>;
  referenceMs: ReferenceSpectrum[];
  refsByName: Map<string, ReferenceSpectrum[]>;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [db, setDb] = useState<Database | null>(null);
  const [aggregates, setAggregates] = useState<AggregatesData | null>(null);
  const [spectra, setSpectra] = useState<SpectraData | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([tryLoadDefaultDatabase(), loadAggregates(), loadSpectraJson()])
      .then(([loadedDb, agg, spec]) => {
        if (cancelled) return;
        setDb(loadedDb);
        setAggregates(agg);
        setSpectra(spec);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const substances = useMemo(() => (db ? loadSubstances(db) : new Map()), [db]);
  const referenceMs = useMemo(
    () => (db ? queryReferenceSpectra(db, substances, 'MS') : []),
    [db, substances],
  );
  const refsByName = useMemo(() => referenceSpectraByName(referenceMs), [referenceMs]);

  const value = useMemo<DataContextValue>(
    () => ({ loading, db, aggregates, spectra, substances, referenceMs, refsByName }),
    [loading, db, aggregates, spectra, substances, referenceMs, refsByName],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
