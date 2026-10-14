import { useMemo, useState } from 'react';
import * as d3 from 'd3';
import { classify, fmt, type SubstanceClass } from '@dcf/core';
import { VizLayout } from '../../components/VizLayout';
import { useData } from '../../context/DataContext';
import { classColor } from '../../lib/colors';
import { V } from '../../lib/cssVars';
import { useSvgContainer } from '../../lib/hooks';
import { useTooltip } from '../../lib/useTooltip';
import { getVizEntry } from '../../registry';

type FilterCls = SubstanceClass | 'all';

interface EmergenceDot extends d3.SimulationNodeDatum {
  substance: string;
  first: string;
  total: number;
  date: Date;
  cls: SubstanceClass;
  color: string;
  label: string;
}

const entry = getVizEntry('15-emergence-beeswarm')!;

const FILTERS: Array<[FilterCls, string]> = [
  ['all', 'all'],
  ['fent', 'fentanyl'],
  ['benzo', 'benzo'],
  ['xyl', 'sedative'],
  ['opioid', 'opioid'],
];

export default function BeeswarmPage() {
  const { aggregates } = useData();
  const [filt, setFilt] = useState<FilterCls>('all');
  const tt = useTooltip();

  const data = useMemo(() => {
    const em = aggregates?.emergence ?? [];
    return em.map((d) => {
      const first = (d as { first?: string; first_month?: string }).first ?? d.first_month ?? '';
      const total = (d as { total?: number; samples?: number }).total ?? d.samples ?? 0;
      const c = classify(d.substance);
      return {
        substance: d.substance,
        first,
        total,
        date: new Date(first),
        cls: c.cls,
        color: classColor(c.cls),
        label: c.label,
      } as EmergenceDot;
    });
  }, [aggregates]);

  const svgRef = useSvgContainer<SVGSVGElement>(
    (svg, W) => {
      const sel = d3.select(svg);
      sel.selectAll('*').remove();
      const H = 520;
      const m = { t: 24, r: 20, b: 40, l: 20 };
      let filtered = data;
      if (filt !== 'all') filtered = data.filter((d) => d.cls === filt);
      if (!filtered.length) return;

      const x = d3
        .scaleTime()
        .domain(d3.extent(filtered, (d) => d.date) as [Date, Date])
        .range([m.l + 10, W - m.r]);
      const r = d3
        .scaleSqrt()
        .domain(d3.extent(filtered, (d) => d.total) as [number, number])
        .range([2.5, 30]);

      const quarter = d3.timeMonth.every(3);
      (quarter ? x.ticks(quarter) : x.ticks(6)).forEach((t) => {
        sel
          .append('line')
          .attr('x1', x(t))
          .attr('x2', x(t))
          .attr('y1', m.t)
          .attr('y2', H - m.b)
          .attr('stroke', V.line)
          .attr('opacity', 0.3);
        sel
          .append('text')
          .attr('x', x(t))
          .attr('y', H - 16)
          .attr('text-anchor', 'middle')
          .attr('fill', V.faint)
          .attr('font-size', 10)
          .text(d3.timeFormat("%b '%y")(t));
      });

      const simData = filtered.map((d) => ({ ...d }));
      const sim = d3
        .forceSimulation(simData)
        .force(
          'x',
          d3.forceX<EmergenceDot>((d) => x(d.date)).strength(1),
        )
        .force('y', d3.forceY(H / 2).strength(0.05))
        .force('collide', d3.forceCollide<EmergenceDot>((d) => r(d.total) + 1.2))
        .stop();
      for (let i = 0; i < 160; i++) sim.tick();
      simData.forEach((d) => {
        d.y = Math.max(m.t + r(d.total), Math.min(H - m.b - r(d.total), d.y ?? H / 2));
      });

      sel
        .selectAll('circle')
        .data(simData)
        .join('circle')
        .attr('cx', (d) => d.x ?? 0)
        .attr('cy', (d) => d.y ?? 0)
        .attr('r', (d) => r(d.total))
        .attr('fill', (d) => d.color)
        .attr('opacity', 0.8)
        .attr('stroke', V.bg)
        .attr('stroke-width', 0.8)
        .style('cursor', 'pointer')
        .on('mousemove', (event, d) => {
          tt.current?.show(
            `<b style="text-transform:capitalize">${d.substance}</b><br><span class="muted">${d.label}</span><br><span class="mono muted">first seen ${d.first} · ${fmt.int(d.total)} samples total</span>`,
            event.clientX,
            event.clientY,
          );
        })
        .on('mouseleave', () => tt.current?.hide());

      simData
        .filter((d) => d.total > 250)
        .forEach((d) => {
          sel
            .append('text')
            .attr('x', d.x ?? 0)
            .attr('y', (d.y ?? 0) + 3)
            .attr('text-anchor', 'middle')
            .attr('font-size', 9)
            .attr('fill', V.bg)
            .attr('font-weight', 700)
            .text(d.substance.length > 9 ? d.substance.slice(0, 8) : d.substance);
        });
    },
    [data, filt, tt],
  );

  return (
    <VizLayout
      vizId="15-emergence-beeswarm"
      title={entry.title}
      dek={entry.dek}
      how={
        <>
          Each dot is one substance positioned at its <b>first detection date</b> (a beeswarm nudges overlapping dots
          apart so none hide). <b>Size</b> = how many samples eventually contained it; <b>color</b> = drug class. A few
          debuts balloon into market staples (the big fentanyl-family dots); most stay rare. The clusters reveal the
          early-warning reality: the supply is a <b>constant stream of novel substances</b>, only some of which matter.
          Hover for the debut date. <b>Limits:</b> &quot;first detected here&quot; reflects when a program looked, not a
          substance&apos;s true first appearance anywhere.
        </>
      }
      provenance="Real first-detection dates and cumulative counts, 6,580-sample dataset (2022 onward)."
      harm="Novel arrivals are the least understood and often the most potent. A new name beside fentanyl deserves the most caution, not the least."
    >
      <div className="viz-controls">
        <span className="muted" style={{ fontSize: 13 }}>
          filter class:
        </span>
        {FILTERS.map(([c, label]) => (
          <button
            key={c}
            type="button"
            className="viz-btn"
            aria-pressed={filt === c}
            onClick={() => setFilt(c)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="viz-panel">
        <svg ref={svgRef} width="100%" height={520} role="img" aria-label="Beeswarm of substance first-detection dates" />
      </div>
    </VizLayout>
  );
}
