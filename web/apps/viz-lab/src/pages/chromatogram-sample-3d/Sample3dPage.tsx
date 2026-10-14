import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import { chromatogram, isRealChromatogram, type ChromatogramEntry } from '@dcf/core';
import { VizLayout } from '../../components/VizLayout';
import { useData } from '../../context/DataContext';
import { substanceColor } from '../../lib/colors';
import { useSvgContainer } from '../../lib/hooks';
import { buildRtLookup } from '../../lib/rtLookup';
import { themeColors } from '../../lib/themeVars';

const TIC_X0 = 2.5;
const TIC_X1 = 13.0;
const HEIGHT = 520;

interface SampleRow {
  key: string;
  id: string;
  label: string;
  peaks: Array<{ s: string; rt: number; amp: number; sigma: number }>;
}

function substanceSet(peaks: SampleRow['peaks']): Set<string> {
  return new Set(peaks.map((p) => String(p.s).toLowerCase()));
}

function similarity(a: SampleRow, b: SampleRow): number {
  const setA = substanceSet(a.peaks);
  const setB = substanceSet(b.peaks);
  const inter = [...setA].filter((s) => setB.has(s));
  const union = new Set([...setA, ...setB]);
  const jaccard = union.size ? inter.length / union.size : 0;
  let rtSim = 0;
  if (inter.length) {
    let err = 0;
    inter.forEach((sub) => {
      const pa = a.peaks.find((p) => String(p.s).toLowerCase() === sub);
      const pb = b.peaks.find((p) => String(p.s).toLowerCase() === sub);
      if (pa && pb) err += Math.abs(pa.rt - pb.rt);
    });
    rtSim = Math.max(0, 1 - err / (inter.length * 1.2));
  }
  return jaccard * 0.62 + rtSim * 0.38;
}

function stackLayers(samples: SampleRow[], idx: number, depthN: number, simThreshold: number): SampleRow[] {
  const current = samples[idx]!;
  const prior = samples
    .slice(0, idx)
    .map((s, i) => ({ s, i, sim: similarity(s, current) }))
    .filter((x) => x.sim >= simThreshold)
    .sort((a, b) => b.sim - a.sim)
    .slice(0, depthN);
  const chronological = prior.sort((a, b) => a.i - b.i).map((x) => x.s);
  return [...chronological, current];
}

function overlapColor(t: number): string {
  const clamp = Math.max(0, Math.min(1, t));
  const r = Math.round(40 + clamp * 200);
  const g = Math.round(60 + clamp * 90);
  const b = Math.round(120 - clamp * 80);
  const a = 0.08 + clamp * 0.42;
  return `rgba(${r},${g},${b},${a.toFixed(3)})`;
}

