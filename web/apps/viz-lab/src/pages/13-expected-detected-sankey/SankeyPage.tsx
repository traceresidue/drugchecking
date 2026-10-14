import { useMemo } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';
import { fmt } from '@dcf/core';
import { VizLayout } from '../../components/VizLayout';
import { useData } from '../../context/DataContext';
import { substanceColor } from '../../lib/colors';
import { V } from '../../lib/cssVars';
import { useSvgContainer } from '../../lib/hooks';
import { useTooltip } from '../../lib/useTooltip';
import { getVizEntry } from '../../registry';

const entry = getVizEntry('13-expected-detected-sankey')!;

interface SankeyNodeExtra {
  name: string;
  side: 'L' | 'R';
  x0?: number;
  x1?: number;
  y0?: number;
  y1?: number;
}

interface SankeyLinkExtra {
  source: SankeyNodeExtra | number;
  target: SankeyNodeExtra | number;
  value: number;
  width?: number;
  y0?: number;
  y1?: number;
}

export default function SankeyPage() {
  const { aggregates } = useData();
  const tt = useTooltip();
  const ed = aggregates?.expected_detected ?? [];

  const graphData = useMemo(() => {
    const expNames = [...new Set(ed.map((d) => d.expected))];
    const detNames = [...new Set(ed.map((d) => d.detected))];
    const nodes: SankeyNodeExtra[] = [
      ...expNames.map((n) => ({ name: n, side: 'L' as const })),
      ...detNames.map((n) => ({ name: n, side: 'R' as const })),
    ];
    const nidx = new Map<string, number>();
    nodes.forEach((n, i) => nidx.set(`${n.side}:${n.name}`, i));
    const links = ed.map((d) => ({
      source: nidx.get(`L:${d.expected}`)!,
      target: nidx.get(`R:${d.detected}`)!,
      value: d.n,
    }));
    return { nodes, links };
  }, [ed]);

  const svgRef = useSvgContainer<SVGSVGElement>(
    (svg, W) => {
      const sel = d3.select(svg);
      sel.selectAll('*').remove();
      const H = 540;
      const sk = sankey<SankeyNodeExtra, SankeyLinkExtra>()
        .nodeWidth(16)
        .nodePadding(14)
        .extent([
          [8, 12],
          [W - 8, H - 12],
        ])
        .nodeSort(null);
      const graph = sk({
        nodes: graphData.nodes.map((d) => ({ ...d })),
        links: graphData.links.map((d) => ({ ...d })),
      });

      sel
        .append('g')
        .attr('fill', 'none')
        .selectAll<SVGPathElement, SankeyLinkExtra>('path')
        .data(graph.links)
        .join('path')
        .attr('d', (d) => sankeyLinkHorizontal()(d))
        .attr('stroke', (d) => substanceColor((d.target as SankeyNodeExtra).name ?? ''))
        .attr('stroke-width', (d) => Math.max(1, d.width ?? 1))
        .attr('opacity', 0.4)
        .on('mouseover', function () {
          d3.select(this).attr('opacity', 0.75);
        })
        .on('mousemove', (event, d) => {
          const src = d.source as SankeyNodeExtra;
          const tgt = d.target as SankeyNodeExtra;
          tt.current?.show(
            `expected <b>${src.name}</b><br>→ detected <b style="color:${substanceColor(tgt.name)}">${tgt.name}</b><br><span class="muted">${fmt.int(d.value)} samples</span>`,
            event.clientX,
            event.clientY,
          );
        })
        .on('mouseleave', function () {
          d3.select(this).attr('opacity', 0.4);
          tt.current?.hide();
        });

      const gn = sel.append('g').selectAll('g').data(graph.nodes).join('g');
      gn.append('rect')
        .attr('x', (d) => d.x0 ?? 0)
        .attr('y', (d) => d.y0 ?? 0)
        .attr('width', (d) => (d.x1 ?? 0) - (d.x0 ?? 0))
        .attr('height', (d) => Math.max(1, (d.y1 ?? 0) - (d.y0 ?? 0)))
        .attr('fill', (d) => substanceColor(d.name))
        .attr('opacity', 0.92);
      gn.append('text')
        .attr('x', (d) => (d.side === 'L' ? (d.x0 ?? 0) - 6 : (d.x1 ?? 0) + 6))
        .attr('y', (d) => ((d.y0 ?? 0) + (d.y1 ?? 0)) / 2)
        .attr('dy', '.35em')
        .attr('text-anchor', (d) => (d.side === 'L' ? 'end' : 'start'))
        .attr('fill', V.ink)
        .attr('font-size', 12)
        .text((d) => d.name)
        .clone(true)
        .lower()
        .attr('stroke', V.bg)
        .attr('stroke-width', 3)
        .attr('fill', 'none');

      sel.append('text').attr('x', 8).attr('y', 8).attr('fill', V.muted).attr('font-size', 11).attr('font-weight', 600).text('EXPECTED');
      sel
        .append('text')
        .attr('x', W - 8)
        .attr('y', 8)
        .attr('text-anchor', 'end')
        .attr('fill', V.muted)
        .attr('font-size', 11)
        .attr('font-weight', 600)
        .text('DETECTED');
    },
    [graphData, tt],
  );

  return (
    <VizLayout
      vizId="13-expected-detected-sankey"
      title="Expected vs. Detected"
      dek={entry.dek}
      how={
        <>
          A <b>Sankey diagram</b> shows flows. Left nodes are the <b>expected substance</b> (what the sample was sold
          or believed to be); right nodes are <b>what was detected</b>. Stream width = number of samples. Trace a stream
          from &quot;fentanyl/heroin&quot; and watch how much of it also lands on <b>xylazine</b> or{' '}
          <b>methamphetamine</b> — adulterants the buyer didn&apos;t ask for. This is the single most decision-relevant
          frame in drug checking, and the shape no static table can convey. <b>Note:</b> one sample can flow to several
          detected substances (mixtures), so right-side totals exceed left-side counts.
        </>
      }
      provenance="Real flows from samples with a stated expected substance and confirmed lab detections (6,580-sample dataset)."
      harm="If you expect an opioid, assume xylazine and a benzo could be present too. If you expect a stimulant, assume possible fentanyl contamination — test it."
    >
      <div className="viz-panel">
        <svg ref={svgRef} width="100%" height={540} role="img" aria-label="Sankey of expected versus detected substances" />
      </div>
    </VizLayout>
  );
}
