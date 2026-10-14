import { useEffect, useMemo, useRef } from 'react';
import * as d3 from 'd3';
import { VizLayout } from '../../components/VizLayout';
import { useData } from '../../context/DataContext';
import { V } from '../../lib/cssVars';
import { useSvgContainer } from '../../lib/hooks';
import { useTooltip } from '../../lib/useTooltip';
import {
  legendClasses,
  makeLinks,
  makeNodes,
  nodeTooltipHtml,
  type NetworkLink,
  type NetworkNode,
} from '../../lib/networkShared';
import { getVizEntry } from '../../registry';

const entry = getVizEntry('17-adulterant-network')!;

interface SimNode extends NetworkNode, d3.SimulationNodeDatum {}
interface SimLink extends Omit<NetworkLink, 'source' | 'target'> {
  source: SimNode | string;
  target: SimNode | string;
}

export default function NetworkPage() {
  const { aggregates } = useData();
  const tt = useTooltip();
  const simRef = useRef<d3.Simulation<SimNode, SimLink> | null>(null);

  const nodes = useMemo(() => (aggregates ? makeNodes(aggregates) : []), [aggregates]);
  const links = useMemo(
    () => (aggregates ? makeLinks(aggregates, nodes.map((n) => n.id)) : []),
    [aggregates, nodes],
  );
  const roles = (aggregates?.roles ?? {}) as Record<string, string>;
  const legend = useMemo(() => legendClasses(nodes), [nodes]);

  const svgRef = useSvgContainer<SVGSVGElement>(
    (svg, W) => {
      simRef.current?.stop();
      const sel = d3.select(svg);
      sel.selectAll('*').remove();
      const H = 600;
      const simNodes: SimNode[] = nodes.map((n) => ({ ...n }));
      const simLinks: SimLink[] = links.map((l) => ({ ...l }));
      const r = d3.scaleSqrt(d3.extent(simNodes, (d) => d.v) as [number, number], [5, 30]);
      const lw = d3.scaleLinear(d3.extent(simLinks, (d) => d.v) as [number, number], [0.5, 7]);

      const sim = d3
        .forceSimulation(simNodes)
        .force(
          'link',
          d3
            .forceLink<SimNode, SimLink>(simLinks)
            .id((d) => d.id)
            .distance((d) => 120 - lw(d.v) * 8)
            .strength((d) => Math.min(1, d.v / 800)),
        )
        .force('charge', d3.forceManyBody().strength(-220))
        .force('center', d3.forceCenter(W / 2, H / 2))
        .force('collide', d3.forceCollide<SimNode>((d) => r(d.v) + 3));
      simRef.current = sim;

      const link = sel
        .append('g')
        .selectAll('line')
        .data(simLinks)
        .join('line')
        .attr('stroke', V.line)
        .attr('stroke-width', (d) => lw(d.v))
        .attr('opacity', 0.4);

      const node = sel
        .append('g')
        .selectAll<SVGGElement, SimNode>('g')
        .data(simNodes)
        .join('g')
        .style('cursor', 'grab');

      const drag = d3
        .drag<SVGGElement, SimNode>()
        .on('start', (event, d) => {
          if (!event.active) sim.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) sim.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        });
      node.call(drag);

      node
        .append('circle')
        .attr('r', (d) => r(d.v))
        .attr('fill', (d) => d.color)
        .attr('opacity', 0.88)
        .attr('stroke', V.bg)
        .attr('stroke-width', 1.5)
        .on('mouseover', (event, d) => {
          link.attr('opacity', (l) => {
            const s = typeof l.source === 'object' ? l.source : null;
            const t = typeof l.target === 'object' ? l.target : null;
            return s === d || t === d ? 0.8 : 0.06;
          });
        })
        .on('mousemove', (event, d) => {
          tt.current?.show(nodeTooltipHtml(d, roles), event.clientX, event.clientY);
        })
        .on('mouseleave', () => {
          link.attr('opacity', 0.4);
          tt.current?.hide();
        });

      node
        .append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', (d) => r(d.v) + 11)
        .attr('fill', V.muted)
        .attr('font-size', 9.5)
        .text((d) => (d.id.length > 14 ? `${d.id.slice(0, 13)}…` : d.id));

      sim.on('tick', () => {
        link
          .attr('x1', (d) => (d.source as SimNode).x ?? 0)
          .attr('y1', (d) => (d.source as SimNode).y ?? 0)
          .attr('x2', (d) => (d.target as SimNode).x ?? 0)
          .attr('y2', (d) => (d.target as SimNode).y ?? 0);
        node.attr('transform', (d) => {
          d.x = Math.max(r(d.v), Math.min(W - r(d.v), d.x ?? 0));
          d.y = Math.max(r(d.v), Math.min(H - r(d.v), d.y ?? 0));
          return `translate(${d.x},${d.y})`;
        });
      });
    },
    [nodes, links, roles, tt],
  );

  useEffect(
    () => () => {
      simRef.current?.stop();
    },
    [],
  );

  return (
    <VizLayout
      vizId="17-adulterant-network"
      title={entry.title}
      dek={entry.dek}
      how={
        <>
          Each <b>node</b> is a substance (size = how common, color = class). Each <b>link</b> is co-occurrence;
          stronger links act like tighter springs, so a physics simulation pulls frequently-combined substances close. The
          result is <b>community detection by eye</b>: the dense fentanyl/4-ANPP knot (co-manufacture), the
          methamphetamine neighborhood, the inert-cuts periphery. <b>Drag</b> a node to probe the structure; hover to see
          its role. <b>Reading tip:</b> proximity = &quot;found together,&quot; which encodes the supply&apos;s actual
          recipes.
        </>
      }
      provenance="Real co-occurrence among the 25 most common substances, 6,580-sample dataset."
      harm="Substances cluster because they are combined. If one member of a cluster is in your sample, its neighbors may be too."
    >
      <div className="viz-panel">
        <svg ref={svgRef} width="100%" height={600} role="img" aria-label="Force-directed substance network" />
      </div>
      <div className="viz-legend">
        {legend.map((l) => (
          <span key={l.cls}>
            <i style={{ background: l.color }} />
            {l.label}
          </span>
        ))}
      </div>
    </VizLayout>
  );
}
