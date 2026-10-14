import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getVizEntry, VIZ_REGISTRY } from '../registry';

interface VizNavProps {
  vizId: string;
}

export function VizNav({ vizId }: VizNavProps) {
  const navigate = useNavigate();
  const index = VIZ_REGISTRY.findIndex((e) => e.id === vizId);
  const cur = index >= 0 ? index : 0;
  const prev = VIZ_REGISTRY[(cur - 1 + VIZ_REGISTRY.length) % VIZ_REGISTRY.length]!;
  const next = VIZ_REGISTRY[(cur + 1) % VIZ_REGISTRY.length]!;
  const current = getVizEntry(vizId);

  const options = useMemo(
    () =>
      VIZ_REGISTRY.map((entry) => ({
        id: entry.id,
        label: entry.title,
      })),
    [],
  );

  return (
    <nav className="viz-nav" aria-label="Visualization navigation">
      <Link to="/" className="viz-nav-home">
        All visualizations
      </Link>
      <button
        type="button"
        className="viz-nav-btn"
        aria-label={`Previous: ${prev.title}`}
        onClick={() => navigate(`/viz/${prev.id}`)}
      >
        ←
      </button>
      <select
        className="viz-nav-select"
        aria-label="Jump to visualization"
        value={vizId}
        onChange={(e) => navigate(`/viz/${e.target.value}`)}
      >
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="viz-nav-btn"
        aria-label={`Next: ${next.title}`}
        onClick={() => navigate(`/viz/${next.id}`)}
      >
        →
      </button>
      <span className="viz-nav-pos mono">
        {cur + 1} / {VIZ_REGISTRY.length}
      </span>
      {current && (
        <span className="viz-nav-cat muted">{current.cat}</span>
      )}
    </nav>
  );
}
