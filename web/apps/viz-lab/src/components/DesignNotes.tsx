import { getCritique, getResolutions } from '../critiques';

interface DesignNotesProps {
  vizId: string;
}

export function DesignNotes({ vizId }: DesignNotesProps) {
  const critique = getCritique(vizId);
  if (!critique) return null;

  const resolutions = getResolutions(vizId);

  return (
    <aside className="viz-design-notes" aria-labelledby={`design-notes-${vizId}`}>
      <h2 id={`design-notes-${vizId}`}>Design assessment</h2>
      <p className="thesis">{critique.thesis}</p>
      {critique.weaknesses.length > 0 && (
        <>
          <p className="muted" style={{ fontSize: 12, margin: '0 0 8px' }}>
            Original weaknesses and resolutions:
          </p>
          <ul>
            {critique.weaknesses.map((w) => (
              <li key={w}>
                {w}
                {resolutions[w] && <span className="resolved"> — {resolutions[w]}</span>}
              </li>
            ))}
          </ul>
        </>
      )}
      {critique.visualization && (
        <p className="muted" style={{ fontSize: 13, marginTop: 12, marginBottom: 0 }}>
          <strong style={{ color: 'var(--ink)' }}>Layout note:</strong> {critique.visualization}
        </p>
      )}
    </aside>
  );
}
