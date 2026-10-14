import { useEffect, useMemo, useRef, useState } from 'react';
import { stickSpectrum, isRealChromatogram } from '@dcf/core';
import { VizLayout } from '../../components/VizLayout';
import { useData } from '../../context/DataContext';
import { buildRtLookup } from '../../lib/rtLookup';
import { plotlyColorscale, themeColors } from '../../lib/themeVars';

function gauss(x: number, mu: number, s: number): number {
  return Math.exp(-0.5 * ((x - mu) / s) ** 2);
}

export default function Chromatogram3dPage() {
  const { aggregates, spectra } = useData();
  const rtLookup = useMemo(() => buildRtLookup(aggregates), [aggregates]);
  const chromatograms = spectra?.chromatograms ?? {};
  const ms = spectra?.ms ?? {};

  const archetypeKeys = useMemo(
    () => Object.keys(chromatograms).filter((k) => !isRealChromatogram(k, chromatograms[k]!)),
    [chromatograms],
  );

  const [selKey, setSelKey] = useState(archetypeKeys[0] ?? 'fent_cut');
  const plotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = plotRef.current;
    if (!el) return;

    let cancelled = false;

    const peaks =
      chromatograms[selKey]?.peaks?.map(([s, rt, amp]) => ({
        s,
        rt: rtLookup[s] ?? rt,
        amp,
      })) ?? [];

    const rt: number[] = [];
    for (let t = 3; t <= 13; t += 0.08) rt.push(+t.toFixed(2));
    const mz: number[] = [];
    for (let m = 40; m <= 360; m += 4) mz.push(m);

    const Z = mz.map((mm) =>
      rt.map((tt) => {
        let v = 0;
        for (const p of peaks) {
          const msEntry = ms[p.s];
          if (!msEntry) continue;
          const pk = stickSpectrum(msEntry.peaks);
          let spec = 0;
          for (const q of pk) spec += (q.i / 100) * gauss(mm, q.mz, 2.5);
          v += (p.amp / 100) * gauss(tt, p.rt, 0.06) * spec;
        }
        return v;
      }),
    );

    import('plotly.js-dist-min').then((mod) => {
      if (cancelled) return;
      const Plotly = mod.default;
      const t = themeColors();
      const layout = {
        paper_bgcolor: 'rgba(0,0,0,0)',
        scene: {
          xaxis: {
            title: 'retention time (min)',
            color: t.muted,
            gridcolor: t.line,
            backgroundcolor: t.bg,
            showbackground: true,
          },
          yaxis: { title: 'm/z', color: t.muted, gridcolor: t.line, backgroundcolor: t.bg, showbackground: true },
          zaxis: { title: 'signal', color: t.muted, gridcolor: t.line, backgroundcolor: t.bg, showbackground: true },
          camera: { eye: { x: 1.6, y: -1.5, z: 0.9 } },
        },
        margin: { l: 0, r: 0, t: 0, b: 0 },
      };

      Plotly.newPlot(
        el,
        [
          {
            type: 'surface',
            x: rt,
            y: mz,
            z: Z,
            colorscale: plotlyColorscale(),
            showscale: false,
            contours: { z: { show: true, usecolormap: true, project: { z: true } } },
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
  }, [selKey, chromatograms, ms, rtLookup]);

  return (
    <VizLayout
      vizId="05-chromatogram-3d"
      title="GC–MS Data Cube (3D)"
      dek="A 2D chromatogram hides a dimension. The real measurement is a landscape: time on one axis, mass on another, signal as height. Drag to orbit the data."
      how={
        <>
          <b>GC–MS records two things at once.</b> The gas chromatograph separates compounds in <b>time</b> (front axis); at
          every instant the mass spectrometer records a full <b>mass spectrum</b> (side axis). Plotting signal as height
          gives this terrain: each tall ridge is one compound, eluting at its retention time and fingerprinted by its
          fragment masses. A traditional chromatogram is just this surface viewed from above and summed. <b>Drag</b> to
          rotate, scroll to zoom. <b>Limits:</b> height is signal intensity, not concentration — different molecules
          ionise very differently.
        </>
      }
      provenance="Surface synthesized from real median retention times and illustrative fragment spectra in this dataset."
      harm="Reading this landscape tells you what is present. It cannot tell you the dose — never gauge strength by eye."
    >
      <div className="viz-controls">
        <label className="muted" style={{ fontSize: 13 }}>
          Sample
        </label>
        <select className="viz-select" value={selKey} onChange={(e) => setSelKey(e.target.value)}>
          {archetypeKeys.map((k) => (
            <option key={k} value={k}>
              {chromatograms[k]?.label ?? k}
            </option>
          ))}
        </select>
      </div>
      <div className="viz-panel">
        <div ref={plotRef} style={{ height: 560 }} />
      </div>
    </VizLayout>
  );
}
