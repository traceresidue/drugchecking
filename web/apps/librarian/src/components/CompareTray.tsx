import type { SpectrumListItem } from '../lib/types';
import { cosineSimilarity } from '../lib/cosine';
import { SpectrumChart, colorForIndex } from './SpectrumChart';

export const MAX_PINNED = 6;

export interface CompareTrayProps {
  pinned: SpectrumListItem[];
  onUnpin: (spectrumId: number) => void;
  onClear: () => void;
}

function labelFor(sp: SpectrumListItem): string {
  const who = sp.substanceName ?? sp.sample_id ?? `#${sp.spectrum_id}`;
  return `${who} (${sp.technique})`;
}

export function CompareTray({ pinned, onUnpin, onClear }: CompareTrayProps) {
  if (pinned.length === 0) {
    return <p className="viewer-empty">Pin up to {MAX_PINNED} spectra from the viewer to compare them here.</p>;
  }

  const series = pinned.map((sp, i) => ({
    id: String(sp.spectrum_id),
    label: labelFor(sp),
    peaks: sp.peaks,
    technique: sp.technique,
    color: colorForIndex(i),
  }));

  return (
    <div>
      <div className="tray-list">
        {pinned.map((sp) => (
          <div key={sp.spectrum_id} className="tray-item">
            <span>{labelFor(sp)}</span>
            <button type="button" className="small" onClick={() => onUnpin(sp.spectrum_id)} aria-label={`Unpin spectrum ${sp.spectrum_id}`}>
              ✕
            </button>
          </div>
        ))}
      </div>
      <div className="action-row">
        <button type="button" className="small" onClick={onClear}>
          Clear tray
        </button>
      </div>

      <SpectrumChart series={series} mode={pinned.length === 2 ? 'mirror' : 'overlay'} height={pinned.length === 2 ? 260 : 220} />

      {pinned.length >= 2 && (
        <>
          <h2>Cosine similarity</h2>
          <table className="similarity-table">
            <thead>
              <tr>
                <th />
                {pinned.map((sp) => (
                  <th key={sp.spectrum_id} className="mono">
                    #{sp.spectrum_id}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pinned.map((a) => (
                <tr key={a.spectrum_id}>
                  <th className="mono">#{a.spectrum_id}</th>
                  {pinned.map((b) => (
                    <td key={b.spectrum_id} className="mono">
                      {a.spectrum_id === b.spectrum_id ? '—' : cosineSimilarity(a.peaks, b.peaks).toFixed(2)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
