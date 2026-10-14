import { useMemo } from 'react';
import * as d3 from 'd3';
import { classify, fmt } from '@dcf/core';
import { VizLayout } from '../../components/VizLayout';
import { useData } from '../../context/DataContext';
import { classColor } from '../../lib/colors';
import { V } from '../../lib/cssVars';
import { useSvgContainer } from '../../lib/hooks';
import { useTooltip } from '../../lib/useTooltip';
import { getVizEntry } from '../../registry';

const entry = getVizEntry('14-horizon-wall')!;

interface SeriesRow {
  s: string;
  vals: number[];
  max: number;
  momentum: number;
}

export default function HorizonWallPage() {
  const { aggregates } = useData();
  const tt = useTooltip();

  const { months, series } = useMemo(() => {
    const monthly = aggregates?.monthly ?? [];
    const mos = [...new Set(monthly.map((d) => d.month))].sort();
    const subs = [...new Set(monthly.map((d) => d.substance))];
    const ser: SeriesRow[] = subs
      .map((s) => {
        const m = Object.fromEntries(monthly.filter((d) => d.substance === s).map((d) => [d.month, d.n]));
        const vals = mos.map((mo) => m[mo] ?? 0);
        const recent = vals.slice(-4).reduce((a, b) => a + b, 0);
        const early = vals.slice(0, 4).reduce((a, b) => a + b, 0) + 1;
        return {
          s,
          vals,
          max: Math.max(...vals, 1),
          momentum: (recent / early) * Math.max(...vals.slice(-6), 0),
        };
      })
      .filter((d) => d.max >= 8)
      .sort((a, b) => b.momentum - a.momentum)
      .slice(0, 22);
    return { months: mos, series: ser };
  }, [aggregates]);

  const svgRef = useSvgContainer<SVGSVGElement>(
    (svg, W) => {
      const sel = d3.select(svg);
      sel.selectAll('*').remove();
      const rowH = 26;
      const gap = 3;
      const labelW = 150;
      const top = 8;
      const H = top + series.length * (rowH + gap) + 24;
      sel.attr('height', H);
      const x = d3.scaleLinear([0, months.length - 1], [labelW, W - 12]);
      const bands = 3;

      series.forEach((row, ri) => {
        const yTop = top + ri * (rowH + gap);
        const base = classify(row.s);
        const y = d3.scaleLinear([0, row.max / bands], [yTop + rowH, yTop]);
        sel
          .append('rect')
          .attr('x', labelW)
          .attr('y', yTop)
          .attr('width', W - 12 - labelW)
          .attr('height', rowH)
          .attr('fill', V.panel2)
          .attr('opacity', 0.4)
          .attr('rx', 3);
        for (let b = 0; b < bands; b++) {
          const area = d3
            .area<number>()
            .x((_, i) => x(i))
            .y0(yTop + rowH)
            .y1((_, i) => {
              const v = Math.max(0, Math.min(row.max / bands, row.vals[i]! - b * (row.max / bands)));
              return y(v);
            })
            .curve(d3.curveBasis);
          sel
            .append('path')
            .datum(row.vals)
            .attr('d', area)
            .attr('fill', classColor(base.cls))
            .attr('opacity', 0.25 + b * 0.3);
        }
        sel
          .append('rect')
          .attr('x', labelW)
          .attr('y', yTop)
          .attr('width', W - 12 - labelW)
          .attr('height', rowH)
          .attr('fill', 'transparent')
          .on('mousemove', (event) => {
            const i = Math.round(x.invert(event.offsetX));
            const mo = months[i];
            if (mo) {
              tt.current?.show(
                `<b style="text-transform:capitalize">${row.s}</b><br><span class="muted">${fmt.month(mo)} · ${row.vals[i] ?? 0} samples</span>`,
                event.clientX,
                event.clientY,
              );
            }
          })
          .on('mouseleave', () => tt.current?.hide());
        sel
          .append('text')
          .attr('x', labelW - 8)
          .attr('y', yTop + rowH / 2 + 4)
          .attr('text-anchor', 'end')
          .attr('fill', V.ink)
          .attr('font-size', 11)
          .text(row.s.length > 20 ? `${row.s.slice(0, 19)}…` : row.s);
        if (ri === series.length - 1) {
          months.forEach((mo, i) => {
            if (i % 4 === 0) {
              sel
                .append('text')
                .attr('x', x(i))
                .attr('y', H - 8)
                .attr('text-anchor', 'middle')
                .attr('fill', V.faint)
                .attr('font-size', 10)
                .text(fmt.month(mo));
            }
          });
        }
      });
    },
    [months, series, tt],
  );

  return (
    <VizLayout
      vizId="14-horizon-wall"
      title={entry.title}
      dek={entry.dek}
      how={
        <>
          A <b>horizon chart</b> compresses a time series: the line is sliced into height bands and the upper bands are
          folded down and <b>layered by color intensity</b>, so a tall peak reads as a <i>darker</i> stripe in the same
          thin row. This lets dozens of substances share one screen. Read it like a heat-strip: <b>each row is one
          substance over time</b>; a row that suddenly darkens on the right is a substance <b>surging now</b>. Rows are
          sorted by recent momentum, so emerging adulterants rise to the top. <b>Limits:</b> counts among tested samples,
          not population prevalence.
        </>
      }
      provenance="Real monthly detection counts per substance, 2022–2024, 6,580-sample dataset."
      harm="A newly darkening row is an early warning. If it is a sedative or novel opioid, expect the overdose response to be harder."
    >
      <div className="viz-controls">
        <span className="muted" style={{ fontSize: 13 }}>
          bands sorted by recent momentum →
        </span>
      </div>
      <div className="viz-panel">
        <svg ref={svgRef} width="100%" role="img" aria-label="Wall of horizon charts" />
      </div>
    </VizLayout>
  );
}