export default function Sample3dPage() {
  const { aggregates, spectra } = useData();
  const rtLookup = useMemo(() => buildRtLookup(aggregates), [aggregates]);
  const chromatograms = spectra?.chromatograms ?? {};

  const samples = useMemo<SampleRow[]>(() => {
    return Object.entries(chromatograms)
      .filter(([k, v]) => isRealChromatogram(k, v!))
      .map(([k, v]) => {
        const entry = v as ChromatogramEntry;
        return {
          key: k,
          id: String(entry.sample_id ?? k.replace('sample_', '')),
          label: entry.label ?? k,
          peaks: (entry.peaks ?? []).map(([s, rt, amp]: [string, number, number]) => ({
            s,
            rt: rtLookup[s] ?? +rt,
            amp: +amp,
            sigma: 0.05,
          })).filter((p: { rt: number; amp: number }) => p.rt > 0 && p.amp > 0),
        };
      })
      .filter((s) => s.peaks.length)
      .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  }, [chromatograms, rtLookup]);

  const [timeIdx, setTimeIdx] = useState(() => Math.max(0, samples.length - 1));
  const [depth, setDepth] = useState(10);
  const [simMin, setSimMin] = useState(0.35);

  useEffect(() => {
    if (timeIdx >= samples.length && samples.length) setTimeIdx(samples.length - 1);
  }, [samples.length, timeIdx]);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const draw = useCallback(
    (svgEl: SVGSVGElement, W: number) => {
      const t = themeColors();
      const svg = d3.select(svgEl);
      svg.selectAll('*').remove();
      svg.attr('height', HEIGHT);

      if (!samples.length) return;

      const idx = Math.min(timeIdx, samples.length - 1);
      const layers = stackLayers(samples, idx, depth, simMin);
      const domain: [number, number] = [TIC_X0, TIC_X1];
      const m = { t: 28, r: 20, b: 42, l: 58 };
      const H = HEIGHT;
      const x = d3.scaleLinear(domain, [m.l, W - m.r]);
      const y = d3.scaleLinear([0, 100], [H - m.b, m.t]);
      const nBins = Math.max(180, Math.floor(W - m.l - m.r));

      const traces = layers.map((sample, li) => {
        const trace = chromatogram(sample.peaks, { x0: domain[0], x1: domain[1], sigma: 0.05, n: nBins });
        const depthOffset = (layers.length - 1 - li) * 14;
        const isFront = li === layers.length - 1;
        return { sample, trace, depthOffset, isFront, layerIdx: li };
      });

      const overlap = new Float32Array(nBins);
      traces.forEach(({ trace }) => {
        trace.y.forEach((v: number, k: number) => {
          overlap[k]! += v / 100;
        });
      });
      const maxOv = Math.max(...overlap, 0.001);

      const canvas = canvasRef.current;
      if (canvas) {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.floor(W * dpr);
        canvas.height = Math.floor(H * dpr);
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.clearRect(0, 0, W, H);
          for (let k = 0; k < nBins; k++) {
            const ov = overlap[k]! / maxOv;
            if (ov < 0.06) continue;
            const x0 = x(domain[0] + ((domain[1] - domain[0]) * k) / (nBins - 1));
            const x1 = x(domain[0] + ((domain[1] - domain[0]) * (k + 1)) / (nBins - 1));
            ctx.fillStyle = overlapColor(ov);
            ctx.fillRect(x0, m.t, Math.max(1, x1 - x0), H - m.t - m.b);
          }
        }
      }

      const plot = svg.append('g');
      x.ticks(10).forEach((tick) => {
        plot
          .append('line')
          .attr('x1', x(tick))
          .attr('x2', x(tick))
          .attr('y1', m.t)
          .attr('y2', H - m.b)
          .attr('stroke', t.line)
          .attr('opacity', 0.25);
        plot
          .append('text')
          .attr('x', x(tick))
          .attr('y', H - 8)
          .attr('text-anchor', 'middle')
          .attr('fill', t.faint)
          .attr('font-size', 10)
          .text(tick);
      });

      traces.forEach((layer) => {
        const domPeak = layer.sample.peaks.reduce(
          (a, p) => (p.amp > a.amp ? p : a),
          layer.sample.peaks[0]!,
        );
        const hue = substanceColor(domPeak?.s ?? 'fentanyl');
        const op = layer.isFront ? 1 : 0.14 + 0.55 * (layer.layerIdx / (layers.length - 1 || 1));
        const sw = layer.isFront ? 2.2 : 0.85;
        plot
          .append('path')
          .datum(layer.trace.y)
          .attr('d', d3.line<number>().x((_, k) => x(layer.trace.x[k]!)).y((d) => y(d) + layer.depthOffset).curve(d3.curveBasis))
          .attr('fill', 'none')
          .attr('stroke', layer.isFront ? t.ink : hue)
          .attr('stroke-width', sw)
          .attr('opacity', op);
        if (!layer.isFront) {
          plot
            .append('text')
            .attr('x', m.l + 4)
            .attr('y', y(0) + layer.depthOffset - 4)
            .attr('fill', t.faint)
            .attr('font-size', 8)
            .text('#' + layer.sample.id);
        }
      });

      plot
        .append('text')
        .attr('x', W / 2)
        .attr('y', H - 22)
        .attr('text-anchor', 'middle')
        .attr('fill', t.muted)
        .attr('font-size', 11)
        .text('retention time (min) · warm wash = overlapping signal');
      plot
        .append('text')
        .attr('x', m.l - 6)
        .attr('y', m.t - 8)
        .attr('text-anchor', 'end')
        .attr('fill', t.muted)
        .attr('font-size', 9)
        .text('back → front');
    },
    [samples, timeIdx, depth, simMin],
  );

  const svgRef = useSvgContainer(draw, [draw]);

  const current = samples[Math.min(timeIdx, Math.max(0, samples.length - 1))];
  const layerCount = samples.length ? stackLayers(samples, Math.min(timeIdx, samples.length - 1), depth, simMin).length : 0;

  return (
    <VizLayout
      vizId="chromatogram-sample-3d"
      title="Sample TIC Time Stack"
      dek="Real lab TICs layered back in time — warm overlap bands show where similar samples share peaks. Scrub sample index and depth to walk the cohort."
      how={
        <>
          Each curve is a <b>real sample TIC</b> from the lab cohort. The <b>time slider</b> picks the foreground sample;
          older similar samples stack behind with decreasing opacity and a slight vertical offset (pseudo-depth). The{' '}
          <b>overlap wash</b> warms where multiple traces align — shared peaks across time. <b>Depth</b> controls how many
          prior samples appear; <b>similarity</b> filters to chemically alike histories. <b>Limits:</b> sample order is
          cohort ID, not collection date; peak height ≠ potency.
        </>
      }
      provenance="40 real sample chromatograms exported from drugchecking.sqlite (UNC viz cohort)."
      harm="Overlap does not mean identical dose — always test the sample in hand."
    >
      {!samples.length ? (
        <p className="muted">No real sample chromatograms in spectra.json — run pipeline export_viz_data.py.</p>
      ) : (
        <>
          <div className="viz-controls" style={{ flexWrap: 'wrap', gap: '14px 22px', marginBottom: 8 }}>
            <label className="muted" style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 160 }}>
              Sample (time)
              <input
                type="range"
                min={0}
                max={samples.length - 1}
                value={Math.min(timeIdx, samples.length - 1)}
                step={1}
                onChange={(e) => setTimeIdx(+e.target.value)}
              />
              <output className="mono" style={{ fontSize: 11, color: 'var(--ink)' }}>
                #{current?.id} ({Math.min(timeIdx, samples.length - 1) + 1}/{samples.length})
              </output>
            </label>
            <label className="muted" style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 160 }}>
              Stack depth
              <input type="range" min={3} max={18} value={depth} step={1} onChange={(e) => setDepth(+e.target.value)} />
              <output className="mono" style={{ fontSize: 11, color: 'var(--ink)' }}>
                {depth}
              </output>
            </label>
            <label className="muted" style={{ fontSize: 12, display: 'flex', flexDirection: 'column', gap: 4, minWidth: 160 }}>
              Similarity filter
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(simMin * 100)}
                step={5}
                onChange={(e) => setSimMin(+e.target.value / 100)}
              />
              <output className="mono" style={{ fontSize: 11, color: 'var(--ink)' }}>
                {simMin.toFixed(2)}
              </output>
            </label>
          </div>
          <p className="muted" style={{ fontSize: 12, margin: '6px 0 10px', lineHeight: 1.45 }} aria-live="polite">
            <b style={{ color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>{current?.label}</b> · {current?.peaks.length}{' '}
            peaks · stack shows <b>{layerCount}</b> similar prior sample{layerCount === 1 ? '' : 's'} + current
          </p>
          <div
            className="viz-panel"
            ref={wrapRef}
            style={{ position: 'relative', padding: 'var(--space-3)' }}
          >
            <canvas
              ref={canvasRef}
              aria-hidden
              style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none', mixBlendMode: 'screen' }}
            />
            <svg ref={svgRef} width="100%" height={HEIGHT} style={{ position: 'relative', zIndex: 1, display: 'block' }} />
          </div>
        </>
      )}
    </VizLayout>
  );
}
