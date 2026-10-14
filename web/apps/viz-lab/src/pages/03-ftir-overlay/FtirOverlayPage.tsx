import { useCallback, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { ftirCurve, type FtirBand } from '@dcf/core';
import { VizLayout } from '../../components/VizLayout';
import { useData } from '../../context/DataContext';
import { substanceColor } from '../../lib/colors';
import { useSvgContainer } from '../../lib/hooks';
import { themeColors } from '../../lib/themeVars';

function getFtirBands(ftir: Record<string, unknown>, key: string): FtirBand[] {
  const entry = ftir[key];
  if (Array.isArray(entry)) return entry as FtirBand[];
  if (entry && typeof entry === 'object' && Array.isArray((entry as { peaks?: FtirBand[] }).peaks)) {
    return (entry as { peaks: FtirBand[] }).peaks;
  }
  return [];
}

function ftirRefs(ftir: Record<string, unknown>): string[] {
  return Object.keys(ftir).filter((k) => getFtirBands(ftir, k).length > 0);
}

function bandsFor(ftir: Record<string, unknown>, set: Set<string>): FtirBand[] {
  const bands: FtirBand[] = [];
  set.forEach((r) => {
    getFtirBands(ftir, r).forEach((b) => bands.push(b));
  });
  return bands;
}

export default function FtirOverlayPage() {
  const { spectra } = useData();
  const ftir = (spectra?.ftir ?? {}) as Record<string, unknown>;
  const refs = useMemo(() => ftirRefs(ftir), [ftir]);

  const [mix, setMix] = useState<Set<string>>(() => new Set(['fentanyl', 'caffeine', 'lactose']));
  const [subtracted, setSubtracted] = useState<Set<string>>(() => new Set());
  const [legend, setLegend] = useState({ left: 0, subCount: 0 });

  const toggleMix = (r: string) => {
    setMix((prev) => {
      const next = new Set(prev);
      if (next.has(r)) next.delete(r);
      else next.add(r);
      return next;
    });
    setSubtracted((prev) => {
      const next = new Set(prev);
      next.delete(r);
      return next;
    });
  };

  const toggleSubtract = (r: string) => {
    if (!mix.has(r)) return;
    setSubtracted((prev) => {
      const next = new Set(prev);
      if (next.has(r)) next.delete(r);
      else next.add(r);
      return next;
    });
  };

  const draw = useCallback(
    (svgEl: SVGSVGElement, W: number) => {
      const t = themeColors();
      const accent = substanceColor('fentanyl');
      const svg = d3.select(svgEl);
      svg.selectAll('*').remove();
      svg.attr('height', 420).attr('role', 'img').attr('aria-label', 'FTIR overlay and residual');

      const H = 420;
      const m = { t: 20, r: 16, b: 40, l: 30 };
      const total = ftirCurve(bandsFor(ftir, mix));
      const resid = ftirCurve(bandsFor(ftir, new Set([...mix].filter((r) => !subtracted.has(r)))));
      const sub = ftirCurve(bandsFor(ftir, subtracted));
      const x = d3.scaleLinear([4000, 400], [m.l, W - m.r]);
      const ymax = Math.max(...total.y, 1) * 1.1;
      const y = d3.scaleLinear([0, ymax], [H - m.b, m.t]);

      svg
        .append('rect')
        .attr('x', x(1500))
        .attr('y', m.t)
        .attr('width', x(400) - x(1500))
        .attr('height', H - m.b - m.t)
        .attr('fill', t.panel2)
        .attr('opacity', 0.5);
      svg
        .append('text')
        .attr('x', (x(1500) + x(400)) / 2)
        .attr('y', m.t + 13)
        .attr('text-anchor', 'middle')
        .attr('fill', t.faint)
        .attr('font-size', 10)
        .text('fingerprint region');

      [4000, 3000, 2000, 1500, 1000, 500].forEach((tick) => {
        svg
          .append('line')
          .attr('x1', x(tick))
          .attr('x2', x(tick))
          .attr('y1', m.t)
          .attr('y2', H - m.b)
          .attr('stroke', t.line)
          .attr('opacity', 0.4);
        svg
          .append('text')
          .attr('x', x(tick))
          .attr('y', H - 14)
          .attr('text-anchor', 'middle')
          .attr('fill', t.faint)
          .attr('font-size', 11)
          .text(tick);
      });
      svg
        .append('text')
        .attr('x', W / 2)
        .attr('y', H - 2)
        .attr('text-anchor', 'middle')
        .attr('fill', t.muted)
        .attr('font-size', 11)
        .text('wavenumber (cm⁻¹) — high to low');

      const line = d3
        .line<number>()
        .x((_, i) => x(total.x[i]!))
        .y((d) => y(d))
        .curve(d3.curveBasis);
      svg
        .append('path')
        .datum(total.y)
        .attr('d', line)
        .attr('fill', 'none')
        .attr('stroke', t.muted)
        .attr('stroke-width', 1)
        .attr('opacity', 0.5)
        .attr('stroke-dasharray', '3,3');

      if (subtracted.size) {
        svg
          .append('path')
          .datum(sub.y)
          .attr('d', d3.line<number>().x((_, i) => x(sub.x[i]!)).y((d) => y(d)).curve(d3.curveBasis))
          .attr('fill', 'none')
          .attr('stroke', t.faint)
          .attr('stroke-width', 1.1)
          .attr('opacity', 0.6);
      }

      const area = d3
        .area<number>()
        .x((_, i) => x(resid.x[i]!))
        .y0(y(0))
        .y1((d) => y(d))
        .curve(d3.curveBasis);
      const grad = svg.append('defs').append('linearGradient').attr('id', 'ftir-resid').attr('x1', 0).attr('x2', 0).attr('y1', 0).attr('y2', 1);
      grad.append('stop').attr('offset', '0%').attr('stop-color', accent).attr('stop-opacity', 0.4);
      grad.append('stop').attr('offset', '100%').attr('stop-color', accent).attr('stop-opacity', 0.03);
      svg.append('path').datum(resid.y).attr('d', area).attr('fill', 'url(#ftir-resid)');
      svg
        .append('path')
        .datum(resid.y)
        .attr('d', d3.line<number>().x((_, i) => x(resid.x[i]!)).y((d) => y(d)).curve(d3.curveBasis))
        .attr('fill', 'none')
        .attr('stroke', accent)
        .attr('stroke-width', 1.8);

      setLegend({
        left: [...mix].filter((r) => !subtracted.has(r)).length,
        subCount: subtracted.size,
      });
    },
    [ftir, mix, subtracted],
  );

  const svgRef = useSvgContainer(draw, [draw]);

  return (
    <VizLayout
      vizId="03-ftir-overlay"
      title="FTIR Overlay & Subtraction Bench"
      dek="On-site FTIR reads a sample's infrared molecular barcode. Build a synthetic mixture, then peel off known components to reveal what can't yet be explained."
      how={
        <>
          <b>FTIR</b> shines infrared light through a sample; chemical bonds absorb specific frequencies, producing bands
          at characteristic <b>wavenumbers</b> (<span className="mono">cm⁻¹</span>, plotted high→low by convention). The
          cluttered <b>fingerprint region</b> (1500–400, shaded) is nearly unique per molecule. A field tech identifies a
          mixture by matching and <b>subtracting</b> reference spectra; whatever signal remains (the <b>residual</b>) may
          be an unidentified or trace component — exactly where novel adulterants hide. <b>Limits:</b> FTIR struggles below
          ~5% of a mixture and can miss potent drugs present in tiny amounts (like fentanyl).
        </>
      }
      provenance="Band positions illustrative of characteristic functional-group absorptions; intensities approximate."
      harm='FTIR can miss fentanyl and other potent drugs present below its detection floor. A "clean" FTIR result is not an all-clear — use test strips too.'
    >
      <div className="viz-controls" id="mixctl">
        <span className="muted" style={{ fontSize: 13 }}>
          Mixture contains:
        </span>
        {refs.map((r) => (
          <button
            key={`mix-${r}`}
            type="button"
            className="viz-btn"
            aria-pressed={mix.has(r)}
            onClick={() => toggleMix(r)}
          >
            {r}
          </button>
        ))}
      </div>
      <div className="viz-controls" id="subctl">
        <span className="muted" style={{ fontSize: 13 }}>
          Subtract reference:
        </span>
        {refs.map((r) => (
          <button
            key={`sub-${r}`}
            type="button"
            className="viz-btn"
            aria-pressed={subtracted.has(r)}
            disabled={!mix.has(r)}
            onClick={() => toggleSubtract(r)}
          >
            {r}
          </button>
        ))}
      </div>
      <div className="viz-panel">
        <svg ref={svgRef} width="100%" height={420} />
      </div>
      <div className="viz-legend">
        <span>
          <i style={{ background: 'var(--muted)' }} />
          full mixture
        </span>
        <span>
          <i style={{ background: substanceColor('fentanyl') }} />
          residual after subtraction ({legend.left} components left)
        </span>
        <span className="faint">
          subtracting {legend.subCount || 'none'} reference{legend.subCount === 1 ? '' : 's'}
        </span>
      </div>
    </VizLayout>
  );
}
