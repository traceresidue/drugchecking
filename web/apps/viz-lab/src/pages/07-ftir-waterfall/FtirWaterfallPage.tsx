import { useEffect, useRef } from 'react';
import { ftirCurve, type FtirBand } from '@dcf/core';
import { VizLayout } from '../../components/VizLayout';
import { useData } from '../../context/DataContext';
import { ftirWaterfallColorscale, themeColors } from '../../lib/themeVars';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getFtirBands(ftir: Record<string, unknown>, key: string): FtirBand[] {
  const entry = ftir[key];
  if (Array.isArray(entry)) return entry as FtirBand[];
  if (entry && typeof entry === 'object' && Array.isArray((entry as { peaks?: FtirBand[] }).peaks)) {
    return (entry as { peaks: FtirBand[] }).peaks;
  }
  return [];
}

function mix(ftir: Record<string, unknown>, t: number): FtirBand[] {
  const bands: FtirBand[] = [];
  getFtirBands(ftir, 'fentanyl').forEach((b) => bands.push([b[0], b[1] * 1.0, b[2]]));
  getFtirBands(ftir, 'caffeine').forEach((b) => bands.push([b[0], b[1] * 0.5, b[2]]));
  getFtirBands(ftir, 'lactose').forEach((b) => bands.push([b[0], b[1] * (0.8 - 0.6 * t), b[2]]));
  getFtirBands(ftir, 'xylazine').forEach((b) => bands.push([b[0], b[1] * (0.05 + 0.9 * t), b[2]]));
  return bands;
}

export default function FtirWaterfallPage() {
  const { spectra } = useData();
  const ftir = (spectra?.ftir ?? {}) as Record<string, unknown>;
  const plotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = plotRef.current;
    if (!el || !getFtirBands(ftir, 'fentanyl').length) return;

    let cancelled = false;
    const sample = ftirCurve(mix(ftir, 0), { x0: 4000, x1: 400, n: 280 });
    const wn = sample.x;
    const Z = MONTHS.map((_, i) => ftirCurve(mix(ftir, i / 11), { x0: 4000, x1: 400, n: 280 }).y);

    import('plotly.js-dist-min').then((mod) => {
      if (cancelled) return;
      const Plotly = mod.default;
      const t = themeColors();
      const layout = {
        paper_bgcolor: 'rgba(0,0,0,0)',
        scene: {
          xaxis: {
            title: 'wavenumber (cm⁻¹)',
            color: t.muted,
            gridcolor: t.line,
            autorange: 'reversed' as const,
            backgroundcolor: t.bg,
            showbackground: true,
          },
          yaxis: { title: 'month', color: t.muted, gridcolor: t.line, backgroundcolor: t.bg, showbackground: true },
          zaxis: { title: 'absorbance', color: t.muted, gridcolor: t.line, backgroundcolor: t.bg, showbackground: true },
          camera: { eye: { x: -1.7, y: -1.3, z: 0.8 } },
        },
        margin: { l: 0, r: 0, t: 0, b: 0 },
      };

      Plotly.newPlot(
        el,
        [
          {
            type: 'surface',
            x: wn,
            y: MONTHS,
            z: Z,
            colorscale: ftirWaterfallColorscale(),
            showscale: false,
            contours: { x: { show: true, color: t.line, width: 1 } },
          },
        ],
        layout,
        { responsive: true, displayModeBar: false },
      );
    });

    return () => {
      cancelled = true;
      import('plotly.js-dist-min').then((mod) => {
        if (plotRef.current) mod.default.purge(plotRef.current);
      });
    };
  }, [ftir]);

  return (
    <VizLayout
      vizId="07-ftir-waterfall"
      title="FTIR Waterfall (3D)"
      dek="Twelve months of a region's infrared fingerprint, stacked into depth. A band that grows toward the front is a component taking over the supply."
      how={
        <>
          Each ribbon slice is an <b>FTIR spectrum</b> for one month (depth axis = time, front axis = wavenumber, height =
          absorbance). Stacking them as a <b>waterfall</b> turns trend-spotting into terrain-reading: a band that swells
          from back to front is a substance whose share is rising; one that recedes is leaving. This is how
          spectroscopists watch a reaction or a market evolve. <b>Drag</b> to orbit. <b>Limits:</b> FTIR is blind to
          components below ~5% — potent drugs like fentanyl can rise invisibly between these ribbons.
        </>
      }
      provenance="Monthly spectra synthesized from a shifting component mix (acetaminophen/caffeine → +xylazine) over illustrative FTIR bands."
      harm="A waterfall can show a sedative like xylazine entering the supply — but never the fentanyl beneath the detection floor. Pair with strips."
    >
      <div className="viz-panel">
        <div ref={plotRef} style={{ height: 580 }} />
      </div>
    </VizLayout>
  );
}
