import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import {
  chromatogram,
  classify,
  drawSmiles,
  fmt,
  isRealChromatogram,
  stickSpectrum,
  type StickPeak,
  type Trace,
} from '@dcf/core';
import { VizLayout } from '../../components/VizLayout';
import { useData } from '../../context/DataContext';
import { substanceColor } from '../../lib/colors';
import { useSvgContainer } from '../../lib/hooks';
import { buildRtLookup } from '../../lib/rtLookup';
import { themeColors } from '../../lib/themeVars';

const NOTE: Record<string, string> = {
  fentanyl:
    'Potent synthetic opioid. Dominant peak ≠ known dose — small visual changes mean large potency changes.',
  '4-anpp': 'A fentanyl precursor/impurity. Its presence is a chemical signature of fentanyl synthesis.',
  xylazine:
    'A veterinary sedative ("tranq"). Not an opioid — naloxone won\'t reverse its sedation, and it causes severe skin wounds.',
  acetaminophen: 'A common cut (Tylenol). Inactive at these levels but signals a pressed or bulked product.',
  caffeine: 'A stimulant cut that volatilises the mix for smoking and adds a rush.',
  lidocaine: 'A local anesthetic cut that numbs — sometimes mistaken for "good" cocaine.',
  cocaine: 'Stimulant. Watch for fentanyl cross-contamination in any powder supply.',
  heroin: 'Classic opioid; increasingly displaced by fentanyl in the unregulated supply.',
  'p-fluorofentanyl': 'A fentanyl analog that rides alongside fentanyl; adds to total opioid load.',
  diphenhydramine: 'An antihistamine (Benadryl) cut that deepens sedation.',
  bromazolam:
    'A street benzodiazepine. Combined with opioids it deepens and prolongs overdose; naloxone won\'t fix the benzo part.',
  benzocaine: 'Anesthetic cut mimicking cocaine\'s numbing.',
  levamisole: 'A veterinary dewormer cut in cocaine; can damage white blood cells and skin.',
  'dimethyl sulfone': 'An inert bulking agent (MSM) common in methamphetamine.',
  'n,n-dimethylamphetamine': 'A methamphetamine synthesis byproduct.',
  benzoylecgonine: 'A cocaine breakdown product — a fingerprint of cocaine itself.',
};

interface PeakPoint {
  s: string;
  rt: number;
  amp: number;
  sigma: number;
}

const TIC_X0 = 3;
const TIC_X1 = 13;

function ticChartHeight(width: number): number {
  return Math.round(Math.max(240, Math.min(420, width * 0.38)));
}

/** Apex on the synthesized TIC within a local RT window (matches ridgeline math). */
function ticApexOnTrace(trace: Trace, rt: number, halfWin = 0.12): { rt: number; amp: number } {
  let maxV = -1;
  let maxI = 0;
  trace.x.forEach((t, k) => {
    if (Math.abs(t - rt) <= halfWin && trace.y[k]! > maxV) {
      maxV = trace.y[k]!;
      maxI = k;
    }
  });
  if (maxV < 0) {
    maxI = trace.x.reduce((best, t, k) => (Math.abs(t - rt) < Math.abs(trace.x[best]! - rt) ? k : best), 0);
  }
  return { rt: trace.x[maxI]!, amp: trace.y[maxI]! };
}

