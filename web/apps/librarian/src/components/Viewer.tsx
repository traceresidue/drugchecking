import type { SampleDetail, SpectrumListItem } from '../lib/types';
import { formatDateForDisplay } from '../lib/dates';
import { SpectrumChart, colorForIndex } from './SpectrumChart';

export interface ViewerProps {
  detail: SampleDetail | null;
  spectrumOnly: SpectrumListItem | null;
  onJumpToSample: (sampleId: string) => void;
  onPinSpectrum: (spectrumId: number) => void;
  isPinned: (spectrumId: number) => boolean;
  isSampleSelected: (sampleId: string) => boolean;
  onToggleSampleSelected: (sampleId: string) => void;
  isSpectrumSelected: (spectrumId: number) => boolean;
  onToggleSpectrumSelected: (spectrumId: number) => void;
}

const GITHUB_SPECTRA_BASE = 'https://github.com/opioiddatalab/drugchecking/blob/main/spectra';
const STREETSAFE_BASE = 'https://streetsafe.supply/results/p';

function ProvenancePanel({
  sourceName,
  license,
  fetchedAt,
  formatOrigin,
  sampleId,
}: {
  sourceName: string | null;
  license: string | null;
  fetchedAt: string | null;
  formatOrigin: string | null;
  sampleId: string | null;
}) {
  return (
    <div className="detail-card provenance">
      <h2 style={{ marginTop: 0 }}>Provenance</h2>
      <dl className="kv">
        <dt>Source</dt>
        <dd>{sourceName ?? 'unknown'}</dd>
        <dt>License</dt>
        <dd>{license ?? 'unspecified'}</dd>
        <dt>Fetched</dt>
        <dd className="mono">{fetchedAt ? fetchedAt.slice(0, 19).replace('T', ' ') : '—'}</dd>
        <dt>Format</dt>
        <dd>{formatOrigin ?? '—'}</dd>
      </dl>
      {sampleId && (
        <div style={{ marginTop: 6 }}>
          <a href={`${GITHUB_SPECTRA_BASE}/${encodeURIComponent(sampleId)}.PNG`} target="_blank" rel="noreferrer">
            Chromatogram image (spectra/{sampleId}.PNG) ↗
          </a>
          <a href={`${STREETSAFE_BASE}/${encodeURIComponent(sampleId)}`} target="_blank" rel="noreferrer">
            streetsafe.supply record ↗
          </a>
        </div>
      )}
    </div>
  );
}

/** D3 hook (out of scope for this build): the primary visualization app will
 * learn to read `dcf-library@1` payloads and offer a direct "open in
 * visualization" deep link. Wiring that up is ROADMAP.md Track D, phase D3 --
 * this button is a documented placeholder, intentionally disabled. */
function OpenInVisualizationHook() {
  return (
    <div className="hook-note">
      "Open in visualization →" (ROADMAP Track D, phase D3) is not built yet -- export a library below and hand it
      to the framework manually in the meantime.
      <div className="action-row">
        <button type="button" disabled>
          Open in visualization →
        </button>
      </div>
    </div>
  );
}

