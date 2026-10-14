import { useEffect, useMemo, useRef } from 'react';
import { VizLayout } from '../../components/VizLayout';
import { useData } from '../../context/DataContext';
import { cssVar } from '../../lib/cssVars';
import { getVizEntry } from '../../registry';

const entry = getVizEntry('16-supply-terrain-3d')!;

const MONTH_LABELS = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function Terrain3dPage() {
  const { aggregates } = useData();
  const plotRef = useRef<HTMLDivElement>(null);

  const { months, subs, z, tickvals, ticktext } = useMemo(() => {
    const monthly = aggregates?.monthly ?? [];
    const mos = [...new Set(monthly.map((d) => d.month))].sort();
    const subTotals: Record<string, number> = {};
    monthly.forEach((d) => {
      subTotals[d.substance] = (subTotals[d.substance] ?? 0) + d.n;
    });
    const subList = Object.keys(subTotals)
      .sort((a, b) => subTotals[b]! - subTotals[a]!)
      .slice(0, 14)
      .reverse();
    const Z = subList.map((s) => {
      const m = Object.fromEntries(monthly.filter((d) => d.substance === s).map((d) => [d.month, d.n]));
      return mos.map((mo) => m[mo] ?? 0);
    });
    const tvals = mos.map((_, i) => i).filter((_, i) => i % 4 === 0);
    const ttext = mos
      .filter((_, i) => i % 4 === 0)
      .map((m) => {
        const [y, mo] = m.split('-');
        return `${MONTH_LABELS[+mo!] ?? mo} '${y!.slice(2)}`;
      });
    return { months: mos, subs: subList, z: Z, tickvals: tvals, ticktext: ttext };
  }, [aggregates]);

  useEffect(() => {
    const el = plotRef.current;
    if (!el || !months.length) return;

    let cancelled = false;
    import('plotly.js-dist-min').then((mod) => {
      if (cancelled) return;
      const Plotly = mod.default;
      const bg = cssVar('--bg') || '#0b0e14';
      const line = cssVar('--line') || '#26304a';
      const muted = cssVar('--muted') || '#8b94a8';
      const colorscale: Array<[number, string]> = [
        [0, cssVar('--bg') || '#0b0e14'],
        [0.1, '#2a1a3a'],
        [0.3, '#7a3a5a'],
        [0.6, cssVar('--c-fent') || '#ff5c7a'],
        [0.85, cssVar('--c-opioid') || '#ff8a5c'],
        [1, cssVar('--c-stim') || '#ffd166'],
      ];
      const layout = {
        paper_bgcolor: 'rgba(0,0,0,0)',
        scene: {
          xaxis: {
            title: 'month →',
            color: muted,
            gridcolor: line,
            backgroundcolor: bg,
            showbackground: true,
            tickvals,
            ticktext,
          },
          yaxis: {
            title: '',
            color: muted,
            gridcolor: line,
            backgroundcolor: bg,
            showbackground: true,
            tickfont: { size: 9 },
          },
          zaxis: {
            title: 'samples / month',
            color: muted,
            gridcolor: line,
            backgroundcolor: bg,
            showbackground: true,
          },
          camera: { eye: { x: 1.9, y: -1.4, z: 0.8 } },
          aspectratio: { x: 1.6, y: 1.1, z: 0.6 },
        },
        margin: { l: 0, r: 0, t: 0, b: 0 },
      };
      Plotly.newPlot(
        el,
        [
          {
            type: 'surface',
            x: months.map((_, i) => i),
            y: subs,
            z,
            colorscale,
            showscale: false,
            contours: { z: { show: true, usecolormap: true, width: 1, project: { z: false } } },
          },
        ],
        layout,
        { responsive: true, displayModeBar: false },
      );
    });

    const onResize = () => {
      import('plotly.js-dist-min').then((mod) => {
        if (plotRef.current) mod.default.Plots.resize(plotRef.current);
      });
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelled = true;
      window.removeEventListener('resize', onResize);
      import('plotly.js-dist-min').then((mod) => {
        if (plotRef.current) mod.default.purge(plotRef.current);
      });
    };
  }, [months, subs, z, tickvals, ticktext]);

  return (
    <VizLayout
      vizId="16-supply-terrain-3d"
      title={entry.title}
      dek={entry.dek}
      how={
        <>
          This is a 3D surface: one axis is <b>time</b>, another is <b>substance</b>, and height is{' '}
          <b>monthly detection count</b>. Persistent drugs form long mountain ridges; a substance that surges appears as
          a <b>rising peak</b>, and one that fades sinks back to the plain. Terrain makes the relative scale of the
          fentanyl massif against everything else immediately physical. <b>Drag</b> to orbit, scroll to zoom.{' '}
          <b>Denominator caution:</b> height is counts among tested samples — a measure of what programs caught, not
          total use.
        </>
      }
      provenance="Real monthly detection counts per substance, 2022–2024, 6,580-sample dataset."
      harm="The tallest ridge is fentanyl, and it dwarfs the rest. Treat any opioid-supply sample as fentanyl until tested otherwise."
    >
      <div className="viz-panel">
        <div ref={plotRef} style={{ height: 580 }} />
      </div>
    </VizLayout>
  );
}
