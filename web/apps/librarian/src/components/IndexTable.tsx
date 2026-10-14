import { useEffect, useState } from 'react';
import type { SampleListItem, SpectrumListItem } from '../lib/types';
import { formatDateForDisplay } from '../lib/dates';

const PAGE_SIZE = 50;

export interface IndexTableProps {
  view: 'samples' | 'spectra';
  samples: SampleListItem[];
  spectra: SpectrumListItem[];
  activeSampleId: string | null;
  activeSpectrumId: number | null;
  onSelectSample: (id: string) => void;
  onSelectSpectrum: (id: number) => void;
  selectedSampleIds: Set<string>;
  selectedSpectrumIds: Set<number>;
  onToggleSampleSelected: (id: string) => void;
  onToggleSpectrumSelected: (id: number) => void;
}

export function IndexTable({
  view,
  samples,
  spectra,
  activeSampleId,
  activeSpectrumId,
  onSelectSample,
  onSelectSpectrum,
  selectedSampleIds,
  selectedSpectrumIds,
  onToggleSampleSelected,
  onToggleSpectrumSelected,
}: IndexTableProps) {
  const [page, setPage] = useState(0);

  // Reset to page 0 whenever the filtered result set changes (new array
  // instance from a filter change) or the view is switched.
  useEffect(() => {
    setPage(0);
  }, [samples, spectra, view]);

  const total = view === 'samples' ? samples.length : spectra.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = page * PAGE_SIZE;
  const pageSamples = samples.slice(start, start + PAGE_SIZE);
  const pageSpectra = spectra.slice(start, start + PAGE_SIZE);

  return (
    <div>
      <div className="result-count">
        {total} {view === 'samples' ? 'sample' : 'spectrum'}
        {total === 1 ? '' : 's'} matched
      </div>

      {view === 'samples' ? (
        <table className="index-table">
          <thead>
            <tr>
              <th aria-label="Select" />
              <th>Sample</th>
              <th>Date</th>
              <th>Program</th>
              <th>State</th>
              <th>Expected</th>
              <th>Detections</th>
            </tr>
          </thead>
          <tbody>
            {pageSamples.map((s) => (
              <tr
                key={s.sample_id}
                className={s.sample_id === activeSampleId ? 'active' : ''}
                onClick={() => onSelectSample(s.sample_id)}
              >
                <td onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    aria-label={`Select sample ${s.sample_id}`}
                    checked={selectedSampleIds.has(s.sample_id)}
                    onChange={() => onToggleSampleSelected(s.sample_id)}
                  />
                </td>
                <td className="mono">{s.sample_id}</td>
                <td className="mono">{formatDateForDisplay(s.date_collected)}</td>
                <td>{s.program ?? '—'}</td>
                <td>{s.state ?? '—'}</td>
                <td>{s.expected ?? '—'}</td>
                <td>
                  {s.detections.length === 0 && <span className="viewer-empty">none</span>}
                  {s.detections.slice(0, 4).map((d) => (
                    <span key={d.detection_id} className="chip" title={d.confidence ?? undefined}>
                      {d.substanceName}
                    </span>
                  ))}
                  {s.detections.length > 4 && <span className="chip">+{s.detections.length - 4}</span>}
                </td>
              </tr>
            ))}
            {pageSamples.length === 0 && (
              <tr>
                <td colSpan={7} className="viewer-empty">
                  No samples match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      ) : (
        <table className="index-table">
          <thead>
            <tr>
              <th aria-label="Select" />
              <th>Spectrum</th>
              <th>Technique</th>
              <th>Role</th>
              <th>Substance</th>
              <th>Sample</th>
              <th>Format</th>
            </tr>
          </thead>
          <tbody>
            {pageSpectra.map((sp) => (
              <tr
                key={sp.spectrum_id}
                className={sp.spectrum_id === activeSpectrumId ? 'active' : ''}
                onClick={() => onSelectSpectrum(sp.spectrum_id)}
              >
                <td onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    aria-label={`Select spectrum ${sp.spectrum_id}`}
                    checked={selectedSpectrumIds.has(sp.spectrum_id)}
                    onChange={() => onToggleSpectrumSelected(sp.spectrum_id)}
                  />
                </td>
                <td className="mono">{sp.spectrum_id}</td>
                <td>{sp.technique}</td>
                <td>{sp.role}</td>
                <td>{sp.substanceName ?? '—'}</td>
                <td className="mono">{sp.sample_id ?? '—'}</td>
                <td>{sp.format_origin ?? '—'}</td>
              </tr>
            ))}
            {pageSpectra.length === 0 && (
              <tr>
                <td colSpan={7} className="viewer-empty">
                  No spectra match the current filters (the reference-spectra ingestion adapters from ROADMAP.md
                  Track B, phase B1, may not have run yet).
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}

      {pageCount > 1 && (
        <div className="pager">
          <button type="button" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            ← Prev
          </button>
          <span>
            Page {page + 1} of {pageCount}
          </span>
          <button type="button" disabled={page >= pageCount - 1} onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}>
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
