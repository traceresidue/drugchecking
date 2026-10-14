import { useCallback, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { chromatogram, classify } from '@dcf/core';
import { VizLayout } from '../../components/VizLayout';
import { useData } from '../../context/DataContext';
import { useSvgContainer } from '../../lib/hooks';
import { buildRtLookup } from '../../lib/rtLookup';
import {
  RIDGE_HEIGHT,
  RIDGE_OVERLAP,
  KEY_SUBSTANCES,
  batchRows,
  fullTicDomain,
  computeDrugStats,
  drawFullTicRow,
  drawVariabilityColumns,
  drawReferenceRow,
  drawDrugLabels,
  drawSampleIndex,
  tracesByClass,
  layoutMargins,
  ySample,
  rowYScale,
  sampleBand,
  drugHue,
  devColor,
  normDev,
  classFillColor,
  CLASS_ORDER,
  type RidgelinePeak,
} from '../../lib/ridgeline';
import { themeColors } from '../../lib/themeVars';

type VizMode = 'outline' | 'filled';
type BatchMode = 'stable' | 'volatile';

export default function RidgelinePage() {
  const { aggregates, spectra } = useData();
  const rtLookup = useMemo(() => buildRtLookup(aggregates), [aggregates]);
  const chromatograms = spectra?.chromatograms;

  const [batchMode, setBatchMode] = useState<BatchMode>('stable');
  const [vizMode, setVizMode] = useState<VizMode>('outline');
  const [keySubId, setKeySubId] = useState('fentanyl');

  const keyMeta = useMemo(
    () => KEY_SUBSTANCES.find((k) => k.id === keySubId) ?? KEY_SUBSTANCES[0]!,
    [keySubId],
  );

  const drawOutline = useCallback(
    (svgEl: SVGSVGElement, W: number) => {
      const t = themeColors();
      const svg = d3.select(svgEl);
      svg.selectAll('*').remove();
      svg.attr('height', RIDGE_HEIGHT);

      const H = RIDGE_HEIGHT;
      const m = { t: 16, r: 16, b: 34, l: 54 };
      const sub = keyMeta.substance;
      const rows = batchRows(batchMode, rtLookup, chromatograms, { classFilter: keyMeta.classFilter });
      const domain = fullTicDomain(rows);
      const st = computeDrugStats(rows, sub, rtLookup);
      const x = d3.scaleLinear(domain, [m.l, W - m.r]);
      const rowH = (H - m.t - m.b) / rows.length;

      x.ticks(10).forEach((tick) => {
        svg
          .append('line')
          .attr('x1', x(tick))
          .attr('x2', x(tick))
          .attr('y1', m.t)
          .attr('y2', H - m.b)
          .attr('stroke', t.line)
          .attr('opacity', 0.3);
        svg
          .append('text')
          .attr('x', x(tick))
          .attr('y', H - 14)
          .attr('text-anchor', 'middle')
          .attr('fill', t.faint)
          .attr('font-size', 11)
          .text(tick);
      });

      const hue = drugHue(sub);
      svg
        .append('line')
        .attr('x1', x(st.meanRt))
        .attr('x2', x(st.meanRt))
        .attr('y1', m.t)
        .attr('y2', H - m.b)
        .attr('stroke', hue)
        .attr('stroke-width', 1.5)
        .attr('opacity', 0.45)
        .attr('stroke-dasharray', '5,4');

      svg
        .append('text')
        .attr('x', W / 2)
        .attr('y', H - 2)
        .attr('text-anchor', 'middle')
        .attr('fill', t.muted)
        .attr('font-size', 11)
        .text(`${keyMeta.label} · retention time (min) — full TIC per row`);

      rows.forEach((peaks: RidgelinePeak[], i: number) => {
        const kp = peaks.find((p) => p.s === sub);
        const baseY = m.t + (i + 1) * rowH;
        const yScale = d3.scaleLinear([0, 100], [baseY, baseY - rowH * RIDGE_OVERLAP]);
        const rowHue = kp ? devColor(hue, normDev(kp, st)) : t.muted;
        drawFullTicRow(svg, peaks, {
          x,
          yScale,
          domain,
          stroke: rowHue,
          fill: rowHue,
          fillOpacity: kp ? 0.18 : 0.06,
          strokeWidth: 1.2,
          strokeOpacity: kp ? 0.9 : 0.45,
          baseY,
        });
        svg
          .append('text')
          .attr('x', m.l - 8)
          .attr('y', baseY - 2)
          .attr('text-anchor', 'end')
          .attr('fill', t.faint)
          .attr('font-size', 9)
          .text('#' + (rows.length - i));
      });

      svg.append('text').attr('x', m.l - 8).attr('y', m.t + 10).attr('text-anchor', 'end').attr('fill', t.muted).attr('font-size', 10).text('newest');
    },
    [batchMode, chromatograms, keyMeta, rtLookup],
  );

  const drawFilled = useCallback(
    (svgEl: SVGSVGElement, W: number) => {
      const t = themeColors();
      const svg = d3.select(svgEl);
      svg.selectAll('*').remove();
      svg.attr('height', RIDGE_HEIGHT);

      const H = RIDGE_HEIGHT;
      const m = layoutMargins(H);
      const rows = batchRows(batchMode, rtLookup, chromatograms, { classFilter: keyMeta.classFilter });
      const drugs = [keyMeta.substance];
      const domain = fullTicDomain(rows);
      const x = d3.scaleLinear(domain, [m.l, W - m.r]);

      x.ticks(10).forEach((tick) => {
        svg
          .append('line')
          .attr('x1', x(tick))
          .attr('x2', x(tick))
          .attr('y1', m.t)
          .attr('y2', m.t + sampleBand(H, m))
          .attr('stroke', t.line)
          .attr('opacity', 0.22);
      });

      rows.forEach((peaks, i) => {
        const baseY = ySample(i, m, H, rows);
        const y = rowYScale(i, m, H, rows, RIDGE_OVERLAP);
        const layers = tracesByClass(peaks, domain);
        const total = chromatogram(
          peaks.map((p) => ({ rt: p.rt, amp: p.amp, sigma: p.sigma })),
          { x0: domain[0], x1: domain[1], sigma: 0.05, n: 180 },
        );
        layers.forEach(({ cls, trace }) => {
          const area = d3
            .area<number>()
            .x((_, k) => x(trace.x[k]!))
            .y0(baseY)
            .y1((d) => y(d))
            .curve(d3.curveBasis);
          svg.append('path').datum(trace.y).attr('d', area).attr('fill', classFillColor(cls)).attr('opacity', 0.42);
        });
        svg
          .append('path')
          .datum(total.y)
          .attr('d', d3.line<number>().x((_, k) => x(total.x[k]!)).y((d) => y(d)).curve(d3.curveBasis))
          .attr('fill', 'none')
          .attr('stroke', t.ink)
          .attr('stroke-width', 0.75)
          .attr('opacity', 0.55);
      });

      drawVariabilityColumns(svg, { rows, drugs, x, m, H, domain, overlap: RIDGE_OVERLAP, rtLookup });
      drawReferenceRow(svg, x, drugs, rows, domain[0], domain[1], m, rtLookup);
      drawDrugLabels(svg, drugs, rows, x, H, m, rtLookup);
      drawSampleIndex(svg, m, H, rows);
    },
    [batchMode, chromatograms, keyMeta, rtLookup],
  );

  const draw = vizMode === 'outline' ? drawOutline : drawFilled;
  const svgRef = useSvgContainer(draw, [draw]);

  return (
    <VizLayout
      vizId="06-spectral-ridgeline"
      title="Batch Ridgeline Fingerprints"
      dek="Stack samples across the full GC run — pick a key substance to read batch consistency from its retention-time column over real TIC shapes."
      how={
        <>
          Each <b>row is one submitted sample&apos;s full TIC</b>, stacked newest-on-top across the standard{' '}
          <b>2.5–13 min</b> window. Select a <b>key substance</b> to tint rows and mark its mean RT — aligned ridges =
          stable supply; scatter = drift. Toggle <b>outline</b> vs <b>class-fill</b> modes. <b>Limits:</b> ridge height is
          within-sample relative signal, not comparable potency between samples.
        </>
      }
      provenance="Rows use real lab cohort chromatograms when exported; otherwise synthesized mixes over real retention times."
      harm='Even a "consistent" supply shifts without warning. Test every time; potency can change while the fingerprint looks the same.'
    >
      <div className="viz-controls">
        <button
          type="button"
          className="viz-btn"
          aria-pressed={batchMode === 'stable'}
          onClick={() => setBatchMode('stable')}
        >
          Stable fentanyl market
        </button>
        <button
          type="button"
          className="viz-btn"
          aria-pressed={batchMode === 'volatile'}
          onClick={() => setBatchMode('volatile')}
        >
          Volatile transition period
        </button>
        <button
          type="button"
          className="viz-btn"
          aria-pressed={vizMode === 'outline'}
          onClick={() => setVizMode('outline')}
        >
          Outline ridges
        </button>
        <button
          type="button"
          className="viz-btn"
          aria-pressed={vizMode === 'filled'}
          onClick={() => setVizMode('filled')}
        >
          Class fills
        </button>
        <span style={{ width: 1, height: 24, background: 'var(--line)', margin: '0 4px' }} />
        {KEY_SUBSTANCES.map((k) => (
          <button
            key={k.id}
            type="button"
            className="viz-btn"
            aria-pressed={keySubId === k.id}
            onClick={() => setKeySubId(k.id)}
          >
            {k.label}
          </button>
        ))}
      </div>
      <div className="viz-panel">
        <svg ref={svgRef} width="100%" height={RIDGE_HEIGHT} role="img" aria-label="Stacked ridgeline chromatograms" />
        {vizMode === 'filled' && (
          <div className="viz-legend">
            <span>
              <i style={{ background: drugHue(keyMeta.substance) }} />
              <b>{keyMeta.label}</b> column active
            </span>
            {CLASS_ORDER.map((c) => (
              <span key={c}>
                <i style={{ background: classFillColor(c) }} />
                {classify(
                  { fent: 'fentanyl', opioid: 'heroin', xyl: 'xylazine', stim: 'methamphetamine', coke: 'cocaine', benzo: 'bromazolam', cut: 'acetaminophen', other: 'ketamine' }[c] ?? 'ketamine',
                ).label}
              </span>
            ))}
          </div>
        )}
      </div>
    </VizLayout>
  );
}
