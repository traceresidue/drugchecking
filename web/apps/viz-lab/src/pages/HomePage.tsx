import { Link } from 'react-router-dom';
import { VIZ_REGISTRY } from '../registry';

export function HomePage() {
  return (
    <div>
      <header className="home-hero">
        <h1>Drug Checking Visualizations</h1>
        <p>
          Twenty curated views from the Design Lab, rebuilt with a unified dark interface and live
          pipeline data. Each page resolves its design critique and links real aggregates plus sqlite
          reference spectra.
        </p>
      </header>
      <div className="home-grid" role="list">
        {VIZ_REGISTRY.map((entry) => (
          <Link key={entry.id} to={`/viz/${entry.id}`} className="home-card" role="listitem">
            <div className="home-card-body">
              <div className="home-card-meta">
                Nº {String(entry.n).padStart(2, '0')} · {entry.cat}
              </div>
              <h2 className="home-card-title">{entry.title}</h2>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