export function Viewer(props: ViewerProps) {
  const {
    detail,
    spectrumOnly,
    onJumpToSample,
    onPinSpectrum,
    isPinned,
    isSampleSelected,
    onToggleSampleSelected,
    isSpectrumSelected,
    onToggleSpectrumSelected,
  } = props;

  if (!detail && !spectrumOnly) {
    return <p className="viewer-empty">Select a sample or spectrum from the index to view its details.</p>;
  }

  if (detail) {
    const { sample, detections, spectra, source } = detail;
    return (
      <div>
        <div className="detail-card">
          <h2 style={{ marginTop: 0 }}>Sample {sample.sample_id}</h2>
          <dl className="kv">
            <dt>Program</dt>
            <dd>{sample.program ?? '—'}</dd>
            <dt>State</dt>
            <dd>{sample.state ?? '—'}</dd>
            <dt>County FIPS</dt>
            <dd className="mono">{sample.county_fips ?? '—'}</dd>
            <dt>Collected</dt>
            <dd className="mono">{formatDateForDisplay(sample.date_collected)}</dd>
            <dt>Expected</dt>
            <dd>{sample.expected ?? '—'}</dd>
            <dt>Color</dt>
            <dd>{sample.color ?? '—'}</dd>
            <dt>Texture</dt>
            <dd>{sample.texture ?? '—'}</dd>
            {sample.notes && (
              <>
                <dt>Notes</dt>
                <dd>{sample.notes}</dd>
              </>
            )}
          </dl>
          <div className="action-row">
            <button type="button" onClick={() => onToggleSampleSelected(sample.sample_id)}>
              {isSampleSelected(sample.sample_id) ? '✓ In library selection' : '+ Add to library selection'}
            </button>
          </div>
        </div>

        <h2>Detections ({detections.length})</h2>
        <div className="detail-card">
          {detections.length === 0 ? (
            <p className="viewer-empty">No detections recorded.</p>
          ) : (
            <ul className="detections-list">
              {detections.map((d) => (
                <li key={d.detection_id}>
                  <span>{d.substanceName}</span>
                  <span className="mono">{d.method ?? '—'}</span>
                  <span className="mono">{d.abundance != null ? d.abundance.toFixed(2) : d.confidence ?? '—'}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <h2>Spectra ({spectra.length})</h2>
        <div className="detail-card">
          {spectra.length === 0 ? (
            <p className="viewer-empty">
              No machine-readable spectrum stored for this sample yet -- see ROADMAP.md Track B (mzML ingestion,
              phase B3). The chromatogram PNG below may still be available.
            </p>
          ) : (
            spectra.map((sp, i) => (
              <div key={sp.spectrum_id} style={{ marginBottom: 12 }}>
                <SpectrumChart
                  series={[{ id: String(sp.spectrum_id), label: `${sp.technique} #${sp.spectrum_id}`, peaks: sp.peaks, technique: sp.technique, color: colorForIndex(i) }]}
                />
                <div className="action-row">
                  <button type="button" className="small" onClick={() => onPinSpectrum(sp.spectrum_id)} disabled={isPinned(sp.spectrum_id)}>
                    {isPinned(sp.spectrum_id) ? '✓ Pinned' : 'Pin to compare tray'}
                  </button>
                  <button type="button" className="small" onClick={() => onToggleSpectrumSelected(sp.spectrum_id)}>
                    {isSpectrumSelected(sp.spectrum_id) ? '✓ In library selection' : '+ Add spectrum to selection'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <ProvenancePanel
          sourceName={source?.name ?? null}
          license={source?.license ?? null}
          fetchedAt={source?.fetched_at ?? null}
          formatOrigin={spectra[0]?.format_origin ?? null}
          sampleId={sample.sample_id}
        />
        <OpenInVisualizationHook />
      </div>
    );
  }

  // spectrumOnly branch (a reference spectrum, or a sample spectrum reached
  // directly from the Spectra tab).
  const sp = spectrumOnly!;
  return (
    <div>
      <div className="detail-card">
        <h2 style={{ marginTop: 0 }}>
          Spectrum #{sp.spectrum_id} <span className="chip">{sp.technique}</span> <span className="chip">{sp.role}</span>
        </h2>
        <dl className="kv">
          <dt>Substance</dt>
          <dd>{sp.substanceName ?? '—'}</dd>
          <dt>Format</dt>
          <dd>{sp.format_origin ?? '—'}</dd>
          {sp.sample_id && (
            <>
              <dt>Sample</dt>
              <dd>
                <button type="button" className="small" onClick={() => onJumpToSample(sp.sample_id!)}>
                  {sp.sample_id} ({sp.sampleExpected ?? 'expected: unknown'}) →
                </button>
              </dd>
            </>
          )}
        </dl>
        <div className="action-row">
          <button type="button" onClick={() => onPinSpectrum(sp.spectrum_id)} disabled={isPinned(sp.spectrum_id)}>
            {isPinned(sp.spectrum_id) ? '✓ Pinned' : 'Pin to compare tray'}
          </button>
          <button type="button" onClick={() => onToggleSpectrumSelected(sp.spectrum_id)}>
            {isSpectrumSelected(sp.spectrum_id) ? '✓ In library selection' : '+ Add to library selection'}
          </button>
        </div>
      </div>

      <div className="detail-card">
        <SpectrumChart series={[{ id: String(sp.spectrum_id), label: `${sp.technique} #${sp.spectrum_id}`, peaks: sp.peaks, technique: sp.technique, color: colorForIndex(0) }]} />
      </div>

      {Object.keys(sp.meta).length > 0 && (
        <div className="detail-card">
          <h2 style={{ marginTop: 0 }}>Metadata</h2>
          <pre className="mono" style={{ margin: 0, whiteSpace: 'pre-wrap', fontSize: 11 }}>
            {JSON.stringify(sp.meta, null, 2)}
          </pre>
        </div>
      )}

      <OpenInVisualizationHook />
    </div>
  );
}
