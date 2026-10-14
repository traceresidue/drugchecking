import type { ReactNode } from 'react';
import { DesignNotes } from './DesignNotes';
import { VizNav } from './VizNav';

export interface VizLayoutProps {
  vizId: string;
  title: string;
  dek: string;
  how: ReactNode;
  provenance: string;
  harm?: string;
  children: ReactNode;
}

export function VizLayout({ vizId, title, dek, how, provenance, harm, children }: VizLayoutProps) {
  return (
    <article>
      <VizNav vizId={vizId} />
      <header className="viz-header">
        <h1>{title}</h1>
        <p className="viz-dek">{dek}</p>
      </header>
      <main className="viz-stage">{children}</main>
      <DesignNotes vizId={vizId} />
      <details className="viz-how">
        <summary>How to read this</summary>
        <div className="viz-how-body">{how}</div>
      </details>
      <footer className="viz-footer">
        <p className="prov">{provenance}</p>
        {harm && <p className="harm">{harm}</p>}
      </footer>
    </article>
  );
}
