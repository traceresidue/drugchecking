import { useMemo, useState } from 'react';
import * as d3 from 'd3';
import { fmt } from '@dcf/core';
import { VizLayout } from '../../components/VizLayout';
import { useData } from '../../context/DataContext';
import { CLASS_COLORS, CLASS_LABELS } from '../../lib/colors';
import { V } from '../../lib/cssVars';
import type { SubstanceClass } from '@dcf/core';
import { useSvgContainer } from '../../lib/hooks';
import { useTooltip } from '../../lib/useTooltip';
import { getVizEntry } from '../../registry';

type OffsetMode = 'stream' | 'pct';

const entry = getVizEntry('11-supply-streamgraph')!;

export default function StreamgraphPage() {
  const { aggregates } = useData();
  const [offset, setOffset] = useState<OffsetMode>('stream');
  const tt = useTooltip();

  const { months, rows } = useMemo(() => {
    const mc = aggregates?.monthly_class ?? [];
    const keys = CLASS_LABELS.map(([k]) => k);
    const mos = [...new Set(mc.map((d) => d.month))].sort();
    const r = mos.map((m) => {
      const o: Record<string, string | number> = { month: m };
      keys.forEach((k) => {
        o[k] = 0;
      });
      mc.filter((d) => d.month === m).forEach((d) => {
        o[d.cls] = d.n;
      });
      return o;
    });
    return { months: mos, rows: r };
  }, [aggregates]);

  const svgRef = useSvgContainer<SVGSVGElement>(
    (svg, W) => {
      const sel = d3.select(svg);
      sel.selectAll('*').remove();
      const H = 480;
      const m = { t: 18, r: 16, b: 34, l: 40 };
      const keys = CLASS_LABELS.map(([k]) => k);
      const stack = d3
        .stack<Record<string, string | number>>()
        .keys(keys)
        .offset(offset === 'stream' ? d3.stackOffsetWiggle : d3.stackOffsetExpand)
        .order(d3.stackOrderInsideOut);
      const series = stack(rows);
      const x = d3.scalePoint(months, [m.l, W - m.r]);
      const y = d3.scaleLinear(
        [d3.min(series, (s) => d3.min(s, (d) => d[0])) ?? 0, d3.max(series, (s) => d3.max(s, (d) => d[1])) ?? 1],
        [H - m.b, m.t],
      );
      const area = d3
        .area<d3.SeriesPoint<Record<string, string | number>>>()
        .x((_, i) => x(months[i]!)!)
        .y0((d) => y(d[0]))
        .y1((d) => y(d[1]))
        .curve(d3.curveBasis);

      sel
        .selectAll('path')
        .data(series)
        .join('path')
        .attr('d', area)
        .attr('fill', (s) => CLASS_COLORS[s.key as SubstanceClass] ?? V.muted)
        .attr('opacity', 0.85)
        .attr('stroke', V.bg)
        .attr('stroke-width', 0.4)
        .on('mousemove', (event, s) => {
          const lbl = CLASS_LABELS.find(([k]) => k === s.key)?.[1] ?? s.key;
          tt.current?.show(
            `<b style="color:${CLASS_COLORS[s.key as keyof typeof CLASS_COLORS]}">${lbl}</b>`,
            event.clientX,
            event.clientY,
          );
        })
        .on('mouseleave', () => tt.current?.hide());

      months.forEach((mo, i) => {
        if (i % 3 === 0) {
          sel
            .append('text')
            .attr('x', x(mo)!)
            .attr('y', H - 14)
            .attr('text-anchor', 'middle')
            .attr('fill', V.faint)
            .attr('font-size', 10)
            .text(fmt.month(mo));
        }
      });
    },
    [months, rows, offset, tt],
  );

  return (
    <VizLayout
      vizId="11-supply-streamgraph"
      title={entry.title}
      dek={entry.dek}
      how={
        <>
          A <b>streamgraph</b> stacks each month&apos;s composition around a flowing center line, so you read{' '}
          <b>change of shape</b> rather than exact values. Band thickness = how many tested samples contained that
          class that month. The story to look for: the <b>sedative band</b> (xylazine) swelling inside the opioid
          supply, and stimulants holding their own channel. <b>Toggle to &quot;stacked %&quot;</b> for honest
          proportions. <b>Denominator note:</b> these are counts among <i>tested</i> samples, which over-represent
          what programs were watching — not a census of all drugs used.
        </>
      }
      provenance="Real monthly class counts from 6,580 tested samples (2022–2024) across 11 US states."
      harm="When the sedative band grows, expect deeper, longer overdoses that naloxone only partly reverses. Never use alone."
    >
      <div className="viz-controls">
        <button
          type="button"
          className="viz-btn"
          aria-pressed={offset === 'stream'}
          onClick={() => setOffset('stream')}
        >
          streamgraph
        </button>
        <button
          type="button"
          className="viz-btn"
          aria-pressed={offset === 'pct'}
          onClick={() => setOffset('pct')}
        >
          stacked %
        </button>
      </div>
      <div className="viz-panel">
        <svg ref={svgRef} width="100%" height={480} role="img" aria-label="Streamgraph of supply composition" />
      </div>
      <details style={{ marginTop: 'var(--space-2)' }}>
        <summary className="muted" style={{ fontSize: 12, cursor: 'pointer' }}>
          Class legend
        </summary>
        <div className="viz-legend">
          {CLASS_LABELS.map(([k, l]) => (
            <span key={k}>
              <i style={{ background: CLASS_COLORS[k] }} />
              {l}
            </span>
          ))}
        </div>
      </details>
    </VizLayout>
  );
}