export default function ChromatogramExplorerPage() {
  const { aggregates, spectra } = useData();
  const rtLookup = useMemo(() => buildRtLookup(aggregates), [aggregates]);
  const chromatograms = spectra?.chromatograms ?? {};
  const ms = spectra?.ms ?? {};

  const archetypeKeys = useMemo(
    () => Object.keys(chromatograms).filter((k) => !isRealChromatogram(k, chromatograms[k]!)),
    [chromatograms],
  );

  const [archKey, setArchKey] = useState(archetypeKeys[0] ?? 'fent_cut');
  const [selected, setSelected] = useState<string | null>(null);
  const msSvgRef = useRef<SVGSVGElement>(null);
  const molCanvasId = 'chrom-explorer-mol';

  const peaksFor = useCallback(
    (key: string): PeakPoint[] => {
      const entry = chromatograms[key];
      if (!entry?.peaks) return [];
      return entry.peaks.map(([s, rt, amp]) => ({
        s,
        rt: rtLookup[s] ?? rt,
        amp,
        sigma: 0.05,
      }));
    },
    [chromatograms, rtLookup],
  );

  const draw = useCallback(
    (svgEl: SVGSVGElement, W: number) => {
      const t = themeColors();
      const svg = d3.select(svgEl);
      svg.selectAll('*').remove();
      const H = ticChartHeight(W);
      svg.attr('height', H).attr('role', 'img').attr('aria-label', 'Interactive GC-MS total ion chromatogram');

      const m = { t: 20, r: 16, b: 40, l: 46 };
      const peaks = peaksFor(archKey);
      const trace = chromatogram(peaks, { x0: TIC_X0, x1: TIC_X1, sigma: 0.05, n: 900 });
      const x = d3.scaleLinear([TIC_X0, TIC_X1], [m.l, W - m.r]);
      const y = d3.scaleLinear([0, 105], [H - m.b, m.t]);
      const infoCol = t.info;

      x.ticks(10).forEach((tick) => {
        svg
          .append('text')
          .attr('x', x(tick))
          .attr('y', H - 14)
          .attr('fill', t.faint)
          .attr('font-size', 11)
          .attr('text-anchor', 'middle')
          .text(tick);
      });
      svg
        .append('text')
        .attr('x', W / 2)
        .attr('y', H - 2)
        .attr('text-anchor', 'middle')
        .attr('fill', t.muted)
        .attr('font-size', 11)
        .text('retention time (minutes)');
      svg
        .append('text')
        .attr('transform', `translate(13,${H / 2})rotate(-90)`)
        .attr('text-anchor', 'middle')
        .attr('fill', t.muted)
        .attr('font-size', 11)
        .text('TIC (relative ion current)');

      const grad = svg.append('defs').append('linearGradient').attr('id', 'chrom-grad').attr('x1', 0).attr('x2', 0).attr('y1', 0).attr('y2', 1);
      grad.append('stop').attr('offset', '0%').attr('stop-color', infoCol).attr('stop-opacity', 0.5);
      grad.append('stop').attr('offset', '100%').attr('stop-color', infoCol).attr('stop-opacity', 0.04);

      const area = d3
        .area<number>()
        .x((_, i) => x(trace.x[i]!))
        .y0(y(0))
        .y1((d) => y(d))
        .curve(d3.curveBasis);
      svg.append('path').datum(trace.y).attr('d', area).attr('fill', 'url(#chrom-grad)');
      svg
        .append('path')
        .datum(trace.y)
        .attr('d', d3.line<number>().x((_, i) => x(trace.x[i]!)).y((d) => y(d)).curve(d3.curveBasis))
        .attr('fill', 'none')
        .attr('stroke', infoCol)
        .attr('stroke-width', 1.6);

      peaks.forEach((p) => {
        const col = substanceColor(p.s);
        const apex = ticApexOnTrace(trace, p.rt);
        const px = x(apex.rt);
        const py = y(apex.amp);
        const isSel = selected === p.s;
        const showLabel = p.amp > 14 || isSel;
        const dotR = isSel ? 3.5 : 2.5;

        svg
          .append('circle')
          .attr('cx', px)
          .attr('cy', py)
          .attr('r', dotR)
          .attr('fill', col)
          .attr('stroke', t.bg)
          .attr('stroke-width', 1.5)
          .style('cursor', 'pointer')
          .on('click', () => setSelected(p.s))
          .append('title')
          .text(`${p.s} · RT ${fmt.rt(p.rt)} min · ${fmt.pct(apex.amp)} TIC`);

        if (showLabel) {
          svg
            .append('text')
            .attr('x', px)
            .attr('y', py - 7)
            .attr('text-anchor', 'middle')
            .attr('font-size', 9)
            .attr('font-family', 'var(--font-mono)')
            .attr('fill', isSel ? col : t.muted)
            .text(fmt.rt(p.rt));
        }
      });
    },
    [archKey, peaksFor, selected],
  );

  const chartRef = useSvgContainer(draw, [draw]);

  useEffect(() => {
    if (!selected || !msSvgRef.current) return;
    const entry = ms[selected];
    const t = themeColors();
    const col = substanceColor(selected);
    const svg = d3.select(msSvgRef.current);
    svg.selectAll('*').remove();
    if (!entry?.peaks?.length) return;
    const pk = stickSpectrum(entry.peaks);
    const ext = d3.extent(pk, (p: { mz: number }) => p.mz) as [number, number];
    const x = d3.scaleLinear(ext, [6, 194]);
    const y = d3.scaleLinear([0, 100], [112, 8]);
    svg
      .selectAll<SVGLineElement, StickPeak>('line')
      .data(pk)
      .join('line')
      .attr('x1', (p: StickPeak) => x(p.mz))
      .attr('x2', (p: StickPeak) => x(p.mz))
      .attr('y1', 112)
      .attr('y2', (p: StickPeak) => y(p.i))
      .attr('stroke', col)
      .attr('stroke-width', 1.4);
    svg.append('text').attr('x', 6).attr('y', 118).attr('fill', t.faint).attr('font-size', 9).text('m/z');
    if (entry.smiles) drawSmiles(entry.smiles, molCanvasId, 160, 120);
  }, [selected, ms]);

  const detail = selected ? (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 200px 160px',
        gap: 18,
        alignItems: 'start',
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 6 }}>
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 3,
              background: substanceColor(selected),
              display: 'inline-block',
            }}
          />
          <span style={{ fontSize: 18, fontWeight: 700, textTransform: 'capitalize' }}>{selected}</span>
          <span className="muted" style={{ fontSize: 12 }}>
            {classify(selected).label}
          </span>
        </div>
        <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.55, margin: 0, maxWidth: '52ch' }}>
          {NOTE[selected] ?? 'Detected component. Tap other peaks to compare.'}
        </p>
      </div>
      <div>
        <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>
          MASS SPECTRUM
        </div>
        {ms[selected]?.peaks?.length ? (
          <svg ref={msSvgRef} width={200} height={120} />
        ) : (
          <div className="faint" style={{ fontSize: 11, width: 200 }}>
            spectrum n/a
          </div>
        )}
      </div>
      <div>
        <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>
          STRUCTURE
        </div>
        <canvas
          id={molCanvasId}
          width={160}
          height={120}
          style={{ background: 'var(--panel-2)', borderRadius: 8 }}
        />
      </div>
    </div>
  ) : (
    <div
      className="muted"
      style={{ display: 'flex', height: 140, alignItems: 'center', justifyContent: 'center', fontSize: 14 }}
    >
      ▲ Tap a peak to identify the substance
    </div>
  );

  return (
    <VizLayout
      vizId="02-chromatogram-explorer"
      title="Annotated Chromatogram Explorer"
      dek="A GC–MS chromatogram is a sample's visual fingerprint. Each peak is one substance, separated by how fast it travels through the instrument. Tap a peak to learn what it is."
      how={
        <>
          <b>Reading the TIC.</b> The x-axis is <b>retention time</b> — how long a compound takes to pass through the
          column (a fixed property, like a fingerprint). The y-axis is <b>total ion current</b> (summed detector signal,
          normalized).{' '}
          <b>More peaks = more substances. Taller peaks = more signal, NOT higher purity or dose.</b> Different compounds
          ionise with wildly different efficiency, so a tall peak and a short peak can be present in similar amounts.{' '}
          <b>Tap any peak</b> to see its mass spectrum, structure, and a plain-language card.
        </>
      }
      provenance="Archetype traces use real median GC–MS retention times; real-sample entries use lab detections + unc_gcms RTs. Mass spectra illustrative."
      harm="Carry naloxone and test strips. A clean-looking fingerprint can still hide a fatal dose — height shows signal, not strength."
    >
      <div className="viz-controls">
        <label className="muted" style={{ fontSize: 13 }}>
          Sample archetype
        </label>
        <select
          className="viz-select"
          value={archKey}
          onChange={(e) => {
            setArchKey(e.target.value);
            setSelected(null);
          }}
        >
          {archetypeKeys.map((k) => (
            <option key={k} value={k}>
              {chromatograms[k]?.label ?? k}
            </option>
          ))}
        </select>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(260px, 340px)',
          gap: 'var(--space-4)',
          alignItems: 'start',
        }}
      >
        <div className="viz-panel">
          <svg ref={chartRef} width="100%" style={{ display: 'block', minHeight: 240 }} />
        </div>
        <div className="viz-panel" style={{ minHeight: 170 }}>
          {detail}
        </div>
      </div>
    </VizLayout>
  );
}
