import { useState } from 'react';
import type { OverlayLibrary } from '../lib/types';

export interface LibraryPanelProps {
  selectionCounts: { samples: number; spectra: number };
  libraries: OverlayLibrary[];
  onSave: (name: string) => void;
  onDelete: (id: string) => void;
  onExport: (lib: OverlayLibrary) => void;
  onLoadSelection: (lib: OverlayLibrary) => void;
}

export function LibraryPanel({ selectionCounts, libraries, onSave, onDelete, onExport, onLoadSelection }: LibraryPanelProps) {
  const [name, setName] = useState('');

  const hasSelection = selectionCounts.samples > 0 || selectionCounts.spectra > 0;

  const handleSave = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onSave(trimmed);
    setName('');
  };

  return (
    <div>
      <p className="result-count">
        Current selection: {selectionCounts.samples} sample{selectionCounts.samples === 1 ? '' : 's'},{' '}
        {selectionCounts.spectra} spectrum{selectionCounts.spectra === 1 ? '' : 'a'}
      </p>
      <div className="library-form">
        <input
          type="text"
          placeholder="Name this library…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!hasSelection}
          aria-label="Library name"
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
          }}
        />
        <button type="button" className="primary" onClick={handleSave} disabled={!hasSelection || !name.trim()}>
          Save
        </button>
      </div>

      <h2>Saved libraries ({libraries.length})</h2>
      {libraries.length === 0 ? (
        <p className="viewer-empty">No libraries saved yet. Select samples/spectra, name them, and save.</p>
      ) : (
        <div className="library-list">
          {[...libraries]
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .map((lib) => (
              <div key={lib.id} className="library-card">
                <div className="name">{lib.name}</div>
                <div className="meta">
                  {new Date(lib.createdAt).toLocaleString()} · {lib.sampleIds.length} sample(s) ·{' '}
                  {lib.spectrumIds.length} spectrum(a)
                </div>
                <div className="actions">
                  <button type="button" className="small" onClick={() => onExport(lib)}>
                    Export JSON
                  </button>
                  <button type="button" className="small" onClick={() => onLoadSelection(lib)}>
                    Load into selection
                  </button>
                  <button type="button" className="small" onClick={() => onDelete(lib.id)}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
