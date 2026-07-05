import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Database } from 'sql.js';
import { loadDatabaseFromFile, tryLoadDefaultDatabase } from './db/loadDatabase';
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
} from './db/queries';
import { buildLibraryExport } from './lib/exportLibrary';
import { OverlayStore } from './lib/overlay';
import type { OverlayLibrary, SubstanceRow } from './lib/types';
import { Filters, initialFilterState, type FilterState } from './components/Filters';
import { IndexTable } from './components/IndexTable';
import { Viewer } from './components/Viewer';
import { CompareTray, MAX_PINNED } from './components/CompareTray';
import { LibraryPanel } from './components/LibraryPanel';

function toggleInSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [db, setDb] = useState<Database | null>(null);
  const [dbName, setDbName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterState>(initialFilterState());
  const [activeSampleId, setActiveSampleId] = useState<string | null>(null);
  const [activeSpectrumId, setActiveSpectrumId] = useState<number | null>(null);

  const [selectedSampleIds, setSelectedSampleIds] = useState<Set<string>>(new Set());
  const [selectedSpectrumIds, setSelectedSpectrumIds] = useState<Set<number>>(new Set());
  const [pinnedIds, setPinnedIds] = useState<number[]>([]);

  const overlayStoreRef = useRef<OverlayStore>();
  if (!overlayStoreRef.current) overlayStoreRef.current = new OverlayStore();
  const [libraries, setLibraries] = useState<OverlayLibrary[]>([]);
  const refreshLibraries = useCallback(() => setLibraries(overlayStoreRef.current!.list()), []);

  useEffect(() => {
    refreshLibraries();
    let cancelled = false;
    tryLoadDefaultDatabase()
      .then((loaded) => {
        if (cancelled) return;
        if (loaded) {
          setDb(loaded);
          setDbName('drugchecking.sqlite (auto-loaded)');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshLibraries]);

  const substances = useMemo<Map<number, SubstanceRow>>(() => (db ? loadSubstances(db) : new Map()), [db]);

  const facets = useMemo(() => {
    if (!db) return { programs: [], states: [], classes: [], substances: [] as SubstanceRow[] };
    return {
      programs: listDistinctPrograms(db),
      states: listDistinctStates(db),
      classes: listAllClasses(substances),
      substances: [...substances.values()].sort((a, b) => a.name.localeCompare(b.name)),
    };
  }, [db, substances]);

  const samples = useMemo(() => {
    if (!db) return [];
    return querySamples(db, substances, {
      ...defaultSampleFilters(),
      q: filters.q,
      technique: filters.technique,
      substanceId: filters.substanceId,
      classes: filters.classes,
      program: filters.program,
      state: filters.state,
      dateFrom: filters.dateFrom,
      dateTo: filters.dateTo,
    });
  }, [db, substances, filters]);

  const spectra = useMemo(() => {
    if (!db) return [];
    return querySpectra(db, substances, {
      ...defaultSpectrumFilters(),
      q: filters.q,
      technique: filters.technique,
      role: filters.role,
      substanceId: filters.substanceId,
      classes: filters.classes,
    });
  }, [db, substances, filters]);

  const activeSampleDetail = useMemo(
    () => (db && activeSampleId ? getSampleDetail(db, substances, activeSampleId) : null),
    [db, substances, activeSampleId],
  );
  const activeSpectrumDetail = useMemo(
    () => (db && !activeSampleId && activeSpectrumId != null ? getSpectrumById(db, substances, activeSpectrumId) : null),
    [db, substances, activeSampleId, activeSpectrumId],
  );

  const pinnedSpectra = useMemo(() => {
    if (!db) return [];
    return pinnedIds.map((id) => getSpectrumById(db, substances, id)).filter((s): s is NonNullable<typeof s> => s != null);
  }, [db, substances, pinnedIds]);

  const handleFile = useCallback(async (file: File) => {
    setLoading(true);
    setLoadError(null);
    try {
      const loaded = await loadDatabaseFromFile(file);
      setDb(loaded);
      setDbName(file.name);
      setActiveSampleId(null);
      setActiveSpectrumId(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const onSelectSample = useCallback((id: string) => {
    setActiveSampleId(id);
    setActiveSpectrumId(null);
  }, []);
  const onSelectSpectrum = useCallback((id: number) => {
    setActiveSpectrumId(id);
    setActiveSampleId(null);
  }, []);

  const onPinSpectrum = useCallback((id: number) => {
    setPinnedIds((prev) => (prev.includes(id) || prev.length >= MAX_PINNED ? prev : [...prev, id]));
  }, []);
  const onUnpinSpectrum = useCallback((id: number) => {
    setPinnedIds((prev) => prev.filter((x) => x !== id));
  }, []);

  const onSaveLibrary = useCallback(
    (name: string) => {
      overlayStoreRef.current!.create(name, [...selectedSampleIds], [...selectedSpectrumIds]);
      refreshLibraries();
      setSelectedSampleIds(new Set());
      setSelectedSpectrumIds(new Set());
    },
    [selectedSampleIds, selectedSpectrumIds, refreshLibraries],
  );
  const onDeleteLibrary = useCallback(
    (id: string) => {
      overlayStoreRef.current!.remove(id);
      refreshLibraries();
    },
    [refreshLibraries],
  );
  const onExportLibrary = useCallback(
    (lib: OverlayLibrary) => {
      if (!db) return;
      const payload = buildLibraryExport(db, substances, lib);
      downloadJson(`${lib.name.replace(/\s+/g, '_') || 'library'}.dcf-library.json`, payload);
    },
    [db, substances],
  );
  const onLoadSelection = useCallback((lib: OverlayLibrary) => {
    setSelectedSampleIds(new Set(lib.sampleIds));
    setSelectedSpectrumIds(new Set(lib.spectrumIds));
  }, []);

  if (loading) {
    return (
      <div className="loader-screen">
        <p>Loading Sample Librarian…</p>
      </div>
    );
  }

  if (!db) {
    return (
      <div className="loader-screen">
        <h1>Sample Librarian</h1>
        <p>
          No database is loaded. Run <code>python3 pipeline/build_db.py</code> from the repo root and reload, or open
          a <code>drugchecking.sqlite</code> file directly -- nothing is uploaded anywhere, it's read entirely in
          your browser via sql.js/WASM.
        </p>
        {loadError && <div className="error-banner">{loadError}</div>}
        <input
          type="file"
          accept=".sqlite,.db"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
          aria-label="Open database file"
        />
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>Sample Librarian</h1>
        <span className="subtitle mono">{dbName}</span>
        <span className="spacer" />
        <label className="mono" style={{ fontSize: 12, cursor: 'pointer' }}>
          Open database file…
          <input
            type="file"
            accept=".sqlite,.db"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
        </label>
      </header>
      {loadError && <div className="error-banner">{loadError}</div>}
      <div className="app-body">
        <div className="pane">
          <h2>Filters</h2>
          <Filters value={filters} onChange={setFilters} facets={facets} />
        </div>

        <div className="pane">
          <h2>Index</h2>
          <IndexTable
            view={filters.view}
            samples={samples}
            spectra={spectra}
            activeSampleId={activeSampleId}
            activeSpectrumId={activeSpectrumId}
            onSelectSample={onSelectSample}
            onSelectSpectrum={onSelectSpectrum}
            selectedSampleIds={selectedSampleIds}
            selectedSpectrumIds={selectedSpectrumIds}
            onToggleSampleSelected={(id) => setSelectedSampleIds((prev) => toggleInSet(prev, id))}
            onToggleSpectrumSelected={(id) => setSelectedSpectrumIds((prev) => toggleInSet(prev, id))}
          />

          <h2>Viewer</h2>
          <Viewer
            detail={activeSampleDetail}
            spectrumOnly={activeSpectrumDetail}
            onJumpToSample={onSelectSample}
            onPinSpectrum={onPinSpectrum}
            isPinned={(id) => pinnedIds.includes(id)}
            isSampleSelected={(id) => selectedSampleIds.has(id)}
            onToggleSampleSelected={(id) => setSelectedSampleIds((prev) => toggleInSet(prev, id))}
            isSpectrumSelected={(id) => selectedSpectrumIds.has(id)}
            onToggleSpectrumSelected={(id) => setSelectedSpectrumIds((prev) => toggleInSet(prev, id))}
          />
        </div>

        <div className="pane">
          <h2>Compare tray ({pinnedSpectra.length}/{MAX_PINNED})</h2>
          <CompareTray pinned={pinnedSpectra} onUnpin={onUnpinSpectrum} onClear={() => setPinnedIds([])} />

          <h2>Libraries</h2>
          <LibraryPanel
            selectionCounts={{ samples: selectedSampleIds.size, spectra: selectedSpectrumIds.size }}
            libraries={libraries}
            onSave={onSaveLibrary}
            onDelete={onDeleteLibrary}
            onExport={onExportLibrary}
            onLoadSelection={onLoadSelection}
          />
        </div>
      </div>
    </div>
  );
}
