import { useMemo } from 'react';

export interface SpectrumSeries {
  id: string;
  label: string;
  peaks: Array<[number, number]>;
  technique: string; // 'GCMS' | 'MS' | 'FTIR' (or unknown)
  color: string;
}

export interface SpectrumChartProps {
  series: SpectrumSeries[];
  /** 'mirror' draws the first series above the axis and the second below it
   * (classic library-match presentation); anything else overlays all series
   * on a shared baseline. */
  mode?: 'overlay' | 'mirror';
  width?: number;
  height?: number;
}

const MARGIN = { top: 10, right: 14, bottom: 26, left: 40 };

function axisLabelFor(technique: string): string {
  switch (technique) {
    case 'GCMS':
      return 'retention time (min)';
    case 'MS':
      return 'm/z';
    case 'FTIR':
      return 'wavenumber (cm⁻¹)';
    default:
      return 'x';
  }
}

/**
 * Small, self-contained SVG renderer for chromatograms / stick mass spectra /
 * FTIR curves and their overlay/mirror comparisons. Deliberately does not
 * depend on any charting library or on packages/dcf-charts -- this app is
 * meant to stand alone.
 */
export function SpectrumChart({ series, mode = 'overlay', width = 620, height = 220 }: SpectrumChartProps) {
  const hasData = series.some((s) => s.peaks.length > 0);

  const { paths, sticks, xTicks, axisLabel, baselineYs } = useMemo(() => {
    const innerW = width - MARGIN.left - MARGIN.right;
    const innerH = height - MARGIN.top - MARGIN.bottom;

    const allX = series.flatMap((s) => s.peaks.map((p) => p[0]));
    let xMin = allX.length ? Math.min(...allX) : 0;
    let xMax = allX.length ? Math.max(...allX) : 1;
    if (xMin === xMax) {
      xMin -= 1;
      xMax += 1;
    }

    const isFtir = series.length > 0 && series.every((s) => s.technique === 'FTIR');
    const xScale = (x: number) => {
      const t = (x - xMin) / (xMax - xMin);
      const tt = isFtir ? 1 - t : t; // FTIR convention: wavenumber decreases left-to-right
      return MARGIN.left + tt * innerW;
    };

    const mirror = mode === 'mirror' && series.length >= 2;

    const paths: Array<{ id: string; d: string; color: string }> = [];
    const sticks: Array<{ id: string; color: string; lines: Array<[number, number, number, number]> }> = [];
    const baselineYs: number[] = [];

    series.forEach((s, i) => {
      const maxY = s.peaks.reduce((m, p) => Math.max(m, p[1]), 0) || 1;
      let baseline: number;
      let direction: 1 | -1;
      let availH: number;
      if (mirror) {
        baseline = MARGIN.top + innerH / 2;
        direction = i === 0 ? -1 : 1;
        availH = innerH / 2;
      } else {
        baseline = MARGIN.top + innerH;
        direction = -1;
        availH = innerH;
      }
      baselineYs.push(baseline);

      const yScale = (y: number) => baseline + direction * (y / maxY) * availH * 0.92;

      const sorted = [...s.peaks].sort((a, b) => a[0] - b[0]);
      if (s.technique === 'MS') {
        sticks.push({
          id: s.id,
          color: s.color,
          lines: sorted.map(([x, y]) => [xScale(x), baseline, xScale(x), yScale(y)] as [number, number, number, number]),
        });
      } else {
        const d = sorted.map(([x, y], idx) => `${idx === 0 ? 'M' : 'L'}${xScale(x).toFixed(2)},${yScale(y).toFixed(2)}`).join(' ');
        paths.push({ id: s.id, d, color: s.color });
      }
    });

    const xTicks = [xMin, (xMin + xMax) / 2, xMax].map((v) => ({ x: xScale(v), label: v.toFixed(v < 10 ? 2 : 0) }));

    const axisLabel = series[0] ? axisLabelFor(series[0].technique) : '';

    return { paths, sticks, xTicks, axisLabel, baselineYs };
  }, [series, mode, width, height]);

  if (!hasData) {
    return <div className="spectrum-empty">No spectral peak data available for this selection.</div>;
  }

  return (
    <div>
      <svg
        className="spectrum-chart"
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        role="img"
        aria-label={`${series.map((s) => s.label).join(' vs ')} spectrum plot`}
      >
        {[...new Set(baselineYs)].map((by, i) => (
          <line key={i} className="axis-line" x1={MARGIN.left} x2={width - MARGIN.right} y1={by} y2={by} />
        ))}
        {paths.map((p) => (
          <path key={p.id} d={p.d} fill="none" stroke={p.color} strokeWidth={1.5} />
        ))}
        {sticks.map((s) => (
          <g key={s.id} stroke={s.color} strokeWidth={1.25}>
            {s.lines.map((l, idx) => (
              <line key={idx} x1={l[0]} y1={l[1]} x2={l[2]} y2={l[3]} />
            ))}
          </g>
        ))}
        {xTicks.map((t, i) => (
          <text key={i} className="axis-label" x={t.x} y={height - 6} textAnchor="middle">
            {t.label}
          </text>
        ))}
        <text className="axis-label" x={width / 2} y={height - MARGIN.bottom + 20} textAnchor="middle">
          {axisLabel}
        </text>
      </svg>
      <div className="spectrum-legend">
        {series.map((s) => (
          <span key={s.id}>
            <span className="swatch" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

const PALETTE = ['#7aa2ff', '#ff5c7a', '#6ee7a8', '#ffd166', '#b388ff', '#4cc9f0'];

/** Deterministic color assignment by position, reused by CompareTray/Viewer. */
export function colorForIndex(i: number): string {
  return PALETTE[i % PALETTE.length]!;
}
